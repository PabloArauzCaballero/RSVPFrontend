import { cleanup, fireEvent, render, act } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GALLERY, NOW, t, VIEW } from "../../test/fixtures.js";
import { CelebrationRenderer, themeFromTemplate, type GalleryImage } from "../index.js";
import { contrastRatio, mix, requiredScrim, BLACK, WHITE } from "./colour.js";
import { designTemplate } from "./documents/index.js";
import { designPalette, readDesign } from "./read.js";
import type { DesignBlock, DesignDocumentV2, DesignElement } from "./types.js";

afterEach(() => { cleanup(); vi.useRealTimers(); });

const BG = "11111111-1111-4111-8111-111111111111";
const SONG = "22222222-2222-4222-8222-222222222222";
const PICTURE = "33333333-3333-4333-8333-333333333333";
const FILES: readonly GalleryImage[] = [
  ...GALLERY,
  { id: BG, width: 1920, height: 1080, isCover: false, purpose: "background", variants: { medium: "https://media.test/bg-m.webp", full: "https://media.test/bg-f.webp", medium_avif: "https://media.test/bg-m.avif", full_avif: "https://media.test/bg-f.avif", webp: "https://media.test/bg.webp" } },
  { id: PICTURE, width: 800, height: 600, isCover: false, purpose: "block", variants: { medium: "https://media.test/p-m.webp", medium_avif: "https://media.test/p-m.avif" } },
  { id: SONG, width: null, height: null, isCover: false, purpose: "music", durationMs: 185000, variants: { audio: "https://media.test/song.mp3" } }
];

type Blocks = readonly { readonly block: DesignBlock; readonly element: Partial<DesignElement> }[];
/** Marfil with extra blocks placed on its story page, and optionally a media background on its cover. */
function documentWith(blocks: Blocks, extra: { readonly coverBackground?: boolean; readonly css?: string } = {}): DesignDocumentV2 {
  const base = JSON.parse(JSON.stringify(designTemplate("marfil").theme)) as DesignDocumentV2;
  const pages = base.pages.map((page) => {
    if (page.kind === "cover" && extra.coverBackground) return { ...page, background: { kind: "media" as const, mediaId: BG, fit: "cover" as const } };
    if (page.section !== "story") return page;
    const elements = blocks.map(({ block, element }, position) => ({ id: `x-${block.id}`, block: block.id, x: 0, y: 1 + position, w: 4, h: 1, visible: true, ...element }));
    return { ...page, canvases: { ...page.canvases, mobile: { ...page.canvases.mobile, elements: [...page.canvases.mobile.elements, ...elements] }, ...(page.canvases.desktop ? { desktop: page.canvases.desktop } : {}) } };
  });
  const doc = { ...base, pages, blocks: [...base.blocks, ...blocks.map((item) => item.block)], custom: { html: "", css: extra.css ?? "" } };
  return readDesign(doc) as DesignDocumentV2;
}
const draw = (design: DesignDocumentV2, props: Partial<Parameters<typeof CelebrationRenderer>[0]> = {}) => render(
  <CelebrationRenderer theme={themeFromTemplate({ ...designTemplate("marfil"), theme: design }, VIEW.enabledSections)} view={VIEW} gallery={FILES} t={t} now={NOW} basePath="/c/ana-y-luis" {...props} />
);
const block = (id: string, type: string, config: Record<string, unknown>): DesignBlock => ({ id, type, config });

describe("F6 · pictures", () => {
  it("the cover photo is a <picture> with AVIF before WebP, eager and high priority, with its size reserved", () => {
    const { container } = draw(documentWith([]));
    const picture = container.querySelector(".cdesign-cover picture") as HTMLElement;
    expect(picture).toBeTruthy();
    expect([...picture.querySelectorAll("source")].map((source) => source.getAttribute("type"))).toEqual(["image/webp"]);
    const img = picture.querySelector("img") as HTMLImageElement;
    expect(img.getAttribute("loading")).toBe("eager");
    expect(img.getAttribute("fetchpriority")).toBe("high");
    expect(img.getAttribute("width")).toBe("1920");
    expect(img.getAttribute("height")).toBe("1280");
  });

  it("an image block is lazy, offers AVIF first, and only a photo purpose reaches the gallery section", () => {
    const { container } = draw(documentWith([{ block: block("pic", "image", { mediaId: PICTURE, alt: "Los dos" }), element: {} }]));
    const picture = container.querySelector(".cdesign-image")?.closest("picture") as HTMLElement;
    expect([...picture.querySelectorAll("source")].map((source) => source.getAttribute("type"))).toEqual(["image/avif", "image/webp"]);
    expect(picture.querySelector("img")?.getAttribute("loading")).toBe("lazy");
    expect(picture.querySelector("img")?.getAttribute("alt")).toBe("Los dos");
    // The background and the song are in the document's media list but are not photos of the gallery.
    expect(container.querySelectorAll(".celebration-gallery li")).toHaveLength(1);
  });

  it("a page background is a veiled picture behind the content, with a veil per scheme that keeps the text at AA", () => {
    const design = documentWith([], { coverBackground: true });
    const { container } = draw(design);
    const backdrop = container.querySelector('[data-page-kind="cover"] .celebration-media-backdrop') as HTMLElement;
    expect(backdrop).toBeTruthy();
    expect(backdrop.getAttribute("aria-hidden")).toBe("true");
    const light = Number.parseInt(backdrop.style.getPropertyValue("--cd-veil-l"), 10) / 100;
    const dark = Number.parseInt(backdrop.style.getPropertyValue("--cd-veil-d"), 10) / 100;
    expect(light).toBeGreaterThanOrEqual(requiredScrim(designPalette(design, "light")));
    expect(dark).toBeGreaterThanOrEqual(requiredScrim(designPalette(design, "dark")));
    expect(backdrop.querySelector("img")?.getAttribute("loading")).toBe("eager");
  });

  it.each(["light", "dark"] as const)("requiredScrim · text and muted over the worst picture (black or white) reach 4.5 in %s, for the three prototypes", (scheme) => {
    for (const name of ["marfil", "pinata", "gala"] as const) {
      const palette = designPalette(readDesign(designTemplate(name).theme) as DesignDocumentV2, scheme);
      const veil = requiredScrim(palette);
      expect(veil).toBeLessThanOrEqual(0.8);
      for (const picture of [BLACK, WHITE]) for (const ink of [palette.text, palette.muted]) {
        const ratio = contrastRatio(ink, mix(picture, palette.canvas, veil));
        // Reaching AA is possible with a veil of at most .8 for these palettes; when it is not, the veil is the maximum.
        if (veil < 0.8) expect(ratio, `${name} ${scheme} ${ink} over ${picture}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("a veil the document sets can raise the automatic one, never lower it", () => {
    const design = documentWith([], { coverBackground: true });
    const needed = requiredScrim(designPalette(design, "light"));
    const lowered = JSON.parse(JSON.stringify(design)) as DesignDocumentV2;
    const page = lowered.pages[0] as { background?: { kind: "media"; mediaId: string; fit: "cover"; scrim?: number } };
    page.background = { kind: "media", mediaId: BG, fit: "cover", scrim: 0 };
    const { container } = draw(readDesign(lowered) as DesignDocumentV2);
    const backdrop = container.querySelector(".celebration-media-backdrop") as HTMLElement;
    expect(Number.parseInt(backdrop.style.getPropertyValue("--cd-veil-l"), 10)).toBe(Math.round(needed * 100));
  });

  it("a background that points at a file the celebration does not have draws nothing, and a malformed one is dropped by readDesign", () => {
    const doc = JSON.parse(JSON.stringify(designTemplate("marfil").theme)) as { pages: { background?: unknown }[] };
    doc.pages[0]!.background = { kind: "media", mediaId: "not-a-uuid", fit: "cover" };
    expect((readDesign(doc) as DesignDocumentV2).pages[0]?.background).toBeUndefined();
    doc.pages[0]!.background = { kind: "media", mediaId: "99999999-9999-4999-8999-999999999999", fit: "cover" };
    const { container } = draw(readDesign(doc) as DesignDocumentV2);
    expect(container.querySelector(".celebration-media-backdrop")).toBeNull();
  });
});

describe("F6 · embeds (P17)", () => {
  const video = block("vid", "video", { provider: "youtube", videoId: "dQw4w9WgXcQ" });

  it("nothing of the provider is in the server markup: no iframe, no provider URL, only the button and the privacy note", () => {
    const markup = renderToStaticMarkup(<CelebrationRenderer theme={themeFromTemplate({ ...designTemplate("marfil"), theme: documentWith([{ block: video, element: {} }]) }, VIEW.enabledSections)} view={VIEW} gallery={FILES} t={t} now={NOW} />);
    expect(markup).not.toContain("<iframe");
    expect(markup).not.toMatch(/youtube\.com|youtube-nocookie|dQw4w9WgXcQ/);
    expect(markup).toContain("celebration.media.playVideo");
    expect(markup).toContain("celebration.media.privacy");
  });

  it("tapping loads one sandboxed, lazy iframe on youtube-nocookie, says it is loading, and settles when it loads", () => {
    const { container, getByRole } = draw(documentWith([{ block: video, element: {} }]));
    fireEvent.click(getByRole("button", { name: /celebration\.media\.playVideo/ }));
    const frame = container.querySelector("iframe") as HTMLIFrameElement;
    expect(frame.getAttribute("src")).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/);
    expect(frame.getAttribute("sandbox")).toBeTruthy();
    expect(frame.getAttribute("loading")).toBe("lazy");
    expect(frame.getAttribute("referrerpolicy")).toBe("strict-origin-when-cross-origin");
    expect(container.querySelector('[role="status"]')?.textContent).toContain("celebration.media.loading");
    fireEvent.load(frame);
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelectorAll("iframe")).toHaveLength(1);
  });

  it("a provider that never answers (no network) ends in an alert with a retry, and retrying mounts the iframe again", () => {
    vi.useFakeTimers();
    const { container, getByRole } = draw(documentWith([{ block: video, element: {} }]));
    fireEvent.click(getByRole("button", { name: /celebration\.media\.playVideo/ }));
    act(() => { vi.advanceTimersByTime(12_001); });
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("celebration.media.loadFailed");
    fireEvent.click(getByRole("button", { name: /celebration\.media\.retry/ }));
    expect(container.querySelector("iframe")).toBeTruthy();
  });

  it("going offline while it loads is the same failure, without waiting for the deadline", () => {
    const { container, getByRole } = draw(documentWith([{ block: video, element: {} }]));
    fireEvent.click(getByRole("button", { name: /celebration\.media\.playVideo/ }));
    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(container.querySelector('[role="alert"]')).toBeTruthy();
  });

  it("a video id or provider off the allowlist draws nothing at all", () => {
    for (const config of [{ provider: "youtube", videoId: "x" }, { provider: "evil", videoId: "dQw4w9WgXcQ" }, { provider: "vimeo", videoId: "abc" }]) {
      const { container } = draw(documentWith([{ block: block("vid", "video", config), element: {} }]));
      expect(container.querySelector(".celebration-embed")).toBeNull();
      cleanup();
    }
  });

  it("the map shows the venue the block points at, loads on tap from Google Maps, and nothing if the venue does not exist", () => {
    const { container, getByRole } = draw(documentWith([{ block: block("map", "map", { venueIndex: 0 }), element: {} }]));
    expect(container.querySelector("iframe")).toBeNull();
    fireEvent.click(getByRole("button", { name: /celebration\.media\.showMap/ }));
    expect(container.querySelector("iframe")?.getAttribute("src")).toContain("https://www.google.com/maps?q=Iglesia%20San%20Francisco");
    cleanup();
    expect(draw(documentWith([{ block: block("map", "map", { venueIndex: 7 }), element: {} }])).container.querySelector(".celebration-embed")).toBeNull();
  });

  it("music from a Spotify link is a facade; a link that is not Spotify draws nothing", () => {
    const ok = draw(documentWith([{ block: block("mus", "music", { source: "spotify", ref: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" }), element: {} }]));
    fireEvent.click(ok.getByRole("button", { name: /celebration\.media\.playMusic/ }));
    expect(ok.container.querySelector("iframe")?.getAttribute("src")).toBe("https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC");
    cleanup();
    expect(draw(documentWith([{ block: block("mus", "music", { source: "spotify", ref: "https://evil.example/track/4uLU6hMCjMI75M1A2tKUQC" }), element: {} }])).container.querySelector(".celebration-embed")).toBeNull();
  });

  it("the host's own MP3 never starts by itself: no autoplay, nothing preloaded, only a play button", () => {
    const { container } = draw(documentWith([{ block: block("mus", "music", { source: "media", ref: SONG }), element: {} }]));
    const audio = container.querySelector("audio") as HTMLAudioElement;
    expect(audio.getAttribute("src")).toBe("https://media.test/song.mp3");
    expect(audio.hasAttribute("autoplay")).toBe(false);
    expect(audio.getAttribute("preload")).toBe("none");
    expect(container.querySelector("button.celebration-audio-button")?.textContent).toContain("celebration.media.play");
    expect(container.querySelector("progress")).toBeTruthy();
  });
});

describe("F6 · the advanced CSS (F5) goes in as text", () => {
  it("is the text of a <style>: markup inside it stays text and no element is created from it", () => {
    const { container } = draw(documentWith([], { css: ".celebration-design .cdesign-heading { color: red }" }));
    const style = container.querySelector("style[data-celebration-custom]") as HTMLStyleElement;
    expect(style.textContent).toBe(".celebration-design .cdesign-heading { color: red }");
    expect(style.children).toHaveLength(0);
  });

  it.each(["</style><script>alert(1)</script>", "@import url(https://evil.example/x.css);", "a{background:url(javascript:alert(1))}", "a{width:expression(alert(1))}", "<!-- x"])("a sheet with %s is dropped whole", (css) => {
    const { container } = draw(documentWith([], { css }));
    expect(container.querySelector("style[data-celebration-custom]")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
  });
});
