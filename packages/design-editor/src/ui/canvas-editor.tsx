import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import type { design } from "@rsvp/celebration-theme";
import { createDesktopCanvas, GRID, makeFree, placeElement, reorderLayer, rotateElement, STAGE_WIDTH } from "../model/canvas.js";
import { isGiftsElement } from "../model/guards.js";
import { blockName, elementOf, useCommands } from "./commands.js";
import { useEditor } from "./editor-context.js";
import { EyeOffIcon } from "./icons.js";

const key = (name: string): string => `designEditor.canvasEditor.${name}`;
type Element = design.DesignElement;
type Gesture = { readonly kind: "move" | "resize" | "rotate"; readonly id: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly startX: number; readonly startY: number; readonly centreX: number; readonly centreY: number; changed: boolean; refused: boolean; readonly wasSelected: boolean };

export const blockLabel = (document: design.DesignDocumentV2, element: Element, t: (key: string) => string): string => blockName(document, element, t);

const ARROWS: Readonly<Record<string, readonly [number, number]>> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
/** A big step: a quarter of the columns across and five rows down. */
const bigStep = (columns: number): readonly [number, number] => [Math.max(1, Math.floor(columns / 4)), 5];

/**
 * The free canvas of one page. Pointer: drag, resize and rotate. Keyboard (the element focused): Enter/Space select, arrows move (Shift: big step),
 * Alt+arrows resize, R rotates (Shift+R the other way), PageUp/PageDown change the layer, Delete removes. Everything snaps to the grid, is clamped,
 * and is said aloud: each gesture and each refusal goes to the live region.
 */
export function CanvasEditor() {
  const { document, state, dispatch, t, now, announce } = useEditor();
  const { apply, remove } = useCommands();
  const canvas = state.canvas;
  const gesture = useRef<Gesture | null>(null);
  const stageWidth = STAGE_WIDTH[canvas];

  const stageUnits = (target: HTMLElement | null, columns: number, rowHeight: number): { col: number; row: number } => {
    const width = target?.closest<HTMLElement>("[data-stage]")?.getBoundingClientRect().width || stageWidth;
    return { col: width / columns, row: rowHeight };
  };

  const select = (element: Element, say: boolean): void => {
    if (state.selection !== element.id) {
      dispatch({ type: "select", id: element.id });
      if (say) announce(t(key("announce.selected"), { block: blockName(document, element, t) }));
    }
  };

  const start = (event: PointerEvent<HTMLElement>, element: Element, kind: Gesture["kind"]): void => {
    event.stopPropagation();
    // A finger on an element that is not selected yet scrolls the page (it has no `touch-action: none` until it is selected): the tap selects it.
    if (event.pointerType === "touch" && state.selection !== element.id) return;
    dispatch({ type: "select", id: element.id });
    const box = event.currentTarget.closest<HTMLElement>("[data-element]")?.getBoundingClientRect();
    gesture.current = { kind, id: element.id, x: element.x, y: element.y, w: element.w, h: element.h, startX: event.clientX, startY: event.clientY, centreX: box ? box.left + box.width / 2 : event.clientX, centreY: box ? box.top + box.height / 2 : event.clientY, changed: false, refused: false, wasSelected: state.selection === element.id };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const track = (event: PointerEvent<HTMLElement>, columns: number, rowHeight: number): void => {
    const current = gesture.current;
    if (!current) return;
    const unit = stageUnits(event.currentTarget, columns, rowHeight);
    const dx = Math.round((event.clientX - current.startX) / unit.col);
    const dy = Math.round((event.clientY - current.startY) / unit.row);
    const op = current.kind === "move" ? placeElement(canvas, current.id, { x: current.x + dx, y: current.y + dy })
      : current.kind === "resize" ? placeElement(canvas, current.id, { w: current.w + dx, h: current.h + dy })
      : rotateElement(canvas, current.id, (Math.atan2(event.clientY - current.centreY, event.clientX - current.centreX) * 180) / Math.PI + 90);
    const outcome = apply(op, { key: `${current.kind}:${current.id}`, ok: null, silentRefusal: current.refused });
    if (outcome === "applied") current.changed = true;
    if (outcome === "refused") current.refused = true;
  };

  /** The pointer is up: one announcement for the whole gesture, with where the element ended. */
  const finish = (): void => {
    const current = gesture.current;
    gesture.current = null;
    if (!current) return;
    const element = elementOf(document, canvas, current.id);
    if (!element) return;
    const block = blockName(document, element, t);
    if (!current.changed) {
      if (!current.wasSelected) announce(t(key("announce.selected"), { block }));
      return;
    }
    announce(current.kind === "move" ? t(key("announce.moved"), { block, x: element.x + 1, y: element.y + 1 })
      : current.kind === "resize" ? t(key("announce.resized"), { block, w: element.w, h: element.h })
      : t(key("announce.rotated"), { block, degrees: element.rotation ?? 0 }));
  };
  const cancel = (): void => { gesture.current = null; };

  const keys = (event: KeyboardEvent<HTMLElement>, element: Element, columns: number): void => {
    if (event.target !== event.currentTarget || event.ctrlKey || event.metaKey) return;
    const block = blockName(document, element, t);
    const id = element.id;
    const handled = (): void => { event.preventDefault(); select(element, false); };
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      dispatch({ type: "select", id });
      announce(t(key("announce.selected"), { block }));
      return;
    }
    const arrow = ARROWS[event.key];
    if (arrow) {
      handled();
      const [bx, by] = event.shiftKey ? bigStep(columns) : [1, 1];
      const dx = arrow[0] * bx;
      const dy = arrow[1] * by;
      if (event.altKey) {
        apply(placeElement(canvas, id, { w: element.w + dx, h: element.h + dy }), { key: `resize:${id}`, limit: t(key("announce.limit"), { block }), ok: (after) => { const next = elementOf(after, canvas, id); return t(key("announce.resized"), { block, w: next?.w ?? element.w, h: next?.h ?? element.h }); } });
      } else {
        apply(placeElement(canvas, id, { x: element.x + dx, y: element.y + dy }), { key: `move:${id}`, limit: t(key("announce.limit"), { block }), ok: (after) => { const next = elementOf(after, canvas, id); return t(key("announce.moved"), { block, x: (next?.x ?? element.x) + 1, y: (next?.y ?? element.y) + 1 }); } });
      }
    } else if (event.key.toLowerCase() === "r") {
      handled();
      apply(rotateElement(canvas, id, (element.rotation ?? 0) + (event.shiftKey ? -5 : 5)), { key: `rotate:${id}`, limit: t(key("announce.limit"), { block }), ok: (after) => t(key("announce.rotated"), { block, degrees: elementOf(after, canvas, id)?.rotation ?? 0 }) });
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      handled();
      const front = event.key === "PageUp";
      apply(reorderLayer(canvas, id, front ? "front" : "back"), { ok: () => t(key(front ? "announce.front" : "announce.back"), { block }), limit: t(key(front ? "announce.front" : "announce.back"), { block }) });
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      remove(element);
    }
  };

  const selected = elementOf(document, canvas, state.selection);
  const goInspector = (): void => {
    const root = window.document.getElementById("de-inspector");
    if (root instanceof HTMLDetailsElement) root.open = true;
    root?.querySelector<HTMLElement>("input, button")?.focus();
  };

  return (
    <div className="de-canvas-editor" data-canvas={canvas} data-testid="design-frame">
      <p className="de-hint">{t(key("pickPrompt"))}</p>
      <p className="de-hint" id="de-canvas-keys">{t(key("keys"))}</p>
      {selected ? <button type="button" className="de-btn de-skip" onClick={goInspector}>{t(key("skip"))}</button> : null}
      {document.pages.map((page) => {
        const grid = page.canvases[canvas];
        const label = page.kind === "cover" ? t("designEditor.outline.cover") : t(`celebration.sections.${page.section ?? ""}`);
        if (!grid) {
          return (
            <section key={page.id} className="de-page" aria-label={label}>
              <h2 className="de-page-heading">{label}</h2>
              <p className="de-hint">{t(key("desktopHint"))}</p>
              <button type="button" className="de-btn" onClick={() => dispatch({ type: "edit", op: createDesktopCanvas(page.id), at: now() })}>{t(key("desktopCreate"))}</button>
            </section>
          );
        }
        const height = Math.max(...grid.elements.map((element) => (element.y + element.h) * grid.rowHeight), grid.rowHeight);
        return (
          <section key={page.id} className="de-page" aria-label={label}>
            <h2 className="de-page-heading">{label}</h2>
            {grid.mode === "flow" ? (
              <>
                <p className="de-hint">{t(key("freeHint"))}</p>
                <button type="button" className="de-btn" onClick={() => dispatch({ type: "edit", op: makeFree(page.id, canvas), at: now() })}>{t(key("free"))}</button>
              </>
            ) : (
              <div className="de-free" data-stage data-stage-page={page.id} role="group" tabIndex={-1} aria-label={t(key("stageLabel"), { page: label })} style={{ height, maxWidth: stageWidth }} onClick={(event) => { if (event.target === event.currentTarget) dispatch({ type: "select", id: null }); }}>
                {[...grid.elements].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).map((element) => {
                  const name = blockName(document, element, t);
                  const isSelected = state.selection === element.id;
                  const required = isGiftsElement(document, element.id, canvas);
                  const hidden = !element.visible;
                  return (
                    <div key={element.id} data-element data-element-id={element.id} data-selected={isSelected} data-visible={element.visible} data-required={required} data-block={document.blocks.find((block) => block.id === element.block)?.type}
                      className="de-el" role="group" tabIndex={0} aria-current={isSelected} aria-label={hidden ? `${name}, ${t("designEditor.stage.hidden").toLowerCase()}` : name} aria-describedby="de-canvas-keys"
                      style={{ left: `${(element.x / grid.columns) * 100}%`, width: `${(element.w / grid.columns) * 100}%`, top: element.y * grid.rowHeight, height: element.h * grid.rowHeight, zIndex: element.z ?? 0, transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined }}
                      onPointerDown={(event) => start(event, element, "move")} onPointerMove={(event) => track(event, grid.columns, grid.rowHeight)} onPointerUp={finish} onPointerCancel={cancel}
                      onKeyDown={(event) => keys(event, element, grid.columns)} onClick={() => select(element, true)}>
                      <span className="de-el-name">{name}</span>
                      {hidden ? <span className="de-el-tag"><EyeOffIcon size={14} />{t(key("hiddenTag"))}</span> : null}
                      {isSelected ? (
                        <>
                          <span className="de-handle de-handle--resize" data-handle="resize" aria-hidden="true" onPointerDown={(event) => start(event, element, "resize")} onPointerMove={(event) => track(event, grid.columns, grid.rowHeight)} onPointerUp={finish} onPointerCancel={cancel} />
                          {!required ? <span className="de-handle de-handle--rotate" data-handle="rotate" aria-hidden="true" onPointerDown={(event) => start(event, element, "rotate")} onPointerMove={(event) => track(event, grid.columns, grid.rowHeight)} onPointerUp={finish} onPointerCancel={cancel} /> : null}
                        </>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export const gridOf = (canvas: "mobile" | "desktop") => GRID[canvas];
