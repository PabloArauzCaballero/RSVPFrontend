import { design } from "@rsvp/celebration-theme";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { COVER_VARIANTS, coverVariantOf, coverVeilOf, PAGE_ANIMATIONS, pageAnimationOf, setCoverVariant, setCoverVeil, setPageAnimation, setVideoPoster, videoPosterOf, type AnimationName, type CoverVariant } from "../model/fidelity.js";
import { giftsBlock, giftsPlacement } from "../model/guards.js";
import { applyPaddingPreset, applySpacingPreset, applyTemplateDocument, coverDrawingOf, coverPhotoOf, editableTexts, hiddenElements, PADDING_PRESETS, setBlockText, setCoverDrawing, setCoverPhoto, setFontFamily, setPaletteColour, setSectionOrder, setSectionVisible, sharedPadding, SPACING_PRESETS, spacingPresetOf, switchableSections, textLimit, type PaddingPreset, type SpacingPreset, type TextField } from "../model/ops.js";
import { useEditor } from "./editor-context.js";

const key = (name: string): string => `designEditor.basic.${name}`;

export interface TemplateChoice { readonly id: string; readonly name: string; readonly document: design.DesignDocumentV2 }
export interface TemplateSource { readonly list: () => Promise<readonly TemplateChoice[]> }
/** A drawing of the invitation drawing library (F3), by id. The host app owns the catalogue; the editor only stores the id. */
export interface DrawingChoice { readonly id: string; readonly name: string }
export interface DrawingSource { readonly list: () => Promise<readonly DrawingChoice[]> }
/** A photo of the host's media store (F6), by media id. Without a source the editor says so instead of pretending to upload. */
export interface MediaChoice { readonly id: string; readonly name: string; /** Small version of the picture, to choose by looking and not by file name. */ readonly thumbUrl?: string }
export interface MediaUploaderProps {
  /** What the file is for, so the app files it right (`block` for an image block, `background` for a page background). */
  readonly purpose?: "background" | "block" | "section" | "element" | "monogram" | "music";
  /** Called once per file the server accepted and finished processing, so the editor can offer it and use it as the cover. */
  readonly onUploaded: (choice: MediaChoice) => void;
}
export interface MediaSource {
  readonly list: () => Promise<readonly MediaChoice[]>;
  /** The music files already uploaded (an MP3 the host owns), to use as the invitation's music; without it the editor offers no uploaded music. */
  readonly listAudio?: () => Promise<readonly MediaChoice[]>;
  /**
   * The screen's own upload surface (drag and drop, file dialog, camera, progress and errors per file). The editor is plain DOM and
   * knows nothing about the upload queue or the API, so the app injects it; without it the host can only pick what is already uploaded.
   */
  readonly renderUploader?: (props: MediaUploaderProps) => ReactNode;
}

const COLOUR_ROLES = ["accent", "canvas", "text", "surface", "muted"] as const;
const HEADING_CATEGORIES: readonly design.FontCategory[] = ["serif", "script"];

type Load<T> = { readonly state: "idle" | "loading" | "error" } | { readonly state: "ready"; readonly items: readonly T[] };

/** Loads a list from an optional source: loading, error (with retry) and ready are three distinct states, never a silent absence. */
export function useList<T>(source: { readonly list: () => Promise<readonly T[]> } | undefined): readonly [Load<T>, () => void] {
  const [load, setLoad] = useState<Load<T>>({ state: source ? "loading" : "idle" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!source) { setLoad({ state: "idle" }); return undefined; }
    let live = true;
    setLoad({ state: "loading" });
    source.list().then((items) => { if (live) setLoad({ state: "ready", items }); }, () => { if (live) setLoad({ state: "error" }); });
    return () => { live = false; };
  }, [source, attempt]);
  return [load, useCallback(() => setAttempt((count) => count + 1), [])];
}

export function ListStatus({ load, retry, loading, failed, retryLabel }: { readonly load: Load<unknown>; readonly retry: () => void; readonly loading: string; readonly failed: string; readonly retryLabel: string }) {
  if (load.state === "loading") return <p className="de-hint" role="status" aria-busy="true">{loading}</p>;
  if (load.state === "error") return <div className="de-inline-error" role="alert"><p>{failed}</p><button type="button" className="de-btn" onClick={retry}>{retryLabel}</button></div>;
  return null;
}

/** Radio group with the arrow pattern: one tab stop (the selected one, or the first), arrows move and select, Home and End jump. */
function Choice<T extends string>({ label, value, options, onChange }: { readonly label: string; readonly value: T | null; readonly options: readonly { readonly value: T; readonly text: string }[]; readonly onChange: (next: T) => void }) {
  const stop = options.some((option) => option.value === value) ? value : options[0]?.value;
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const last = options.length - 1;
    const to = event.key === "ArrowRight" || event.key === "ArrowDown" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" || event.key === "ArrowUp" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0 : event.key === "End" ? last : -1;
    const next = options[to];
    if (!next) return;
    event.preventDefault();
    onChange(next.value);
    (event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[to])?.focus();
  };
  return (
    <div className="de-field" role="radiogroup" aria-label={label}>
      <span>{label}</span>
      <div className="de-group">{options.map((option, index) => <button key={option.value} type="button" role="radio" aria-checked={option.value === value} tabIndex={option.value === stop ? 0 : -1} onKeyDown={(event) => move(event, index)} onClick={() => onChange(option.value)}>{option.text}</button>)}</div>
    </div>
  );
}

/**
 * One text box with its own draft. A required text left empty shows why inline and, on leaving the box, goes back to the last
 * text with a notice (never silently); an optional one (the automatic button label) may be emptied to get the automatic text.
 */
function TextRow({ entry }: { readonly entry: TextField }) {
  const { dispatch, t, now } = useEditor();
  const [draft, setDraft] = useState(entry.value);
  const [problem, setProblem] = useState<"empty" | "restored" | null>(null);
  const id = useId();
  useEffect(() => { setDraft(entry.value); setProblem(null); }, [entry.value]);
  const limit = textLimit(entry.type, entry.field);
  const commit = (value: string): void => dispatch({ type: "edit", op: setBlockText(entry.blockId, entry.field, entry.optional && value.trim() === "" ? null : value), key: `text:${entry.blockId}:${entry.field}`, at: now() });
  return (
    <div className="de-field">
      <label htmlFor={id}>{t(key(`texts.${entry.type}.${entry.field}`))}</label>
      <textarea id={id} rows={entry.field === "text" && entry.type === "text" ? 4 : 2} value={draft} maxLength={limit} aria-invalid={problem === "empty"} aria-describedby={`${id}-note ${id}-count`}
        onChange={(event) => {
          const value = event.target.value;
          setDraft(value);
          if (value.trim() === "" && !entry.optional) { setProblem("empty"); return; }
          setProblem(null);
          commit(value);
        }}
        onBlur={() => { if (problem === "empty") { setDraft(entry.value); setProblem("restored"); } }} />
      <p id={`${id}-note`} className={problem === "empty" ? "de-error" : "de-hint"} role="status">
        {problem === "empty" ? t(key("texts.empty")) : problem === "restored" ? t(key("texts.restored")) : draft.length >= limit ? t(key("texts.atLimit"), { max: limit }) : entry.optional ? t(key("texts.automatic")) : ""}
      </p>
      <p id={`${id}-count`} className="de-hint de-count" data-at-limit={draft.length >= limit}>{t(key("texts.count"), { current: draft.length, max: limit })}</p>
    </div>
  );
}

/** Cover style, the entrance of each page, the veil over the cover photo and the cover photo of each video (contract v2 of fidelity). */
function LookSection({ media, mediaLoad, retryMedia }: { readonly media: MediaSource | undefined; readonly mediaLoad: Load<MediaChoice>; readonly retryMedia: () => void }) {
  const { document, dispatch, t, now } = useEditor();
  const variant = coverVariantOf(document);
  const veil = coverVeilOf(document);
  const videos = document.blocks.filter((block) => block.type === "video");
  const pageName = (page: design.DesignPage): string => (page.kind === "cover" ? t("designEditor.outline.cover") : t(`celebration.sections.${page.section ?? ""}`));
  const hintId = useId();
  const veilId = useId();
  return (
    <section aria-label={t(key("look.title"))}>
      <h2>{t(key("look.title"))}</h2>
      {variant !== null ? (
        <label className="de-field">
          <span>{t(key("look.variant"))}</span>
          <select value={variant} onChange={(event) => dispatch({ type: "edit", op: setCoverVariant(event.target.value as CoverVariant), at: now() })}>
            {COVER_VARIANTS.map((name) => <option key={name} value={name}>{t(key(`look.variants.${name}`))}</option>)}
          </select>
        </label>
      ) : null}
      {document.pages.map((page) => (
        <label key={page.id} className="de-field">
          <span>{t(key("look.animation"), { page: pageName(page) })}</span>
          <select value={pageAnimationOf(page) ?? ""} aria-describedby={hintId} onChange={(event) => dispatch({ type: "edit", op: setPageAnimation(page.id, event.target.value === "" ? null : (event.target.value as AnimationName)), at: now() })}>
            <option value="">{t(key("look.animations.none"))}</option>
            {PAGE_ANIMATIONS.map((name) => <option key={name} value={name}>{t(key(`look.animations.${name}`))}</option>)}
          </select>
        </label>
      ))}
      <p id={hintId} className="de-hint">{t(key("look.animationHint"))}</p>
      {veil !== null ? (
        <>
          <label className="de-field de-field--check">
            <input type="checkbox" checked={veil === "graded"} aria-describedby={veilId} onChange={(event) => dispatch({ type: "edit", op: setCoverVeil(event.target.checked ? "graded" : "even"), at: now() })} />
            <span>{t(key("look.veil"))}: {t(key("look.veilGraded"))}</span>
          </label>
          <p id={veilId} className="de-hint">{t(key("look.veilHint"))}</p>
        </>
      ) : <p className="de-hint" data-testid="veil-needs-photo">{t(key("look.veilNeedsPhoto"))}</p>}
      {videos.map((block) => <VideoPoster key={block.id} blockId={block.id} media={media} mediaLoad={mediaLoad} retryMedia={retryMedia} />)}
    </section>
  );
}

function VideoPoster({ blockId, media, mediaLoad, retryMedia }: { readonly blockId: string; readonly media: MediaSource | undefined; readonly mediaLoad: Load<MediaChoice>; readonly retryMedia: () => void }) {
  const { document, dispatch, t, now } = useEditor();
  const id = useId();
  const poster = videoPosterOf(document, blockId);
  if (!media) return <p className="de-hint" data-testid="poster-unavailable">{t(key("look.posterUnavailable"))}</p>;
  if (mediaLoad.state !== "ready") return <ListStatus load={mediaLoad} retry={retryMedia} loading={t(key("photos.loading"))} failed={t(key("photos.failed"))} retryLabel={t(key("retry"))} />;
  const known = mediaLoad.items.some((item) => item.id === poster);
  return (
    <div className="de-field">
      <label htmlFor={id}>{t(key("look.poster"))}</label>
      <select id={id} value={poster ?? ""} aria-describedby={`${id}-hint`} onChange={(event) => dispatch({ type: "edit", op: setVideoPoster(blockId, event.target.value === "" ? null : event.target.value), at: now() })}>
        <option value="">{t(key("look.posterProvider"))}</option>
        {poster !== null && !known ? <option value={poster}>{t(key("look.posterMissing"))}</option> : null}
        {mediaLoad.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
      <p id={`${id}-hint`} className="de-hint">{t(key("look.posterHint"))}</p>
    </div>
  );
}

/** The Basic level: pick a template, texts, photos, drawings, colours, fonts from the catalogue, spacing and padding presets, sections on and off (gifts always on). */
export function BasicPanel({ templates, drawings, media }: { readonly templates?: TemplateSource; readonly drawings?: DrawingSource; readonly media?: MediaSource }) {
  const { document, dispatch, t, now } = useEditor();
  const [templateLoad, retryTemplates] = useList(templates);
  const [drawingLoad, retryDrawings] = useList(drawings);
  const [mediaLoad, retryMedia] = useList(media);
  const [justUploaded, setJustUploaded] = useState<string | null>(null);
  /** What the host hid by hand inside a section, kept while the section is off so switching it on again respects it (m2). */
  const hiddenByHand = useRef(new Map<string, ReadonlySet<string>>());

  const giftsPageId = giftsPlacement(document)?.page.id;
  const gifts = giftsBlock(document);
  const sections = document.pages.filter((page) => page.kind === "section" && page.section !== undefined);
  const switchable = switchableSections(document, giftsPageId);
  const typography = document.tokens.typography;
  const texts = editableTexts(document);
  const drawing = coverDrawingOf(document);
  const photo = coverPhotoOf(document);

  const move = (section: string, by: -1 | 1): void => {
    const order = sections.map((page) => page.section ?? "");
    const at = order.indexOf(section);
    const to = at + by;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[at], next[to]] = [next[to] as string, next[at] as string];
    dispatch({ type: "edit", op: setSectionOrder(next), at: now() });
  };
  const toggle = (section: string, on: boolean, currentlyOn: boolean): void => {
    if (!on && currentlyOn) hiddenByHand.current.set(section, hiddenElements(document, section));
    dispatch({ type: "edit", op: setSectionVisible(section, on, on ? hiddenByHand.current.get(section) : undefined), at: now() });
  };
  const choose = <T extends { readonly id: string }>(items: readonly T[], id: string, apply: (picked: T) => void): void => { const picked = items.find((item) => item.id === id); if (picked) apply(picked); };

  return (
    <div className="de-basic">
      {templates ? (
        <section aria-label={t(key("template.title"))}>
          <h2>{t(key("template.title"))}</h2>
          <ListStatus load={templateLoad} retry={retryTemplates} loading={t(key("template.loading"))} failed={t(key("template.failed"))} retryLabel={t(key("retry"))} />
          {templateLoad.state === "ready" && templateLoad.items.length > 0 ? (
            <>
              <label className="de-field">
                <span>{t(key("template.label"))}</span>
                <select defaultValue="" onChange={(event) => { choose(templateLoad.items, event.target.value, (picked) => dispatch({ type: "edit", op: applyTemplateDocument(picked.document), at: now() })); event.target.value = ""; }}>
                  <option value="" disabled>{t(key("template.placeholder"))}</option>
                  {templateLoad.items.map((choice) => <option key={choice.id} value={choice.id}>{choice.name}</option>)}
                </select>
              </label>
              <p className="de-hint">{t(key("template.hint"))}</p>
            </>
          ) : null}
          {templateLoad.state === "ready" && templateLoad.items.length === 0 ? <p className="de-hint">{t(key("template.none"))}</p> : null}
        </section>
      ) : null}

      <section aria-label={t(key("texts.title"))}>
        <h2>{t(key("texts.title"))}</h2>
        {texts.map((entry) => <TextRow key={`${entry.blockId}-${entry.field}`} entry={entry} />)}
        {texts.length === 0 ? <p className="de-hint">{t(key("texts.none"))}</p> : null}
        <p className="de-hint">{t(key("texts.celebrationData"))}</p>
      </section>

      <section aria-label={t(key("photos.title"))}>
        <h2>{t(key("photos.title"))}</h2>
        {media ? (
          <>
            <ListStatus load={mediaLoad} retry={retryMedia} loading={t(key("photos.loading"))} failed={t(key("photos.failed"))} retryLabel={t(key("retry"))} />
            {media.renderUploader ? (
              <div className="de-upload" data-testid="photos-uploader">
                <h3>{t(key("photos.upload"))}</h3>
                {media.renderUploader({ onUploaded: (choice) => { setJustUploaded(choice.name); retryMedia(); dispatch({ type: "edit", op: setCoverPhoto(choice.id), at: now() }); } })}
                <p className="de-hint" role="status">{justUploaded ? t(key("photos.uploaded"), { name: justUploaded }) : ""}</p>
              </div>
            ) : null}
            {mediaLoad.state === "ready" ? (
              mediaLoad.items.length === 0 ? <p className="de-hint">{t(key("photos.empty"))}</p> : (
                <>
                  <label className="de-field">
                    <span>{t(key("photos.cover"))}</span>
                    <select value={photo ?? ""} onChange={(event) => choose(mediaLoad.items, event.target.value, (picked) => dispatch({ type: "edit", op: setCoverPhoto(picked.id), at: now() }))}>
                      <option value="" disabled>{t(key("photos.placeholder"))}</option>
                      {mediaLoad.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                  <button type="button" className="de-btn" disabled={photo === null} onClick={() => dispatch({ type: "edit", op: setCoverPhoto(null), at: now() })}>{t(key("photos.remove"))}</button>
                </>
              )
            ) : null}
          </>
        ) : <p className="de-hint" data-testid="photos-unavailable">{t(key("photos.unavailable"))}</p>}
        <p className="de-hint">{t(key("photos.gallery"))}</p>
      </section>

      <LookSection media={media} mediaLoad={mediaLoad} retryMedia={retryMedia} />

      <section aria-label={t(key("drawings.title"))}>
        <h2>{t(key("drawings.title"))}</h2>
        {drawings ? (
          <>
            <ListStatus load={drawingLoad} retry={retryDrawings} loading={t(key("drawings.loading"))} failed={t(key("drawings.failed"))} retryLabel={t(key("retry"))} />
            {drawingLoad.state === "ready" ? (
              <label className="de-field">
                <span>{t(key("drawings.cover"))}</span>
                <select value={drawing ?? ""} onChange={(event) => dispatch({ type: "edit", op: setCoverDrawing(event.target.value === "" ? null : event.target.value), at: now() })}>
                  <option value="">{t(key("drawings.none"))}</option>
                  {drawingLoad.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            ) : null}
            <p className="de-hint">{t(key("drawings.hint"))}</p>
          </>
        ) : <p className="de-hint" data-testid="drawings-unavailable">{t(key("drawings.unavailable"))}</p>}
      </section>

      <section aria-label={t(key("title"))}>
        <h2>{t(key("title"))}</h2>
        {(["light", "dark"] as const).map((scheme) => (
          <fieldset key={scheme} className="de-fieldset">
            <legend>{t(key(scheme === "light" ? "schemeLight" : "schemeDark"))}</legend>
            {COLOUR_ROLES.map((role) => (
              <label key={role} className="de-field de-field--inline">
                <span>{t(key(`role.${role}`))}</span>
                <input type="color" value={document.tokens.palettes[scheme][role].toLowerCase()} onChange={(event) => dispatch({ type: "edit", op: setPaletteColour(scheme, role, event.target.value), key: `palette:${scheme}:${role}`, at: now() })} />
              </label>
            ))}
          </fieldset>
        ))}
      </section>

      <section aria-label={t(key("fonts.title"))}>
        <h2>{t(key("fonts.title"))}</h2>
        {(["heading", "body"] as const).map((role) => (
          <label key={role} className="de-field">
            <span>{t(key(role === "heading" ? "fonts.heading" : "fonts.body"))}</span>
            <select value={typography[role].family} onChange={(event) => dispatch({ type: "edit", op: setFontFamily(role, event.target.value), at: now() })}>
              {design.FONT_FAMILIES.filter((family) => (role === "heading" ? HEADING_CATEGORIES.includes(family.category) || family.category === "sans" : family.category !== "script")).map((family) => <option key={family.id} value={family.id}>{family.family}</option>)}
            </select>
          </label>
        ))}
      </section>

      <section aria-label={t(key("spacing.title"))}>
        <h2>{t(key("spacing.title"))}</h2>
        <Choice<SpacingPreset> label={t(key("spacing.section"))} value={spacingPresetOf(document)} onChange={(preset) => dispatch({ type: "edit", op: applySpacingPreset(preset), at: now() })}
          options={(Object.keys(SPACING_PRESETS) as SpacingPreset[]).map((name) => ({ value: name, text: t(key(`spacing.${name}`)) }))} />
        <Choice<PaddingPreset> label={t(key("padding.title"))} value={sharedPadding(document)} onChange={(preset) => dispatch({ type: "edit", op: applyPaddingPreset(preset), at: now() })}
          options={(Object.keys(PADDING_PRESETS) as PaddingPreset[]).map((name) => ({ value: name, text: t(key(`padding.${name}`)) }))} />
      </section>

      <section aria-label={t(key("sections.title"))}>
        <h2>{t(key("sections.title"))}</h2>
        <ul className="de-sections">
          {sections.map((page, index) => {
            const section = page.section ?? "";
            const locked = !switchable.includes(section);
            const on = page.canvases.mobile.elements.some((element) => element.visible);
            return (
              <li key={page.id}>
                <label>
                  <input type="checkbox" checked={locked || on} disabled={locked} onChange={(event) => toggle(section, event.target.checked, on)} />
                  <span>{t(`celebration.sections.${section}`)}</span>
                </label>
                {locked ? <small className="de-hint">{t(key("sections.locked"))}</small> : null}
                <span className="de-move">
                  <button type="button" className="de-btn" aria-label={t(key("sections.up"), { section: t(`celebration.sections.${section}`) })} disabled={index === 0} onClick={() => move(section, -1)}>↑</button>
                  <button type="button" className="de-btn" aria-label={t(key("sections.down"), { section: t(`celebration.sections.${section}`) })} disabled={index === sections.length - 1} onClick={() => move(section, 1)}>↓</button>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {gifts ? <p className="de-hint">{t(key("giftsNote"))}</p> : null}
    </div>
  );
}
