import { logo } from "@rsvp/design-tokens";

/**
 * Own line illustrations (thick, rounded strokes) in the brand palette. Colours come from CSS (`.art` in globals.css) so they
 * follow the light and dark schemes; every drawing is decorative because the text next to it says the same thing.
 */
const base = { fill: "none", strokeWidth: 5, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: "false" } as const;

/** The D of the mark as an outline, with its check drawn inside. Used for the provider profile without a photo and as a ghost behind the hero. */
export function DOutline({ className = "" }: Readonly<{ className?: string }>) {
  const outline = `${logo.symbol.split("Z")[0]}Z`;
  return (
    <svg {...base} className={`art art--d ${className}`.trim()} viewBox="-6 -6 98 112">
      <path className="art__soft art__ink" d={outline} />
      <path className="art__accent" d="M17.2 50.5 32.7 66 61 33.5" strokeWidth={9} />
    </svg>
  );
}

/** 404: an empty envelope and a check that was not finished. */
export function LostArt({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <svg {...base} className={`art ${className}`.trim()} viewBox="0 0 200 150">
      <rect className="art__soft art__ink" x="30" y="56" width="140" height="82" rx="12" />
      <path className="art__ink" d="M32 70 100 22l68 48M32 136l52-40m84 40-52-40" />
      <path className="art__accent" d="M80 94l14 14" />
      <path className="art__accent art__dash" d="M94 108l28-32" />
    </svg>
  );
}

/** Service did not answer: a plug and a socket that do not touch. */
export function OfflineArt({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <svg {...base} className={`art ${className}`.trim()} viewBox="0 0 200 150">
      <rect className="art__soft art__ink" x="36" y="62" width="50" height="46" rx="10" />
      <rect className="art__soft art__ink" x="114" y="62" width="50" height="46" rx="10" />
      <path className="art__ink" d="M86 76h10M86 94h10M114 76h-10M114 94h-10M36 85H22C10 85 10 104 10 130M164 85h14c12 0 12 19 12 45" />
      <path className="art__accent" d="M96 52l-4-12M104 50v-14M112 52l4-12" />
    </svg>
  );
}

/** No results: a short list and a magnifier over it. */
export function EmptyArt({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <svg {...base} className={`art ${className}`.trim()} viewBox="0 0 200 150">
      <rect className="art__soft art__ink" x="34" y="20" width="104" height="104" rx="14" />
      <path className="art__ink art__faint" d="M54 48h64M54 68h48M54 88h56" />
      <circle className="art__accent art__bg" cx="138" cy="94" r="26" />
      <path className="art__accent" d="m157 113 22 22" />
    </svg>
  );
}

/** Step 1: a card being filled in. */
export function CreateArt({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <svg {...base} className={`art ${className}`.trim()} viewBox="0 0 120 90">
      <rect className="art__soft art__ink" x="14" y="12" width="76" height="62" rx="10" />
      <path className="art__ink" d="M30 32h44M30 48h26" />
      <circle className="art__solid" cx="92" cy="64" r="15" strokeWidth={0} />
      <path className="art__onaccent" d="M92 57v14M85 64h14" strokeWidth={4} />
    </svg>
  );
}

/** Step 2: the link leaves as a paper plane. */
export function ShareArt({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <svg {...base} className={`art ${className}`.trim()} viewBox="0 0 120 90">
      <path className="art__soft art__ink" d="M14 44 106 14 74 76 56 54Z" />
      <path className="art__ink" d="m56 54 50-40" />
      <path className="art__accent" d="M14 70h20M8 58h12" />
    </svg>
  );
}

/** Step 3: the list with its checks. */
export function SeeArt({ className = "" }: Readonly<{ className?: string }>) {
  return (
    <svg {...base} className={`art ${className}`.trim()} viewBox="0 0 120 90">
      <rect className="art__soft art__ink" x="14" y="8" width="92" height="74" rx="12" />
      <path className="art__accent" d="m28 28 5 5 9-10M28 48l5 5 9-10" />
      <path className="art__ink art__faint" d="M54 28h36M54 48h30M54 68h34" />
      <circle className="art__ink art__faint" cx="35" cy="68" r="6" strokeWidth={4} />
    </svg>
  );
}
