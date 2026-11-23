/**
 * State drawings of the public site, staged like the app's illustrations (`packages/ui/src/illustrations.ts`, same shapes):
 * a stone disc, a flat contact shadow, the object as a filled ink figure and ONE piece in a muted pastel. Colours come from
 * CSS (`.art` in globals.css) so they follow the light and dark schemes; every drawing is decorative because the text next to
 * it says the same thing. The tone class (`art--yellow`, `art--green`, `art--red`, `art--gray`) picks the pastel.
 * `apps/seo-web` cannot import `packages/ui`, so the paths are copied here; keep them in sync with the app.
 */
const base = { strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: "false", viewBox: "0 0 120 120" } as const;
const GROUND = "M14 56a46 46 0 1 0 92 0a46 46 0 1 0 -92 0Z";

/** 404: a compass whose needle lost the north (the app's `notFound`). */
export function LostArt({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <svg {...base} className={`art art--yellow ${className}`.trim()}>
      <path className="art__ground" d={GROUND} />
      <path className="art__shadow" d="M34 99a26 5 0 1 0 52 0a26 5 0 1 0 -52 0Z" />
      <path className="art__solid" d="M28 58a32 32 0 1 0 64 0a32 32 0 1 0 -64 0Z" />
      <path className="art__knock" strokeWidth={2} d="M35 58a25 25 0 1 0 50 0a25 25 0 1 0 -50 0Z" />
      <path className="art__pastel" d="M72 40L64 61L56 55Z" />
      <path className="art__knock-fill" d="M56 55L48 76L64 61Z" />
      <path className="art__solid" d="M57 58a3 3 0 1 0 6 0a3 3 0 1 0 -6 0Z" />
    </svg>
  );
}

/** Service did not answer: the signal arcs with a pastel bar across them (the app's `offline`). */
export function OfflineArt({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <svg {...base} className={`art art--red ${className}`.trim()}>
      <path className="art__ground" d={GROUND} />
      <path className="art__shadow" d="M36 99a24 5 0 1 0 48 0a24 5 0 1 0 -48 0Z" />
      <path className="art__ink" strokeWidth={7} d="M28 54C46 36 74 36 92 54M40 68C52 57 68 57 80 68" />
      <path className="art__solid" d="M53 84a7 7 0 1 0 14 0a7 7 0 1 0 -14 0Z" />
      <path className="art__knock-fill" d="M26.81 89.3L84.81 25.3A7 7 0 0 1 95.19 34.7L37.19 98.7A7 7 0 0 1 26.81 89.3Z" />
      <path className="art__pastel" d="M28.67 90.98L86.67 26.98A4.5 4.5 0 0 1 93.33 33.02L35.33 97.02A4.5 4.5 0 0 1 28.67 90.98Z" />
    </svg>
  );
}

/** No results: a magnifier with a pastel glass that found nothing (the app's `emptySearch`). */
export function EmptyArt({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <svg {...base} className={`art art--gray ${className}`.trim()}>
      <path className="art__ground" d={GROUND} />
      <path className="art__shadow" d="M34 99a26 5 0 1 0 52 0a26 5 0 1 0 -52 0Z" />
      <path className="art__solid" d="M72.6 63.4L92.6 83.4A6.5 6.5 0 0 1 83.4 92.6L63.4 72.6A6.5 6.5 0 0 1 72.6 63.4Z" />
      <path className="art__solid" d="M26 52a26 26 0 1 0 52 0a26 26 0 1 0 -52 0Z" />
      <path className="art__pastel" d="M34 52a18 18 0 1 0 36 0a18 18 0 1 0 -36 0Z" />
      <path className="art__ink" strokeWidth={3} d="M44 58C48 54 56 54 60 58" />
      <path className="art__solid" d="M42.4 48a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0ZM56.4 48a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0Z" />
    </svg>
  );
}

/** Landing, the host: a garland over the D with the tick (the app's `welcomeHost`). */
export function HostArt({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <svg {...base} className={`art art--yellow ${className}`.trim()}>
      <path className="art__ground" d="M14 56a46 46 0 1 0 92 0a46 46 0 1 0 -92 0Z" />
      <path className="art__shadow" d="M32 99a28 5 0 1 0 56 0a28 5 0 1 0 -56 0Z" />
      <path className="art__ink" strokeWidth={3} d="M10 14Q60 36 110 14" />
      <path className="art__solid" d="M16 20.3L32 20.3L24 36.3ZM52 26L68 26L60 42ZM88 20.3L104 20.3L96 36.3Z" />
      <path className="art__pastel" d="M34 24.57L50 24.57L42 40.57ZM70 24.57L86 24.57L78 40.57Z" />
      <path className="art__solid" d="M41.2 46H54.72a26 26 0 0 1 0 52H41.2a5.2 5.2 0 0 1 -5.2 -5.2V51.2a5.2 5.2 0 0 1 5.2 -5.2Z" />
      <path className="art__knock" strokeWidth={5} d="M45.36 72L54.65 81.29L71.36 60.86" />
    </svg>
  );
}

/** Landing, the guest: the pastel invitation rising out of its envelope (the app's `welcomeGuest`). */
export function GuestArt({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <svg {...base} className={`art art--blue ${className}`.trim()}>
      <path className="art__ground" d="M14 56a46 46 0 1 0 92 0a46 46 0 1 0 -92 0Z" />
      <path className="art__shadow" d="M28 99a32 5 0 1 0 64 0a32 5 0 1 0 -64 0Z" />
      <path className="art__stone" d="M30 52H90a6 6 0 0 1 6 6V92a6 6 0 0 1 -6 6H30a6 6 0 0 1 -6 -6V58a6 6 0 0 1 6 -6Z" />
      <path className="art__pastel" d="M42 22H78a6 6 0 0 1 6 6V70a6 6 0 0 1 -6 6H42a6 6 0 0 1 -6 -6V28a6 6 0 0 1 6 -6Z" />
      <path className="art__ink" strokeWidth={3} d="M49.5 40L57 47.5L70.5 31" />
      <path className="art__solid" d="M24 56L60 78L96 56V92a6 6 0 0 1-6 6H30a6 6 0 0 1-6-6Z" />
    </svg>
  );
}

/** Landing, the provider: the stall with its pastel awning (the app's `welcomeProvider`). */
export function ProviderArt({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <svg {...base} className={`art art--green ${className}`.trim()}>
      <path className="art__ground" d="M14 56a46 46 0 1 0 92 0a46 46 0 1 0 -92 0Z" />
      <path className="art__shadow" d="M24 99a36 5 0 1 0 72 0a36 5 0 1 0 -72 0Z" />
      <path className="art__ink" strokeWidth={4} d="M28 42V60M92 42V60" />
      <path className="art__solid" d="M30 58H90a6 6 0 0 1 6 6V92a6 6 0 0 1 -6 6H30a6 6 0 0 1 -6 -6V64a6 6 0 0 1 6 -6Z" />
      <path className="art__knock" strokeWidth={4} d="M49.5 78L57 85.5L70.5 69" />
      <path className="art__pastel" d="M28 22H92L102 42a7 7 0 0 1-14 0a7 7 0 0 1-14 0a7 7 0 0 1-14 0a7 7 0 0 1-14 0a7 7 0 0 1-14 0a7 7 0 0 1-14 0Z" />
      <path className="art__ink" strokeWidth={2.5} d="M48 22L45 42M60 22V42M72 22L75 42" />
    </svg>
  );
}
