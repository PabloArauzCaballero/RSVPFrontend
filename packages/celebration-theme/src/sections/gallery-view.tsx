"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode, type UIEvent } from "react";
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
  readonly enlarge: string;
  readonly close: string;
  readonly previous: string;
  readonly next: string;
}

function arrowOffset(event: KeyboardEvent<HTMLElement>): -1 | 0 | 1 {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return 0;
  if (event.key === "ArrowLeft") return -1;
  return event.key === "ArrowRight" ? 1 : 0;
}

export function GalleryView({ photos, labels }: { readonly photos: readonly GalleryPhoto[]; readonly labels: GalleryLabels }): ReactNode {
  const [slide, setSlide] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const track = useRef<HTMLUListElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLAnchorElement>(null);
  const photo = selected === null ? undefined : photos[selected];
  const isOpen = photo !== undefined;
  const hasNavigation = photos.length > 1;
  const currentSlide = Math.min(slide, photos.length - 1);

  useEffect(() => {
    const surface = dialog.current;
    if (isOpen && surface && !surface.open) {
      surface.showModal();
      closeButton.current?.focus({ preventScroll: true });
    }
  }, [isOpen]);

  const showSlide = (index: number): Element | undefined => {
    const list = track.current;
    const item = list?.children[index];
    if (!list || !item) return undefined;
    // Each slide spans one scrollport. Keep the buttons and counter in sync with touch scrolling.
    list.scrollLeft = index * list.clientWidth;
    setSlide(index);
    return item;
  };
  const onScroll = (event: UIEvent<HTMLUListElement>): void => {
    const { clientWidth, scrollLeft } = event.currentTarget;
    if (clientWidth > 0) setSlide(Math.max(0, Math.min(photos.length - 1, Math.round(scrollLeft / clientWidth))));
  };
  const onPhotoKeyDown = (event: KeyboardEvent<HTMLAnchorElement>, index: number): void => {
    const offset = arrowOffset(event);
    if (!hasNavigation || !offset) return;
    event.preventDefault();
    showSlide(index + offset)?.querySelector("a")?.focus({ preventScroll: true });
  };

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
    const offset = arrowOffset(event);
    if (!hasNavigation || !offset) return;
    event.preventDefault();
    move(offset);
  };
  const onClose = (): void => {
    setSelected(null);
    opener.current?.focus({ preventScroll: true });
  };

  if (!photos.length) return null;
  return (
    <>
      <div className="celebration-gallery-carousel">
        <ul ref={track} className="celebration-gallery" role="list" onScroll={onScroll}>
          {photos.map((item, index) => (
            <li key={item.media.id}>
              <a href={item.href} data-link-kind="image" aria-label={item.openLabel}
                onClick={(event) => open(event, index)} onKeyDown={(event) => onPhotoKeyDown(event, index)}>
                <MediaImage media={item.media} alt={item.label} sizes="(min-width: 52rem) 48rem, 100vw" />
                <span className="celebration-gallery-enlarge" aria-hidden="true"><ActionIcon name="search" size={18} />{labels.enlarge}</span>
              </a>
            </li>
          ))}
        </ul>
        {hasNavigation ? (
          <div className="celebration-gallery-toolbar celebration-gallery-navigation">
            <button type="button" aria-label={labels.previous} aria-disabled={currentSlide === 0} onClick={() => showSlide(currentSlide - 1)}>
              <ActionIcon name="back" size={18} /><span>{labels.previous}</span>
            </button>
            <span role="status">{photos[currentSlide]?.label}</span>
            <button type="button" aria-label={labels.next} aria-disabled={currentSlide === photos.length - 1} onClick={() => showSlide(currentSlide + 1)}>
              <span>{labels.next}</span><ActionIcon name="arrow" size={18} />
            </button>
          </div>
        ) : null}
      </div>
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
