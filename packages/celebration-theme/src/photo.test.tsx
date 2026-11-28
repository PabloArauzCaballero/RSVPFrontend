// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Photo } from "./photo.js";

afterEach(cleanup);

/** A file the media service answers 404 for (hidden by moderation, deleted, or a stale link in a cached gallery) must never leave a broken hole. */
describe("Photo · a file that answers 404", () => {
  it("a named photo becomes the box with the camera drawing, keeps its proportions and its name", () => {
    const { container } = render(<Photo src="/media/public/assets/a/medium" alt="Foto del brindis" width={800} height={600} className="celebration-media-image" />);
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    const box = container.querySelector("[data-photo-failed]") as HTMLElement;
    expect(container.querySelector("img")).toBeNull();
    expect(box.getAttribute("role")).toBe("img");
    expect(box.getAttribute("aria-label")).toBe("Foto del brindis");
    expect(box.style.aspectRatio).toBe("800 / 600");
    expect(box.querySelector('svg[data-art="camara"]')).toBeTruthy();
  });

  it("a decorative background that is gone keeps the box (no layout jump) but draws no camera behind the text and is hidden from assistive technology", () => {
    const { container } = render(<Photo src="/media/public/assets/b/full" alt="" className="celebration-media-image celebration-media-background-image" />);
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    const box = container.querySelector("[data-photo-failed]") as HTMLElement;
    expect(box.getAttribute("aria-hidden")).toBe("true");
    expect(box.querySelector("svg")).toBeNull();
  });

  it("a decorative picture that is not a background (a cover, an element) still shows the drawing", () => {
    const { container } = render(<Photo src="/media/public/assets/c/full" alt="" className="cdesign-cover-photo" />);
    fireEvent.error(container.querySelector("img") as HTMLImageElement);
    expect(container.querySelector('[data-photo-failed] svg[data-art="camara"]')).toBeTruthy();
  });

  it("negative: a photo that loads is the plain image", () => {
    const { container } = render(<Photo src="/media/public/assets/d/medium" alt="Foto" className="celebration-media-image" />);
    expect(container.querySelector("img")).toBeTruthy();
    expect(container.querySelector("[data-photo-failed]")).toBeNull();
  });
});
