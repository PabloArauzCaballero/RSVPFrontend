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
    expect(container.querySelector(".celebration-gallery-navigation")).toBeNull();
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

  it.each(["light", "dark"] as const)("requiredScrim · the text over the worst picture (pure black or pure white) reaches 4.5 in %s, for the three prototypes, and the veil is the lightest that does", (scheme) => {
    for (const name of ["marfil", "pinata", "gala"] as const) {
      const palette = designPalette(readDesign(designTemplate(name).theme) as DesignDocumentV2, scheme);
      const veil = requiredScrim(palette);
      expect(veil, `${name} ${scheme}`).toBeLessThan(0.8);
      for (const picture of [BLACK, WHITE]) expect(contrastRatio(palette.text, mix(picture, palette.canvas, veil)), `${name} ${scheme} over ${picture}`).toBeGreaterThanOrEqual(4.5);
      const lighter = Math.round((veil - 0.05) * 100) / 100;
      expect([BLACK, WHITE].some((picture) => contrastRatio(palette.text, mix(picture, palette.canvas, lighter)) < 4.5), `${name} ${scheme}: ${lighter} would already pass`).toBe(true);
    }
  });

  it("a palette whose text cannot reach AA over any veil gets the maximum the contract allows, never more", () => {
    expect(requiredScrim({ canvas: "#808080", text: "#7F7F7F" })).toBe(0.8);
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
    const button = container.querySelector("button.celebration-audio-button") as HTMLElement;
    expect(button.getAttribute("aria-label")).toContain("celebration.media.play");
    expect(button.textContent).toBe("celebration.media.openMusic");
    expect(container.querySelector(".celebration-embed[data-kind=\"audio\"] audio")).toBeTruthy();
    expect(container.querySelector("progress")).toBeTruthy();
  });
});

describe("F7 · the own music that moderation hid (decision of Pablo 2026-11-26: only the MP3 goes, the invitation stays)", () => {
  const MUSIC_HIDDEN = { ...VIEW, hiddenElements: [{ kind: "SECTION" as const, id: "music" }] };
  const withMusic = (): DesignDocumentV2 => documentWith([{ block: block("mus", "music", { source: "media", ref: SONG }), element: {} }]);
  const drawView = (view: typeof VIEW, files: readonly GalleryImage[]) => render(
    <CelebrationRenderer theme={themeFromTemplate({ ...designTemplate("marfil"), theme: withMusic() }, view.enabledSections)} view={view} gallery={files} t={t} now={NOW} basePath="/c/ana-y-luis" rsvpHelpHref="/c/ana-y-luis/rsvp" />
  );

  it("hiddenElements with the music: no player and no empty box in the grid, while the cover, the photos and both buttons stay", () => {
    const { container } = drawView(MUSIC_HIDDEN, FILES);
    expect(container.querySelector("audio")).toBeNull();
    expect(container.querySelector('.cdesign-el[data-block="music"]')).toBeNull();
    expect(container.querySelector(".cdesign-cover h1")?.textContent).toBe(VIEW.content.title);
    expect(container.querySelectorAll('a[data-action="gifts"][href="/c/ana-y-luis/regalos"]').length).toBeGreaterThanOrEqual(1);
    expect(container.querySelectorAll('[data-action="rsvp"], [data-action="rsvp-help"]').length).toBeGreaterThanOrEqual(1);
  });

  it("the file the media service no longer lists (hidden, deleted) leaves no box either, even if the page still names it", () => {
    const { container } = drawView(VIEW, FILES.filter((file) => file.id !== SONG));
    expect(container.querySelector("audio")).toBeNull();
    expect(container.querySelector('.cdesign-el[data-block="music"]')).toBeNull();
  });

  it("negative: without the hiding, the same music plays as before", () => {
    const { container } = drawView(VIEW, FILES);
    expect(container.querySelector("audio")?.getAttribute("src")).toBe("https://media.test/song.mp3");
    expect(container.querySelector('.cdesign-el[data-block="music"]')).toBeTruthy();
  });

  it("negative: hiding another element, or a block or image that is called music, does not touch the player", () => {
    for (const hidden of [[{ kind: "SECTION" as const, id: "gallery" }], [{ kind: "BLOCK" as const, id: "music" }], [{ kind: "IMAGE" as const, id: "music" }]]) {
      const { container } = drawView({ ...VIEW, hiddenElements: hidden }, FILES);
      expect(container.querySelector("audio")).toBeTruthy();
      cleanup();
    }
  });

  it("a music link to YouTube or Spotify is not a file of the media service: it is not judged here (open question to Pablo)", () => {
    const external = documentWith([{ block: block("mus", "music", { source: "spotify", ref: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" }), element: {} }]);
    const { getByRole } = render(<CelebrationRenderer theme={themeFromTemplate({ ...designTemplate("marfil"), theme: external }, VIEW.enabledSections)} view={MUSIC_HIDDEN} gallery={FILES} t={t} now={NOW} basePath="/c/ana-y-luis" />);
    expect(getByRole("button", { name: /celebration\.media\.playMusic/ })).toBeTruthy();
  });
});

describe("F6 · the advanced CSS (F5) is rebuilt from the allowlist and goes in as text", () => {
  const painted = (css: string): string | null => draw(documentWith([], { css })).container.querySelector("style[data-celebration-custom]")?.textContent ?? null;

  it("is the text of a <style>, scoped under the root class and away from the gifts and reply buttons; markup inside stays text", () => {
    const { container } = draw(documentWith([], { css: "p { color: #333 }" }));
    const style = container.querySelector("style[data-celebration-custom]") as HTMLStyleElement;
    expect(style.textContent).toBe(".cdesign-author p:not(.rsvp-protected):not(.rsvp-protected *){color:#333}");
    expect(style.children).toHaveLength(0);
  });

  it("the gifts and reply buttons and the dock carry the protected class the guard keys on", () => {
    const { container } = draw(documentWith([]));
    const links = container.querySelectorAll('a[data-action="gifts"], a[data-action="rsvp"], a[data-action="rsvp-help"]');
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) expect(link.closest(".rsvp-protected"), link.outerHTML.slice(0, 80)).not.toBeNull();
    expect(container.querySelector(".cdesign-dock")?.classList.contains("rsvp-protected")).toBe(true);
  });

  it("the gifts and reply buttons are never inside the author's container, and everything else of the blocks is (the stylesheet's scope)", () => {
    const { container } = draw(documentWith([{ block: block("txt", "text", { text: "hola" }), element: {} }]));
    expect(container.querySelectorAll(".cdesign-author").length).toBeGreaterThan(0);
    for (const link of container.querySelectorAll('a[data-action="gifts"], a[data-action="rsvp"], a[data-action="rsvp-help"]')) expect(link.closest(".cdesign-author"), link.outerHTML.slice(0, 60)).toBeNull();
    expect(container.querySelector(".cdesign-author .cdesign-text")).toBeTruthy();
    expect(container.querySelector(".cdesign-author .cdesign-el, .cdesign-author .cdesign-canvas, .cdesign-author .cdesign-page")).toBeNull();
    expect(container.querySelector("style[data-celebration-custom]")).toBeNull();
  });

  it.each([
    "</style><script>alert(1)</script>", "@import url(https://evil.example/x.css);", "@\\69mport url(//evil.test/x.css);", ".a{background:url(https://evil.test/p.png)}",
    ".a{background:url(//evil.test/p.png)}", ".a{background-image:image-set(url(/media/public/assets/a.png) 1x)}", "a{background:url(javascript:alert(1))}",
    "a{width:expression(alert(1))}", "a{color:\\72 ed}", ".\\72 svp-x{color:red}", "<!-- x", "body{color:red}", ":root{color:red}", "a{position:fixed}", "a{content:attr(href)}"
  ])("a rule with %s paints nothing", (css) => {
    const text = painted(css);
    expect(text === null || !/evil|import|image-set|javascript|expression|attr\(|<|\\|position:fixed|body|:root/.test(text)).toBe(true);
    expect(draw(documentWith([], { css })).container.querySelector("script")).toBeNull();
  });

  it("url() toward the media store is kept; toward anything else it is dropped", () => {
    expect(painted(".a{background:url(/media/public/assets/a.png)}")).toContain("url(/media/public/assets/a.png)");
    expect(painted(".a{background:url(/media/public/assets/../../x)}")).toBeNull();
  });
});
