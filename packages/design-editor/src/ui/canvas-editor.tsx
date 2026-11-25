import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import type { design } from "@rsvp/celebration-theme";
import { canRemove, createDesktopCanvas, GRID, makeFree, placeElement, removeElement, rotateElement, STAGE_WIDTH } from "../model/canvas.js";
import { isGiftsElement } from "../model/guards.js";
import { useEditor } from "./editor-context.js";

const key = (name: string): string => `designEditor.canvasEditor.${name}`;
type Element = design.DesignElement;
type Gesture = { readonly kind: "move" | "resize" | "rotate"; readonly id: string; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly startX: number; readonly startY: number; readonly centreX: number; readonly centreY: number };

export const blockLabel = (document: design.DesignDocumentV2, element: Element, t: (key: string) => string): string => t(key(`block.${document.blocks.find((block) => block.id === element.block)?.type ?? "html"}`));

/** The free canvas of one page: drag, resize and rotate by pointer, arrows by keyboard, everything snapped to the grid and clamped. */
export function CanvasEditor() {
  const { document, state, dispatch, t, now } = useEditor();
  const canvas = state.canvas;
  const gesture = useRef<Gesture | null>(null);
  const stageWidth = STAGE_WIDTH[canvas];

  const stageUnits = (target: HTMLElement | null, columns: number, rowHeight: number): { col: number; row: number } => {
    const width = target?.closest<HTMLElement>("[data-stage]")?.getBoundingClientRect().width || stageWidth;
    return { col: width / columns, row: rowHeight };
  };

  const start = (event: PointerEvent<HTMLElement>, element: Element, kind: Gesture["kind"]): void => {
    event.stopPropagation();
    dispatch({ type: "select", id: element.id });
    const box = event.currentTarget.closest<HTMLElement>("[data-element]")?.getBoundingClientRect();
    gesture.current = { kind, id: element.id, x: element.x, y: element.y, w: element.w, h: element.h, startX: event.clientX, startY: event.clientY, centreX: box ? box.left + box.width / 2 : event.clientX, centreY: box ? box.top + box.height / 2 : event.clientY };
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
    dispatch({ type: "edit", op, key: `${current.kind}:${current.id}`, at: now() });
  };

  const keys = (event: KeyboardEvent<HTMLElement>, element: Element): void => {
    const step: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const delta = step[event.key];
    if (delta) {
      event.preventDefault();
      const op = event.shiftKey ? placeElement(canvas, element.id, { w: element.w + delta[0], h: element.h + delta[1] }) : placeElement(canvas, element.id, { x: element.x + delta[0], y: element.y + delta[1] });
      dispatch({ type: "edit", op, key: `${event.shiftKey ? "resize" : "move"}:${element.id}`, at: now() });
    } else if ((event.key === "Delete" || event.key === "Backspace") && canRemove(document, element.id)) {
      event.preventDefault();
      dispatch({ type: "edit", op: removeElement(element.id), at: now() });
      dispatch({ type: "select", id: null });
    }
  };

  return (
    <div className="de-canvas-editor" data-canvas={canvas} data-testid="design-frame">
      <p className="de-hint">{t(key("pickPrompt"))}</p>
      {document.pages.map((page) => {
        const grid = page.canvases[canvas];
        const label = page.kind === "cover" ? t("designEditor.outline.cover") : t(`celebration.sections.${page.section ?? ""}`);
        if (!grid) {
          return (
            <section key={page.id} className="de-page" aria-label={label}>
              <h3>{label}</h3>
              <p className="de-hint">{t(key("desktopHint"))}</p>
              <button type="button" className="de-btn" onClick={() => dispatch({ type: "edit", op: createDesktopCanvas(page.id), at: now() })}>{t(key("desktopCreate"))}</button>
            </section>
          );
        }
        const height = Math.max(...grid.elements.map((element) => (element.y + element.h) * grid.rowHeight), grid.rowHeight);
        return (
          <section key={page.id} className="de-page" aria-label={label}>
            <h3>{label}</h3>
            {grid.mode === "flow" ? (
              <>
                <p className="de-hint">{t(key("freeHint"))}</p>
                <button type="button" className="de-btn" onClick={() => dispatch({ type: "edit", op: makeFree(page.id, canvas), at: now() })}>{t(key("free"))}</button>
              </>
            ) : (
              <div className="de-free" data-stage style={{ height, maxWidth: stageWidth }} onPointerDown={() => dispatch({ type: "select", id: null })}>
                {[...grid.elements].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).map((element) => {
                  const name = blockLabel(document, element, t);
                  const selected = state.selection === element.id;
                  const required = isGiftsElement(document, element.id, canvas);
                  return (
                    <div key={element.id} data-element data-selected={selected} data-visible={element.visible} data-required={required} data-block={document.blocks.find((block) => block.id === element.block)?.type}
                      className="de-el" role="group" tabIndex={0} aria-current={selected} aria-label={name}
                      style={{ left: `${(element.x / grid.columns) * 100}%`, width: `${(element.w / grid.columns) * 100}%`, top: element.y * grid.rowHeight, height: element.h * grid.rowHeight, zIndex: element.z ?? 0, transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined }}
                      onPointerDown={(event) => start(event, element, "move")} onPointerMove={(event) => track(event, grid.columns, grid.rowHeight)} onPointerUp={() => { gesture.current = null; }}
                      onKeyDown={(event) => keys(event, element)} onClick={() => dispatch({ type: "select", id: element.id })}>
                      {name}
                      {selected ? (
                        <>
                          <span className="de-handle de-handle--resize" role="img" aria-label={t(key("resize"), { block: name })} onPointerDown={(event) => start(event, element, "resize")} onPointerMove={(event) => track(event, grid.columns, grid.rowHeight)} onPointerUp={() => { gesture.current = null; }} />
                          {!required ? <span className="de-handle de-handle--rotate" role="img" aria-label={t(key("rotate"), { block: name })} onPointerDown={(event) => start(event, element, "rotate")} onPointerMove={(event) => track(event, grid.columns, grid.rowHeight)} onPointerUp={() => { gesture.current = null; }} /> : null}
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
