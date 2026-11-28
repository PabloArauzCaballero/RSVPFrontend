import { useState } from "react";
import { addBlock } from "../model/canvas.js";
import { setPageBackgroundPhoto } from "../model/ops.js";
import type { MediaSource } from "./basic-panel.js";
import { useEditor } from "./editor-context.js";
import { PhotoPicker } from "./photo-picker.js";

const key = (name: string): string => `designEditor.images.${name}`;
const MAX_ALT = 300;

/**
 * Advanced level: pictures inside the invitation. Pick or upload a file and add it as an image block, an image with text, a
 * monogram picture or the background of a page. The picture is referenced by its media id, never by an address.
 */
export function ImagePanel({ media }: { readonly media: MediaSource }) {
  const { document, dispatch, t, now, announce } = useEditor();
  const [pageId, setPageId] = useState(document.pages[0]?.id ?? "");
  const [alt, setAlt] = useState("");
  const page = document.pages.find((candidate) => candidate.id === pageId);
  const background = page?.background?.kind === "media" ? page.background.mediaId : null;
  const pageName = (id: string): string => { const found = document.pages.find((candidate) => candidate.id === id); return found?.kind === "cover" ? t("designEditor.outline.cover") : t(`celebration.sections.${found?.section ?? ""}`); };
  const done = (what: string): void => announce(t(key("added"), { what }));

  return (
    <section className="de-images" aria-label={t(key("title"))}>
      <h2>{t(key("title"))}</h2>
      <label className="de-field">
        <span>{t(key("page"))}</span>
        <select value={pageId} onChange={(event) => setPageId(event.target.value)}>
          {document.pages.map((candidate) => <option key={candidate.id} value={candidate.id}>{pageName(candidate.id)}</option>)}
        </select>
      </label>
      <div className="de-field">
        <label htmlFor="de-img-alt">{t(key("alt"))}</label>
        <input id="de-img-alt" type="text" maxLength={MAX_ALT} value={alt} aria-describedby="de-img-alt-help" onChange={(event) => setAlt(event.target.value)} />
        <small id="de-img-alt-help" className="de-hint">{t(key("altHelp"))}</small>
      </div>
      <PhotoPicker media={media} purpose="block">
        {(choice) => (
          <div className="de-row de-row--wrap">
            <button type="button" className="de-btn" onClick={() => { dispatch({ type: "edit", op: addBlock(pageId, "image", { mediaId: choice.id, fit: "cover", alt }), at: now() }); done(t(key("kind.image"))); }}>{t(key("kind.image"))}</button>
            <button type="button" className="de-btn" onClick={() => { dispatch({ type: "edit", op: addBlock(pageId, "imageText", { mediaId: choice.id, alt, text: t(key("defaultText")), imageSide: "start" }), at: now() }); done(t(key("kind.imageText"))); }}>{t(key("kind.imageText"))}</button>
            <button type="button" className="de-btn" onClick={() => { dispatch({ type: "edit", op: addBlock(pageId, "monogram", { mediaId: choice.id }), at: now() }); done(t(key("kind.monogram"))); }}>{t(key("kind.monogram"))}</button>
            <button type="button" className="de-btn" onClick={() => { dispatch({ type: "edit", op: setPageBackgroundPhoto(pageId, choice.id), at: now() }); done(t(key("kind.background"), { page: pageName(pageId) })); }}>{t(key("kind.background"), { page: pageName(pageId) })}</button>
          </div>
        )}
      </PhotoPicker>
      {background ? <button type="button" className="de-btn" onClick={() => { dispatch({ type: "edit", op: setPageBackgroundPhoto(pageId, null), at: now() }); announce(t(key("backgroundRemoved"), { page: pageName(pageId) })); }}>{t(key("removeBackground"), { page: pageName(pageId) })}</button> : null}
      <p className="de-hint">{t(key("note"))}</p>
    </section>
  );
}
