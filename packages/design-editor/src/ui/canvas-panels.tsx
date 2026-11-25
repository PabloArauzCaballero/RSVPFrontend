import { useState } from "react";
import { addBlock, canRemove, PALETTE, placeElement, removeElement, reorderLayer, rotateElement, setElementBox } from "../model/canvas.js";
import { isGiftsElement } from "../model/guards.js";
import { patchElement, setElementVisible } from "../model/ops.js";
import { blockLabel } from "./canvas-editor.js";
import { useEditor } from "./editor-context.js";

const key = (name: string): string => `designEditor.canvasEditor.${name}`;
const SIDES = ["top", "right", "bottom", "left"] as const;

function Number_({ id, label, value, min, max, step = 1, disabled = false, onChange }: { readonly id: string; readonly label: string; readonly value: number; readonly min: number; readonly max: number; readonly step?: number; readonly disabled?: boolean; readonly onChange: (next: number) => void }) {
  return (
    <label className="de-field de-field--inline" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type="number" inputMode="numeric" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next)) onChange(next); }} />
    </label>
  );
}

/** Numeric controls of the selected element (the same operations the pointer uses) and its layer, spacing and visibility. */
export function ElementInspector() {
  const { document, state, dispatch, t, now } = useEditor();
  const canvas = state.canvas;
  const element = document.pages.flatMap((page) => page.canvases[canvas]?.elements ?? []).find((candidate) => candidate.id === state.selection);
  const edit = (op: Parameters<typeof dispatch>[0] extends infer A ? (A extends { op: infer O } ? O : never) : never, field: string): void => dispatch({ type: "edit", op, key: `inspector:${field}:${state.selection ?? ""}`, at: now() });
  if (!element) return <section className="de-inspector" aria-label={t(key("inspector.title"))}><h2>{t(key("inspector.title"))}</h2><p className="de-hint">{t(key("inspector.none"))}</p></section>;
  const required = isGiftsElement(document, element.id, canvas);
  const id = (field: string): string => `de-i-${field}`;
  return (
    <section className="de-inspector" aria-label={t(key("inspector.title"))}>
      <h2>{t(key("inspector.title"))}: {blockLabel(document, element, t)}</h2>
      {required ? <p className="de-hint">{t(key("inspector.locked"))}</p> : null}
      <Number_ id={id("x")} label={t(key("inspector.x"))} value={element.x} min={0} max={999} onChange={(value) => edit(placeElement(canvas, element.id, { x: value }), "x")} />
      <Number_ id={id("y")} label={t(key("inspector.y"))} value={element.y} min={0} max={999} onChange={(value) => edit(placeElement(canvas, element.id, { y: value }), "y")} />
      <Number_ id={id("w")} label={t(key("inspector.w"))} value={element.w} min={1} max={24} onChange={(value) => edit(placeElement(canvas, element.id, { w: value }), "w")} />
      <Number_ id={id("h")} label={t(key("inspector.h"))} value={element.h} min={1} max={500} onChange={(value) => edit(placeElement(canvas, element.id, { h: value }), "h")} />
      <Number_ id={id("rotation")} label={t(key("inspector.rotation"))} value={element.rotation ?? 0} min={-180} max={180} step={5} disabled={required} onChange={(value) => edit(rotateElement(canvas, element.id, value), "rotation")} />
      <Number_ id={id("z")} label={t(key("inspector.z"))} value={element.z ?? 0} min={-100} max={100} onChange={(value) => edit(patchElement(canvas, element.id, { z: Math.max(-100, Math.min(100, Math.round(value))) }), "z")} />
      <div className="de-row">
        <button type="button" className="de-btn" onClick={() => dispatch({ type: "edit", op: reorderLayer(canvas, element.id, "front"), at: now() })}>{t(key("inspector.front"))}</button>
        <button type="button" className="de-btn" onClick={() => dispatch({ type: "edit", op: reorderLayer(canvas, element.id, "back"), at: now() })}>{t(key("inspector.back"))}</button>
      </div>
      {(["padding", "margin"] as const).map((which) => (
        <fieldset key={which} className="de-fieldset">
          <legend>{t(key(`inspector.${which}`))}</legend>
          {SIDES.map((side) => <Number_ key={side} id={id(`${which}-${side}`)} label={t(key(`inspector.${side}`))} value={element[which]?.[side] ?? 0} min={0} max={256} step={4} onChange={(value) => edit(setElementBox(canvas, element.id, which, side, value), `${which}-${side}`)} />)}
        </fieldset>
      ))}
      <label className="de-field de-field--check">
        <input type="checkbox" checked={element.visible} disabled={required} onChange={(event) => dispatch({ type: "edit", op: setElementVisible(canvas, element.id, event.target.checked), at: now() })} />
        <span>{t(key("inspector.visible"))}</span>
      </label>
      <button type="button" className="de-btn" disabled={!canRemove(document, element.id)} onClick={() => { dispatch({ type: "edit", op: removeElement(element.id), at: now() }); dispatch({ type: "select", id: null }); }}>{t(key("inspector.remove"))}</button>
    </section>
  );
}

/** Components of plan §5 that need no uploaded media: pick a page and add one. */
export function ComponentPalette() {
  const { document, dispatch, t, now } = useEditor();
  const [pageId, setPageId] = useState(document.pages[0]?.id ?? "");
  return (
    <section className="de-palette" aria-label={t(key("palette.title"))}>
      <h2>{t(key("palette.title"))}</h2>
      <label className="de-field">
        <span>{t(key("palette.page"))}</span>
        <select value={pageId} onChange={(event) => setPageId(event.target.value)}>
          {document.pages.map((page) => <option key={page.id} value={page.id}>{page.kind === "cover" ? t("designEditor.outline.cover") : t(`celebration.sections.${page.section ?? ""}`)}</option>)}
        </select>
      </label>
      <div className="de-row de-row--wrap">
        {PALETTE.map((entry) => <button key={entry.type} type="button" className="de-btn" onClick={() => dispatch({ type: "edit", op: addBlock(pageId, entry.type, entry.config), at: now() })}>{t(key(`palette.${entry.type}`))}</button>)}
      </div>
    </section>
  );
}
