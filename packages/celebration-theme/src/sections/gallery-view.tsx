"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { ActionIcon } from "../icon.js";
import { MediaImage } from "../media/components.js";
import type { PublicMedia } from "../media/variants.js";

interface GalleryPhoto {
  readonly media: PublicMedia;
  readonly href: string;
  readonly label: string;
  readonly openLabel: string;
}

interface GalleryLabels {
  readonly title: string;
  readonly close: string;
  readonly previous: string;
  readonly next: string;
}

export function GalleryView({ photos, labels }: { readonly photos: readonly GalleryPhoto[]; readonly labels: GalleryLabels }): ReactNode {
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLAnchorElement>(null);
  const photo = selected === null ? undefined : photos[selected];
  const isOpen = photo !== undefined;
  const hasNavigation = photos.length > 1;

  useEffect(() => {
    const surface = dialog.current;
    if (isOpen && surface && !surface.open) {
      surface.showModal();
      closeButton.current?.focus({ preventScroll: true });
    }
  }, [isOpen]);

  const open = (event: MouseEvent<HTMLAnchorElement>, index: number): void => {
    // Keep the link usable before hydration, on older browsers and for alternate click actions.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      typeof HTMLDialogElement === "undefined" || typeof HTMLDialogElement.prototype.showModal !== "function") return;
    event.preventDefault();
    opener.current = event.currentTarget;
    setSelected(index);
  };
  const move = (offset: number): void => {
    setSelected((current) => current === null ? null : (current + offset + photos.length) % photos.length);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>): void => {
    if (!hasNavigation || event.metaKey || event.ctrlKey || event.altKey || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();
    move(event.key === "ArrowLeft" ? -1 : 1);
  };
  const onClose = (): void => {
    setSelected(null);
    opener.current?.focus({ preventScroll: true });
  };

  return (
    <>
      <ul className="celebration-gallery">
        {photos.map((item, index) => (
          <li key={item.media.id}>
            <a href={item.href} data-link-kind="image" aria-label={item.openLabel} onClick={(event) => open(event, index)}>
              <MediaImage media={item.media} alt={item.label} sizes="(min-width: 768px) 33vw, 100vw" />
            </a>
          </li>
        ))}
      </ul>
      {photo ? (
        <dialog ref={dialog} className="celebration-gallery-dialog rsvp-protected" aria-label={labels.title} onKeyDown={onKeyDown} onClose={onClose}>
          <div className="celebration-gallery-toolbar">
            <span role="status">{photo.label}</span>
            <button ref={closeButton} type="button" onClick={() => dialog.current?.close()}><ActionIcon name="close" size={18} />{labels.close}</button>
          </div>
          <div className="celebration-gallery-stage">
            <MediaImage key={photo.media.id} media={photo.media} alt={photo.label} fit="contain" priority sizes="(min-width: 72rem) 70rem, 100vw" />
          </div>
          {hasNavigation ? (
            <div className="celebration-gallery-toolbar">
              <button type="button" onClick={() => move(-1)}><ActionIcon name="back" size={18} />{labels.previous}</button>
              <button type="button" onClick={() => move(1)}>{labels.next}<ActionIcon name="arrow" size={18} /></button>
            </div>
          ) : null}
        </dialog>
      ) : null}
    </>
  );
}
