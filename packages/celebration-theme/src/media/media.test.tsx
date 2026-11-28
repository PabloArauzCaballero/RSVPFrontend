import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AudioPlayer, EmbedFacade, MediaBackdrop, MediaImage, embedFromConfig, FRAME_HOSTS, frameSrcDirective, isAllowedEmbedUrl, spotifyEmbed, vimeoEmbed, youtubeEmbed, youtubeFromLink, imageSources, clampScrim, clampVeil, type PublicMedia } from "../index.js";
import { BLACK, WHITE, contrastRatio, mix, requiredScrim } from "../design/colour.js";

afterEach(cleanup);

const t = (key: string, values?: Readonly<Record<string, string | number>>): string => `${key}${values ? `|${Object.values(values).join(",")}` : ""}`;
const PHOTO: PublicMedia = { id: "a", width: 2400, height: 1600, purpose: "background", variants: { thumb: "/t.webp", medium: "/m.webp", full: "/f.webp", webp: "/w.webp", thumb_avif: "/t.avif", medium_avif: "/m.avif", full_avif: "/f.avif" } };
const SONG: PublicMedia = { id: "s", width: null, height: null, purpose: "music", durationMs: 125_000, variants: { audio: "/song.mp3" } };

describe("embeds: allowlist", () => {
  it("builds privacy-enhanced embeds from ids and links", () => {
    expect(youtubeEmbed("dQw4w9WgXcQ")?.url).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&playsinline=1");
    expect(youtubeFromLink("https://youtu.be/dQw4w9WgXcQ?t=3")?.url).toContain("youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(youtubeFromLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ")?.provider).toBe("youtube");
    expect(vimeoEmbed("76979871")?.url).toBe("https://player.vimeo.com/video/76979871?dnt=1");
    expect(spotifyEmbed("https://open.spotify.com/intl-es/track/4uLU6hMCjMI75M1A2tKUQC?si=x")?.url).toBe("https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC");
    expect(spotifyEmbed("playlist/37i9dQZF1DXcBWIGoYBM5M")?.url).toBe("https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M");
  });

  it.each([
    "http://youtu.be/dQw4w9WgXcQ", "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ", "https://evil.example/x", "javascript:alert(1)", "data:text/html,<script>1</script>",
    "https://user:pw@youtu.be/dQw4w9WgXcQ", "https://youtu.be:8443/dQw4w9WgXcQ", "https://youtu.be/short", "https://www.youtube.com/playlist?list=PL1", "https://youtu.be/dQw4w9WgXcQ extra", "", "x".repeat(400)
  ])("refuses %s", (raw) => {
    expect(youtubeFromLink(raw)).toBeNull();
    expect(spotifyEmbed(raw)).toBeNull();
  });

  it("SoundCloud is not a provider: its links and its source never produce an embed", () => {
    expect(spotifyEmbed("https://soundcloud.com/artista/tema-1")).toBeNull();
    expect(youtubeFromLink("https://soundcloud.com/artista/tema-1")).toBeNull();
    expect(embedFromConfig("music", { source: "soundcloud", ref: "https://soundcloud.com/artista/tema-1" })).toBeNull();
    expect(isAllowedEmbedUrl("https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fartista%2Ftema-1")).toBe(false);
    expect(FRAME_HOSTS).not.toContain("w.soundcloud.com");
  });

  it("a hostile id never reaches a URL", () => {
    for (const id of ["../../x", "abc\"onload=\"x", "dQw4w9WgXcQ&autoplay=1", "dQw4w9WgXcQ/../x", "a".repeat(40)]) expect(youtubeEmbed(id)).toBeNull();
    for (const id of ["abc", "1234567890123456789", "12345?x=1"]) expect(vimeoEmbed(id)).toBeNull();
  });

  it("isAllowedEmbedUrl accepts only https on the listed hosts", () => {
    for (const host of FRAME_HOSTS) expect(isAllowedEmbedUrl(`https://${host}/x`)).toBe(true);
    for (const url of ["http://www.youtube-nocookie.com/x", "https://www.youtube.com/embed/x", "https://evil.example/", "https://www.youtube-nocookie.com.evil.example/", "https://www.google.com/maps?q=x&output=embed", "https://u@open.spotify.com/", "https://open.spotify.com:444/", "not a url"]) expect(isAllowedEmbedUrl(url)).toBe(false);
  });

  it("block configs map to embeds and unknown shapes to nothing", () => {
    expect(embedFromConfig("video", { provider: "youtube", videoId: "dQw4w9WgXcQ" })?.kind).toBe("video");
    expect(embedFromConfig("video", { provider: "tiktok", videoId: "x" })).toBeNull();
    expect(embedFromConfig("music", { source: "spotify", ref: "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC" })?.kind).toBe("audio");
    expect(embedFromConfig("music", { source: "youtube", ref: "https://evil.example/watch?v=dQw4w9WgXcQ" })).toBeNull();
    expect(embedFromConfig("music", { source: "media", ref: "uuid" })).toBeNull();
    // Locations are never an iframe: they are drawn by LocationView (OpenStreetMap), so no map kind exists here.
    expect(embedFromConfig("map" as never, { venueIndex: 0 })).toBeNull();
  });

  it("seo-web's CSP frame-src is exactly this allowlist", () => {
    const config = readFileSync(resolve(__dirname, "../../../../apps/seo-web/next.config.js"), "utf8");
    const hosts = /const frameHosts = \[([^\]]+)\]/.exec(config)?.[1]?.split(",").map((item) => item.trim().replace(/'/g, "")) ?? [];
    expect(hosts).toEqual([...FRAME_HOSTS]);
    expect(config).toContain("${frameSrc}");
    expect(frameSrcDirective()).toBe("frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://open.spotify.com");
    expect(FRAME_HOSTS).not.toContain("www.google.com");
  });
});

describe("EmbedFacade", () => {
  const embed = youtubeEmbed("dQw4w9WgXcQ");

  it("renders no iframe and requests nothing from the provider until the guest taps", () => {
    const html = renderToStaticMarkup(<EmbedFacade embed={embed} title="Nuestro video" t={t} />);
    expect(html).not.toContain("<iframe");
    expect(html).not.toMatch(/https?:\/\//);
    expect(html).toContain("celebration.media.playVideo");
    expect(html).toContain("celebration.media.privacy|YouTube");
  });

  it("taps once: a sandboxed, lazy iframe on the nocookie host", () => {
    const onLoad = vi.fn();
    render(<EmbedFacade embed={embed} title="Nuestro video" t={t} onLoad={onLoad} />);
    fireEvent.click(screen.getByRole("button"));
    const frame = document.querySelector("iframe");
    expect(frame?.getAttribute("src")).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
    expect(frame?.getAttribute("sandbox")).toBe("allow-scripts allow-same-origin allow-presentation");
    expect(frame?.getAttribute("loading")).toBe("lazy");
    expect(frame?.getAttribute("referrerpolicy")).toBe("strict-origin-when-cross-origin");
    expect(frame?.getAttribute("title")).toBe("Nuestro video");
    expect(frame?.hasAttribute("allow") && frame.getAttribute("allow")).not.toContain("autoplay");
    expect(onLoad).toHaveBeenCalledTimes(1);
  });

  it("the facade button is a 44px-class real button with an accessible name", () => {
    render(<EmbedFacade embed={spotifyEmbed("track/4uLU6hMCjMI75M1A2tKUQC")} title="Nuestra canción" t={t} />);
    const button = screen.getByRole("button", { name: /celebration\.media\.playMusic/ });
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
  });

  it("an embed that was tampered with to point off the list renders nothing", () => {
    const tampered = { ...embed!, url: "https://evil.example/embed/x" };
    expect(renderToStaticMarkup(<EmbedFacade embed={tampered} title="x" t={t} />)).toBe("");
    expect(renderToStaticMarkup(<EmbedFacade embed={null} title="x" t={t} />)).toBe("");
  });

  it("a poster of the host's own is shown before the tap", () => {
    expect(renderToStaticMarkup(<EmbedFacade embed={embed} title="v" t={t} poster={PHOTO} />)).toContain('src="/m.webp"');
  });
});

describe("AudioPlayer", () => {
  it("never autoplays and downloads nothing before the guest presses play", () => {
    const html = renderToStaticMarkup(<AudioPlayer media={SONG} title="Vals" t={t} />);
    expect(html).toContain('preload="none"');
    expect(html).not.toContain("autoplay");
    expect(html).not.toContain("autoPlay");
    expect(html).toContain("celebration.media.play|Vals");
    expect(html).toContain("<span>celebration.media.playShort</span>");
  });

  it("a toggle whose label changes does not also say it is pressed", () => {
    expect(renderToStaticMarkup(<AudioPlayer media={SONG} title="Vals" t={t} />)).not.toContain("aria-pressed");
  });

  it("plays on press, pauses on the second press, and only one player plays at a time", async () => {
    const plays: HTMLAudioElement[] = [];
    const pauses: HTMLAudioElement[] = [];
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLAudioElement) { plays.push(this); this.dispatchEvent(new Event("play")); return Promise.resolve(); });
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLAudioElement) { pauses.push(this); this.dispatchEvent(new Event("pause")); });
    render(<><AudioPlayer media={SONG} title="Uno" t={t} /><AudioPlayer media={{ ...SONG, id: "s2" }} title="Dos" t={t} /></>);
    const [one, two] = screen.getAllByRole("button");
    fireEvent.click(one!);
    expect(await screen.findByRole("button", { name: "celebration.media.pause|Uno" })).toBeTruthy();
    fireEvent.click(two!);
    expect(pauses).toHaveLength(1);
    expect(plays).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "celebration.media.pause|Dos" }));
    expect(pauses).toHaveLength(2);
    vi.restoreAllMocks();
  });

  it("shows the length and an error message when the file cannot play", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("blocked"));
    render(<AudioPlayer media={SONG} title="Vals" t={t} />);
    expect(screen.getByText("0:00 / 2:05")).toBeTruthy();
    fireEvent.click(screen.getByRole("button"));
    expect((await screen.findByRole("alert")).textContent).toBe("celebration.media.audioError");
    vi.restoreAllMocks();
  });

  it("renders nothing for a song that has no audio variant", () => {
    expect(renderToStaticMarkup(<AudioPlayer media={{ ...SONG, variants: {} }} title="x" t={t} />)).toBe("");
  });
});

describe("MediaImage and MediaBackground", () => {
  it("serves AVIF, then WebP, then a medium fallback, with reserved space and lazy loading", () => {
    const html = renderToStaticMarkup(<MediaImage media={PHOTO} alt="Los novios" />);
    expect(html.indexOf('type="image/avif"')).toBeLessThan(html.indexOf('type="image/webp"'));
    expect(html).toContain("/t.avif 320w, /m.avif 960w, /f.avif 1920w");
    expect(html).toContain('src="/m.webp"');
    expect(html).toContain('width="2400"');
    expect(html).toContain('height="1600"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('alt="Los novios"');
  });

  it("the first picture is eager with high priority", () => {
    const html = renderToStaticMarkup(<MediaImage media={PHOTO} alt="" priority />);
    expect(html).toContain('loading="eager"');
    expect(html.toLowerCase()).toContain('fetchpriority="high"');
  });

  it("a vector drawing is one img, with no picture element", () => {
    const html = renderToStaticMarkup(<MediaImage media={{ id: "v", width: null, height: null, variants: { svg: "/d.svg" } }} alt="" />);
    expect(html).toContain('src="/d.svg"');
    expect(html).not.toContain("<picture");
  });

  it("a file without any image renders nothing", () => {
    expect(renderToStaticMarkup(<MediaImage media={SONG} alt="" />)).toBe("");
  });

  it("the veil is never a fixed default: MediaBackdrop takes the opacity per scheme the palette needs, clamped to the strongest veil the renderer paints (MAX_TEXT_VEIL = .85, the graded veil of contract 1.8.0: above the 0.8 a document may ask for, never above the contract)", () => {
    const html = renderToStaticMarkup(<MediaBackdrop media={PHOTO} light={0.35} dark={5} />);
    expect(html).toContain("--cd-veil-l:35%");
    expect(html).toContain("--cd-veil-d:85%");
    expect(renderToStaticMarkup(<MediaBackdrop media={PHOTO} light={0.85} dark={0.85} />)).toContain("--cd-veil-l:85%");
    expect(html).toContain('aria-hidden="true"');
    expect(renderToStaticMarkup(<MediaBackdrop media={SONG} light={0.4} dark={0.4} />)).toBe("");
    expect(clampVeil(0.95)).toBe(0.85);
    expect(clampVeil(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampScrim(0.95)).toBe(0.8);
    expect(clampScrim(-1)).toBe(0);
    expect(clampScrim(Number.NaN)).toBe(0);
  });

  it.each(["light", "dark"] as const)("text over the worst photo (pure black and pure white) reaches 4.5:1 with the veil the palette needs, %s, for ink on canvas pairs a fixed 40% cannot serve", (scheme) => {
    const palettes = scheme === "light" ? [{ canvas: "#FFFFFF", text: "#000000" }, { canvas: "#F4EFE6", text: "#2B2B2B" }] : [{ canvas: "#000000", text: "#FFFFFF" }, { canvas: "#14161A", text: "#E6E1D8" }];
    for (const palette of palettes) {
      const veil = requiredScrim(palette);
      for (const picture of [BLACK, WHITE]) expect(contrastRatio(palette.text, mix(picture, palette.canvas, veil)), `${palette.canvas}/${palette.text} over ${picture}`).toBeGreaterThanOrEqual(4.5);
      // The fixed 40% of the first version fails at least one of the two photos for these pairs: that is why it is gone.
      expect([BLACK, WHITE].some((picture) => contrastRatio(palette.text, mix(picture, palette.canvas, 0.4)) < 4.5)).toBe(true);
    }
  });

  it("imageSources reads only the variants that exist", () => {
    expect(imageSources({ id: "x", width: 1, height: 1, variants: { webp: "/w.webp" } })).toEqual({ avif: "", webp: "", fallback: "/w.webp", svg: null });
  });
});

describe("reduced motion", () => {
  it("the player has no animated meter and the facade button drops its transition", () => {
    const css = readFileSync(resolve(__dirname, "../../styles.css"), "utf8");
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.celebration-embed-play, \.celebration-audio-button \{ transition: none; \} \}/);
    expect(css).not.toMatch(/@keyframes[^}]*audio/);
  });
});

describe("styles of F6", () => {
  const css = readFileSync(resolve(__dirname, "../../styles.css"), "utf8");

  it("the veil has ONE definition and no literal 40 % fallback: a missing value falls to the contract's maximum, never to a thinner veil", () => {
    // One base rule (light) and its two dark-scheme switches (system and forced); nothing else paints a veil.
    expect(css.match(/\.celebration-media-veil\s*\{[^}]*background/g)?.length).toBe(3);
    expect(css.match(/var\(--cd-veil-l,/g)?.length).toBe(1);
    expect(css.match(/var\(--cd-veil-d,/g)?.length).toBe(2);
    expect(css).not.toMatch(/--celebration-scrim/);
    expect(css).not.toMatch(/--cd-veil-[ld],\s*40%/);
    expect(css.match(/var\(--cd-veil-[ld], 80%\)/g)?.length).toBe(3);
  });

  it.each([{ canvas: "#FFFFFF", text: "#2B2622", surface: "#FFFFFF" }, { canvas: "#141218", text: "#ECE6EE", surface: "#1E1C22" }])("the progress track's edge reaches 3:1 against the card, $surface", ({ text, surface }) => {
    const rule = css.match(/\.celebration-audio-progress \{[^}]*border: 1px solid color-mix\(in srgb, var\(--celebration-text\) (\d+)%, var\(--celebration-surface\)\)/);
    expect(rule).not.toBeNull();
    const edge = mix(text, surface, 1 - Number(rule?.[1]) / 100);
    expect(contrastRatio(edge, surface)).toBeGreaterThanOrEqual(3);
  });

  it("over a photo the monogram takes the text ink, the one the veil is sized for, not the accent", () => {
    expect(css).toMatch(/\.cdesign-el\[data-bg-media\]\) \.cdesign-monogram \{ color: var\(--celebration-text\); \}/);
  });

  it("each link of the section nav is at least 44 x 44 (a short word such as «Inicio» measured 42 wide)", () => {
    expect(css).toMatch(/\.celebration-nav a \{ min-height: 44px; min-width: 44px;/);
  });

  it("the card sizes its padding inside its width (box-sizing)", () => {
    expect(css).toMatch(/\.celebration-embed \{ box-sizing: border-box;/);
  });
});
