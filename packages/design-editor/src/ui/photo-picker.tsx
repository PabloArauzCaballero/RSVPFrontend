import { useEffect, useId, useState, type ReactNode } from "react";
import { ListStatus, useList, type MediaChoice, type MediaSource } from "./basic-panel.js";
import { useEditor } from "./editor-context.js";

const key = (name: string): string => `designEditor.photoPicker.${name}`;

export interface PhotoPickerProps {
  readonly media: MediaSource;
  readonly purpose: "background" | "block" | "section" | "element" | "monogram";
  /** What can be done with the chosen picture (add a block, set a background, insert into the code). */
  readonly children: (choice: MediaChoice) => ReactNode;
}

/**
 * Choose a picture without typing an address: upload a new one (the app's own surface: drag and drop, file dialog, camera) or pick
 * one already uploaded, by looking at it. A file that just finished uploading is chosen by itself. Nothing here takes a URL.
 */
export function PhotoPicker({ media, purpose, children }: PhotoPickerProps) {
  const { t } = useEditor();
  const [load, retry] = useList(media);
  const [chosen, setChosen] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<MediaChoice | null>(null);
  const group = useId();
  // The list is re-read when something was just uploaded; until it shows it, the uploaded file stands in so it can be used at once.
  const items: readonly MediaChoice[] = load.state === "ready" ? (uploaded && !load.items.some((item) => item.id === uploaded.id) ? [uploaded, ...load.items] : load.items) : uploaded ? [uploaded] : [];
  const picked = items.find((item) => item.id === chosen) ?? null;
  useEffect(() => { if (chosen && load.state === "ready" && !items.some((item) => item.id === chosen)) setChosen(null); }, [chosen, load.state, items]);

  return (
    <div className="de-photo-picker">
      {media.renderUploader ? <div data-testid="picker-uploader">{media.renderUploader({ purpose, onUploaded: (choice) => { setUploaded(choice); setChosen(choice.id); retry(); } })}</div> : null}
      <ListStatus load={load} retry={retry} loading={t(key("loading"))} failed={t(key("failed"))} retryLabel={t("designEditor.basic.retry")} />
      {load.state === "ready" && items.length === 0 ? <p className="de-hint">{t(key("empty"))}</p> : null}
      {items.length > 0 ? (
        <fieldset className="de-fieldset de-photo-grid" aria-describedby={`${group}-help`}>
          <legend>{t(key("choose"))}</legend>
          <p id={`${group}-help`} className="de-hint">{t(key("help"))}</p>
          <div className="de-photo-list">
            {items.map((item) => (
              <label key={item.id} className="de-photo" data-selected={item.id === chosen}>
                <input type="radio" name={group} value={item.id} checked={item.id === chosen} onChange={() => setChosen(item.id)} />
                {item.thumbUrl ? <img src={item.thumbUrl} alt="" loading="lazy" width={72} height={72} /> : <span className="de-photo-blank" aria-hidden="true" />}
                <span className="de-photo-name">{item.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div role="status" aria-live="polite" className="de-hint">{picked ? t(key("selected"), { name: picked.name }) : ""}</div>
      {picked ? children(picked) : null}
    </div>
  );
}
