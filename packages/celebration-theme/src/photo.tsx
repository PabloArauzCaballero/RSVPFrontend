"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes, type ReactNode } from "react";
import { InvitationArt } from "./art/render.js";
import { drawingById } from "./art/library.js";

/**
 * A photo of the celebration that never leaves a broken hole (F4 b, state «photo failed»). While it loads or when it works it is a
 * plain `<img>` with exactly the attributes it was given, so the server markup is the same as before. If the file does not load
 * (a deleted or blocked upload, a lost connection) it is replaced by a box of the same class and proportions on the palette's
 * surface with the camera drawing in the template's ink, so the layout keeps its place and the page still looks designed.
 * With `sources` (F6: AVIF and WebP) the image sits in a `<picture>`. An image that failed before the page was hydrated is caught by checking `complete` once mounted: `error` is not replayed.
 */
export function Photo(props: ImgHTMLAttributes<HTMLImageElement> & { readonly alt: string; readonly sources?: ReactNode }): ReactNode {
  const { sources, ...imgProps } = props;
  const { alt, width, height, className, src } = imgProps;
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    setFailed(false);
    const image = ref.current;
    if (image && image.complete && image.naturalWidth === 0 && image.currentSrc !== "") setFailed(true);
  }, [src]);
  if (failed) {
    // A picture behind the page or an element is decoration (no name): when it is gone (deleted, hidden by moderation: 404) the page keeps its own ground, not a camera drawn behind the text.
    const decorativeBackground = !alt && /background-image/.test(className ?? "");
    const drawing = decorativeBackground ? undefined : drawingById("camara");
    const ratio = typeof width === "number" && typeof height === "number" && width > 0 && height > 0 ? `${width} / ${height}` : undefined;
    return (
      <span className={className} data-photo-failed="" role={alt ? "img" : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true} style={ratio ? { aspectRatio: ratio } : undefined}>
        {drawing ? <InvitationArt drawing={drawing} className="celebration-photo-art" /> : null}
      </span>
    );
  }
  const image = <img ref={ref} {...imgProps} onError={() => setFailed(true)} />;
  // F6: AVIF and WebP sources go in a <picture>; when the file fails, the whole picture is replaced by the box above.
  return sources ? <picture>{sources}{image}</picture> : image;
}
