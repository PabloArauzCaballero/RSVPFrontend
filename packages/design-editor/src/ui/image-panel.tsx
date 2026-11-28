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
  // What the file is for decides how it is filed when uploaded: a page background is a `background`, an image of the page is a `block`.
  const [use, setUse] = useState<"image" | "background">("image");
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
      <fieldset className="de-fieldset">
        <legend>{t(key("use.title"))}</legend>
        {(["image", "background"] as const).map((value) => (
          <label key={value} className="de-field de-field--check"><input type="radio" name="de-img-use" checked={use === value} onChange={() => setUse(value)} /><span>{t(key(`use.${value}`))}</span></label>
        ))}
      </fieldset>
      <PhotoPicker media={media} purpose={use === "image" ? "block" : "background"}>
        {(choice) => use === "background" ? (
          <div className="de-row de-row--wrap">
            <button type="button" className="de-btn" onClick={() => { dispatch({ type: "edit", op: setPageBackgroundPhoto(pageId, choice.id), at: now() }); done(t(key("kind.background"), { page: pageName(pageId) })); }}>{t(key("kind.background"), { page: pageName(pageId) })}</button>
          </div>
        ) : (
          <div className="de-row de-row--wrap">
            <button type="button" className="de-btn" onClick={() => { dispatch({ type: "edit", op: addBlock(pageId, "image", { mediaId: choice.id, fit: "cover", alt }), at: now() }); done(t(key("kind.image"))); }}>{t(key("kind.image"))}</button>
            <button type="button" className="de-btn" onClick={() => { dispatch({ type: "edit", op: addBlock(pageId, "imageText", { mediaId: choice.id, alt, text: t(key("defaultText")), imageSide: "start" }), at: now() }); done(t(key("kind.imageText"))); }}>{t(key("kind.imageText"))}</button>
            <button type="button" className="de-btn" onClick={() => { dispatch({ type: "edit", op: addBlock(pageId, "monogram", { mediaId: choice.id }), at: now() }); done(t(key("kind.monogram"))); }}>{t(key("kind.monogram"))}</button>
          </div>
        )}
      </PhotoPicker>
      {media.listAudio ? (
        <fieldset className="de-fieldset" data-testid="music-section">
          <legend>{t(key("music.title"))}</legend>
          <p className="de-hint">{t(key("music.help"))}</p>
          <PhotoPicker media={media} purpose="music" kind="audio">
            {(choice) => (
              <div className="de-row de-row--wrap">
                <button type="button" className="de-btn" onClick={() => { dispatch({ type: "edit", op: addBlock(pageId, "music", { source: "media", ref: choice.id }), at: now() }); done(t(key("music.added"))); }}>{t(key("music.add"))}</button>
              </div>
            )}
          </PhotoPicker>
        </fieldset>
      ) : null}
      {background ? <button type="button" className="de-btn" onClick={() => { dispatch({ type: "edit", op: setPageBackgroundPhoto(pageId, null), at: now() }); announce(t(key("backgroundRemoved"), { page: pageName(pageId) })); }}>{t(key("removeBackground"), { page: pageName(pageId) })}</button> : null}
      <p className="de-hint">{t(key("note"))}</p>
    </section>
  );
}
