/** Embeds of the public invitation (F6, P17). The document never carries a URL a renderer could put in an iframe as is:
 *  it carries a provider and an id, or a link that is parsed here and rebuilt on a fixed host. Anything off the list
 *  yields `null` and the block simply does not render. The server checks the same list when the host saves the link
 *  (POST /media/embeds/resolve); this is the second lock, and the CSP `frame-src` of seo-web is the third. */
export type EmbedProvider = "youtube" | "vimeo" | "spotify" | "google_maps";
export type EmbedKind = "video" | "audio" | "map";

/** The only hosts an iframe of the invitation may load. `apps/seo-web/next.config.js` repeats this list in `frame-src`; a test keeps them equal. */
export const FRAME_HOSTS = ["www.youtube-nocookie.com", "player.vimeo.com", "open.spotify.com", "www.google.com"] as const;

export interface Embed {
  readonly provider: EmbedProvider;
  readonly kind: EmbedKind;
  readonly url: string;
  /** Provider name for the privacy note ("se cargará contenido de YouTube"). */
  readonly label: string;
  readonly sandbox: string;
  readonly allow: string;
}

const LABELS: Readonly<Record<EmbedProvider, string>> = { youtube: "YouTube", vimeo: "Vimeo", spotify: "Spotify", google_maps: "Google Maps" };
const KINDS: Readonly<Record<EmbedProvider, EmbedKind>> = { youtube: "video", vimeo: "video", spotify: "audio", google_maps: "map" };
const SANDBOX = "allow-scripts allow-same-origin allow-presentation";
const ALLOW: Readonly<Record<EmbedProvider, string>> = {
  youtube: "encrypted-media; picture-in-picture; fullscreen", vimeo: "picture-in-picture; fullscreen", spotify: "encrypted-media", google_maps: ""
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{5,12}$/;
const SPOTIFY_REF = /^(track|album|playlist|episode|show|artist)\/[A-Za-z0-9]{10,64}$/;
const SPOTIFY_PATH = /^\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{10,64})\/?$/;
const PLACE = /^[^<>"'`\\{}|^]{1,200}$/u;
/** Control characters, space and anything past ASCII: none belongs in a link the guest's browser will follow. */
const hasControl = (text: string): boolean => [...text].some((char) => (char.codePointAt(0) ?? 0) < 0x20);
const hasUnsafeCharacter = (text: string): boolean => [...text].some((char) => (char.codePointAt(0) ?? 0) <= 0x20 || (char.codePointAt(0) ?? 0) >= 0x7f);
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com", "youtu.be"]);
const MAX_LINK = 300;

const make = (provider: EmbedProvider, url: string): Embed => ({ provider, kind: KINDS[provider], url, label: LABELS[provider], sandbox: SANDBOX, allow: ALLOW[provider] });

/** True only for an https URL with no credentials or port on one of FRAME_HOSTS. */
export function isAllowedEmbedUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && (FRAME_HOSTS as readonly string[]).includes(url.hostname);
  } catch {
    return false;
  }
}

function link(raw: string): URL | null {
  if (raw.length > MAX_LINK || hasUnsafeCharacter(raw)) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !url.username && !url.password && !url.port ? url : null;
  } catch {
    return null;
  }
}

export function youtubeEmbed(videoId: string): Embed | null {
  return YOUTUBE_ID.test(videoId) ? make("youtube", `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`) : null;
}

export function vimeoEmbed(videoId: string): Embed | null {
  return VIMEO_ID.test(videoId) ? make("vimeo", `https://player.vimeo.com/video/${videoId}?dnt=1`) : null;
}

/** A YouTube link (watch, youtu.be, embed, shorts) to its embed. */
export function youtubeFromLink(raw: string): Embed | null {
  const url = link(raw);
  if (!url || !YOUTUBE_HOSTS.has(url.hostname)) return null;
  const segments = url.pathname.split("/").filter(Boolean);
  let id: string | undefined;
  if (url.hostname === "youtu.be") id = segments.length === 1 ? segments[0] : undefined;
  else if (segments[0] === "watch") id = url.searchParams.get("v") ?? undefined;
  else if (segments.length === 2 && ["embed", "shorts", "live", "v"].includes(segments[0] ?? "")) id = segments[1];
  return id ? youtubeEmbed(id) : null;
}

/** A Spotify link, or the `kind/id` the server returns as `ref`. */
export function spotifyEmbed(linkOrRef: string): Embed | null {
  let ref: string | null = SPOTIFY_REF.test(linkOrRef) ? linkOrRef : null;
  if (!ref) {
    const url = link(linkOrRef);
    const match = url && url.hostname === "open.spotify.com" ? SPOTIFY_PATH.exec(url.pathname) : null;
    ref = match ? `${match[1]}/${match[2]}` : null;
  }
  return ref ? make("spotify", `https://open.spotify.com/embed/${ref}`) : null;
}

/** The map of a venue: `query` is its name and address, or "lat,lng". Loaded only when the guest taps. */
export function mapEmbed(query: string): Embed | null {
  const place = query.trim();
  return !hasControl(place) && PLACE.test(place) ? make("google_maps", `https://www.google.com/maps?q=${encodeURIComponent(place)}&output=embed`) : null;
}

/** Block config of the design document → embed. Any shape it does not know is `null`. */
export function embedFromConfig(type: "video" | "music" | "map", config: Readonly<Record<string, unknown>>, venueQuery?: string): Embed | null {
  const text = (key: string): string => (typeof config[key] === "string" ? (config[key] as string) : "");
  let embed: Embed | null = null;
  if (type === "video") embed = config["provider"] === "youtube" ? youtubeEmbed(text("videoId")) : config["provider"] === "vimeo" ? vimeoEmbed(text("videoId")) : null;
  else if (type === "music") embed = config["source"] === "youtube" ? youtubeFromLink(text("ref")) : config["source"] === "spotify" ? spotifyEmbed(text("ref")) : null;
  else embed = venueQuery ? mapEmbed(venueQuery) : null;
  return embed && isAllowedEmbedUrl(embed.url) ? embed : null;
}

/** `frame-src` directive value for the CSP. */
export const frameSrcDirective = (): string => `frame-src ${FRAME_HOSTS.map((host) => `https://${host}`).join(" ")}`;
