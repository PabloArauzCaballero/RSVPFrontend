/**
 * Empty-state drawings only: one continuous ink line on a flat ground and a single pastel shape. Colours come from CSS
 * (`.art` in globals.css) so they follow the light and dark schemes; every drawing is decorative because the text next to it
 * says the same thing. The tone class (`art--yellow`, `art--green`, `art--red`, `art--gray`) picks the pastel.
 */
const base = { fill: "none", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: "false" } as const;

/** 404: an empty envelope and a check that was not finished. */
export function LostArt({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <svg {...base} className={`art art--yellow ${className}`.trim()} viewBox="0 0 200 150">
      <rect className="art__pastel" x="54" y="30" width="116" height="84" rx="10" />
      <rect className="art__ink" x="30" y="56" width="140" height="82" rx="8" />
      <path className="art__ink" d="M32 62 100 108l68-46" />
      <path className="art__ink art__dash" d="M60 40c14-12 34-14 50-8" />
    </svg>
  );
}

/** Service did not answer: a plug and a socket that do not touch. */
export function OfflineArt({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <svg {...base} className={`art art--red ${className}`.trim()} viewBox="0 0 200 150">
      <circle className="art__pastel" cx="132" cy="64" r="34" />
      <path className="art__ink" d="M20 76h54a8 8 0 0 1 8 8v8a8 8 0 0 1-8 8H20M94 84H78M94 92H78" />
      <path className="art__ink" d="M180 76h-34a8 8 0 0 0-8 8v8a8 8 0 0 0 8 8h34M118 84h12M118 92h12" />
      <path className="art__ink art__dash" d="M20 124c40 10 100 10 160 0" />
    </svg>
  );
}

/** No results: a short list and a magnifier over it. */
export function EmptyArt({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <svg {...base} className={`art art--gray ${className}`.trim()} viewBox="0 0 200 150">
      <rect className="art__pastel" x="34" y="20" width="104" height="104" rx="10" />
      <path className="art__ink art__faint" d="M54 48h64M54 68h48M54 88h56" />
      <circle className="art__ink art__bg" cx="138" cy="94" r="26" />
      <path className="art__ink" d="m157 113 22 22" />
    </svg>
  );
}
