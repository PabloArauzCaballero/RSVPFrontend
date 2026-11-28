import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { addBlock, canRemove, PALETTE, placeElement, reorderLayer, rotateElement, setElementBox } from "../model/canvas.js";
import { canMask, elementAnimationOf, elementAnimationsFor, elementFrameOf, elementMaskOf, FRAME_COLOURS, FRAME_STYLES, isProtectedBlock, MASKS, setElementAnimation, setElementFrame, setElementMask, type AnimationName, type DesignMask, type FrameStyle } from "../model/fidelity.js";
import { isGiftsElement } from "../model/guards.js";
import { patchElement, setElementVisible, type DocumentOp } from "../model/ops.js";
import type { design } from "@rsvp/celebration-theme";
import { blockName, elementOf, useCommands } from "./commands.js";
import { useEditor } from "./editor-context.js";
import { useNarrow } from "./use-narrow.js";

const key = (name: string): string => `designEditor.canvasEditor.${name}`;
const SIDES = ["top", "right", "bottom", "left"] as const;

/**
 * A whole-number field with its own draft: what you type stays until you confirm it (Enter or leaving the field), Escape puts back the stored value,
 * and a value outside the range says so next to the field instead of being applied (so typing "10" through "1" never changes the design on the way).
 */
function NumberField({ id, label, value, min, max, step = 1, disabled = false, onCommit }: { readonly id: string; readonly label: string; readonly value: number; readonly min: number; readonly max: number; readonly step?: number; readonly disabled?: boolean; readonly onCommit: (next: number) => void }) {
  const { t } = useEditor();
  const [draft, setDraft] = useState(String(value));
  const [invalid, setInvalid] = useState(false);
  const [nonce, setNonce] = useState(0);
  // The stored value is the truth: after a commit (clamped, snapped or refused), an undo or a restore, the field shows it again.
  useEffect(() => { setDraft(String(value)); setInvalid(false); }, [value, nonce]);
  const commit = (): void => {
    if (draft === String(value)) { setInvalid(false); return; }
    const next = Number(draft);
    if (draft.trim() === "" || !Number.isInteger(next) || next < min || next > max) { setInvalid(true); return; }
    setInvalid(false);
    onCommit(next);
    setNonce((count) => count + 1);
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") { event.preventDefault(); commit(); }
    else if (event.key === "Escape" && (invalid || draft !== String(value))) { event.preventDefault(); event.stopPropagation(); setDraft(String(value)); setInvalid(false); }
  };
  const errorId = `${id}-error`;
  return (
    <div className="de-field de-field--inline">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="number" inputMode="numeric" min={min} max={max} step={step} value={draft} disabled={disabled} aria-invalid={invalid} aria-describedby={invalid ? errorId : undefined}
        onChange={(event) => { setDraft(event.target.value); setInvalid(false); }} onBlur={commit} onKeyDown={keys} />
      {invalid ? <span id={errorId} className="de-field-error" role="alert">{t(key("inspector.invalid"), { min, max })}</span> : null}
    </div>
  );
}

/**
 * Animation, mask and frame of the selected element (contract v2 of fidelity). The protected buttons (gifts, reply) only
 * offer the entrance that does not move them: never a mask, a frame or `mecerse`. A mask is only offered on blocks that can be clipped.
 * With a named animation there is no duration to edit: it comes from the motion tokens of the design.
 */
function EffectsFields({ element, edit }: { readonly element: design.DesignElement; readonly edit: (op: DocumentOp, field: string) => void }) {
  const { document, state, t } = useEditor();
  const canvas = state.canvas;
  const base = useId();
  const protectedButton = isProtectedBlock(document, element);
  const animation = elementAnimationOf(element);
  const animations = elementAnimationsFor(document, element);
  // A value the document already has but this element is not offered (a stale or hand-made one) stays visible instead of reading as «Ninguna».
  const shown = animation !== null && !animations.includes(animation) ? [...animations, animation] : animations;
  const mask = elementMaskOf(element);
  const frame = elementFrameOf(element);
  return (
    <fieldset className="de-fieldset" data-testid="inspector-effects">
      <legend>{t(key("fx.title"))}</legend>
      <label className="de-field">
        <span>{t(key("fx.animation"))}</span>
        <select value={animation ?? ""} aria-describedby={`${base}-anim`} onChange={(event) => edit(setElementAnimation(canvas, element.id, event.target.value === "" ? null : (event.target.value as AnimationName)), "animation")}>
          <option value="">{t(key("fx.animations.none"))}</option>
          {shown.map((name) => <option key={name} value={name}>{t(key(`fx.animations.${name}`))}</option>)}
        </select>
      </label>
      <p id={`${base}-anim`} className="de-hint">{t(key("fx.animationHint"))}</p>
      {protectedButton ? <p className="de-hint" data-testid="effects-protected">{t(key("fx.protectedNote"))}</p> : null}
      {canMask(document, element) ? (
        <>
          <label className="de-field">
            <span>{t(key("fx.mask"))}</span>
            <select value={mask ?? ""} onChange={(event) => edit(setElementMask(canvas, element.id, event.target.value === "" ? null : (event.target.value as DesignMask)), "mask")}>
              <option value="">{t(key("fx.masks.none"))}</option>
              {MASKS.map((name) => <option key={name} value={name}>{t(key(`fx.masks.${name}`))}</option>)}
            </select>
          </label>
        </>
      ) : !protectedButton ? <p className="de-hint">{t(key("fx.maskHint"))}</p> : null}
      {protectedButton ? null : (
        <>
          <label className="de-field">
            <span>{t(key("fx.frame"))}</span>
            <select value={frame?.style ?? ""} onChange={(event) => edit(setElementFrame(canvas, element.id, event.target.value === "" ? null : { style: event.target.value as FrameStyle, colour: frame?.colour ?? "accent" }), "frame")}>
              <option value="">{t(key("fx.frames.none"))}</option>
              {FRAME_STYLES.map((name) => <option key={name} value={name}>{t(key(`fx.frames.${name}`))}</option>)}
            </select>
          </label>
          {frame ? (
            <label className="de-field">
              <span>{t(key("fx.frameColour"))}</span>
              <select value={frame.colour} onChange={(event) => edit(setElementFrame(canvas, element.id, { style: frame.style, colour: event.target.value as design.PaletteRole }), "frame")}>
                {FRAME_COLOURS.map((role) => <option key={role} value={role}>{t(key(`fx.colours.${role}`))}</option>)}
              </select>
            </label>
          ) : null}
        </>
      )}
    </fieldset>
  );
}

/** Numeric controls of the selected element (the same operations the pointer and the keyboard use) and its layer, spacing and visibility. */
export function ElementInspector() {
  const { document, state, t } = useEditor();
  const { apply, remove, canvas } = useCommands();
  const narrow = useNarrow();
  const element = elementOf(document, canvas, state.selection);
  const title = t(key("inspector.title"));
  const sheet = useRef<HTMLDetailsElement | null>(null);
  const [open, setOpen] = useState(false);
  const selectedId = element?.id ?? null;
  // The open sheet covers the lower part of the screen: the selected element is brought into the strip that stays free above it (WCAG 2.4.11).
  useEffect(() => {
    if (!narrow || !open || !selectedId) return;
    const node = window.document.querySelector<HTMLElement>(`[data-element-id="${selectedId}"]`);
    const top = sheet.current?.getBoundingClientRect().top;
    if (!node || top === undefined) return;
    const rect = node.getBoundingClientRect();
    const margin = 24;
    if (rect.bottom <= top - margin && rect.top >= margin) return;
    const tall = rect.height > top - 2 * margin;
    window.scrollBy({ top: tall ? rect.top - margin : rect.bottom - (top - margin), behavior: "instant" });
  }, [narrow, open, selectedId]);
  if (!element) return <section className="de-inspector" id="de-inspector" aria-label={title}><h2>{title}</h2><p className="de-hint">{t(key("inspector.none"))}</p></section>;
  const block = blockName(document, element, t);
  const required = isGiftsElement(document, element.id, canvas);
  const id = (field: string): string => `de-i-${field}`;
  const said = { ok: () => t(key("announce.applied"), { block }) };
  const edit = (op: Parameters<typeof apply>[0], field: string): void => { apply(op, { key: `inspector:${field}:${element.id}`, ...said }); };
  const back = (): void => { window.document.querySelector<HTMLElement>(`[data-element-id="${element.id}"]`)?.focus(); };
  const body: ReactNode = (
    <>
      {required ? <p className="de-hint">{t(key("inspector.locked"))}</p> : null}
      <NumberField id={id("x")} label={t(key("inspector.x"))} value={element.x} min={0} max={999} onCommit={(value) => edit(placeElement(canvas, element.id, { x: value }), "x")} />
      <NumberField id={id("y")} label={t(key("inspector.y"))} value={element.y} min={0} max={999} onCommit={(value) => edit(placeElement(canvas, element.id, { y: value }), "y")} />
      <NumberField id={id("w")} label={t(key("inspector.w"))} value={element.w} min={1} max={24} onCommit={(value) => edit(placeElement(canvas, element.id, { w: value }), "w")} />
      <NumberField id={id("h")} label={t(key("inspector.h"))} value={element.h} min={1} max={500} onCommit={(value) => edit(placeElement(canvas, element.id, { h: value }), "h")} />
      <NumberField id={id("rotation")} label={t(key("inspector.rotation"))} value={element.rotation ?? 0} min={-180} max={180} step={5} disabled={required} onCommit={(value) => edit(rotateElement(canvas, element.id, value), "rotation")} />
      <NumberField id={id("z")} label={t(key("inspector.z"))} value={element.z ?? 0} min={-100} max={100} onCommit={(value) => edit(patchElement(canvas, element.id, { z: Math.max(-100, Math.min(100, Math.round(value))) }), "z")} />
      <div className="de-row">
        <button type="button" className="de-btn" onClick={() => { apply(reorderLayer(canvas, element.id, "front"), { ok: () => t(key("announce.front"), { block }), limit: t(key("announce.front"), { block }) }); }}>{t(key("inspector.front"))}</button>
        <button type="button" className="de-btn" onClick={() => { apply(reorderLayer(canvas, element.id, "back"), { ok: () => t(key("announce.back"), { block }), limit: t(key("announce.back"), { block }) }); }}>{t(key("inspector.back"))}</button>
      </div>
      {(["padding", "margin"] as const).map((which) => (
        <fieldset key={which} className="de-fieldset">
          <legend>{t(key(`inspector.${which}`))}</legend>
          {SIDES.map((side) => <NumberField key={side} id={id(`${which}-${side}`)} label={t(key(`inspector.${side}`))} value={element[which]?.[side] ?? 0} min={0} max={256} step={4} onCommit={(value) => edit(setElementBox(canvas, element.id, which, side, value), `${which}-${side}`)} />)}
        </fieldset>
      ))}
      <EffectsFields element={element} edit={edit} />
      <label className="de-field de-field--check">
        <input type="checkbox" checked={element.visible} disabled={required} onChange={(event) => { apply(setElementVisible(canvas, element.id, event.target.checked), said); }} />
        <span>{t(key("inspector.visible"))}</span>
      </label>
      <div className="de-row de-row--wrap">
        <button type="button" className="de-btn" disabled={!canRemove(document, element.id)} onClick={() => { remove(element); }}>{t(key("inspector.remove"))}</button>
        <button type="button" className="de-btn" onClick={back}>{t(key("back"))}</button>
      </div>
    </>
  );
  // Narrow: a collapsible sheet docked to the bottom (at most 45 vh), so the inspector is one tap from the element and the element stays in view.
  if (narrow) {
    const close = (): void => { if (sheet.current) sheet.current.open = false; setOpen(false); sheet.current?.querySelector("summary")?.focus(); };
    return (
      <details ref={sheet} className="de-inspector de-inspector--sheet" id="de-inspector" data-testid="inspector-sheet" open={open}
        onToggle={(event) => setOpen(event.currentTarget.open)}
        onKeyDown={(event) => { if (event.key === "Escape" && event.currentTarget.open) { event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false; setOpen(false); back(); } }}>
        <summary>{t(key("sheet"), { block })}</summary>
        <button type="button" className="de-btn de-sheet-close" onClick={close}>{t(key("inspector.close"))}</button>
        <div className="de-inspector-body" role="group" aria-label={title}>{body}</div>
      </details>
    );
  }
  return (
    <section className="de-inspector" id="de-inspector" aria-label={title}>
      <h2>{title}: {block}</h2>
      {body}
    </section>
  );
}

/** Components of plan §5 that need no uploaded media: pick a page and add one. Their default texts come from the catalogue, so they follow the editor's language. */
export function ComponentPalette() {
  const { document, dispatch, t, now, announce } = useEditor();
  const [pageId, setPageId] = useState(document.pages[0]?.id ?? "");
  const add = (entry: (typeof PALETTE)[number]): void => {
    const config = entry.textField ? { ...entry.config, [entry.textField]: t(key(`palette.default.${entry.type}`)) } : entry.config;
    dispatch({ type: "edit", op: addBlock(pageId, entry.type, config), at: now() });
    announce(t(key("announce.applied"), { block: t(key(`palette.${entry.type}`)) }));
  };
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
        {PALETTE.map((entry) => <button key={entry.type} type="button" className="de-btn" onClick={() => add(entry)}>{t(key(`palette.${entry.type}`))}</button>)}
      </div>
    </section>
  );
}
