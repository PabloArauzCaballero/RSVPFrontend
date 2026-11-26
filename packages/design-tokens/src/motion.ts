/**
 * Motion tokens (rsvp-motion-design): the durations and curves reusable animation takes from, so no screen invents its own.
 * The invitation renderer (`packages/celebration-theme/styles.css`) mirrors them as `--cd-motion-*` custom properties and a test
 * fails if the two drift. Every named animation of the design contract (`aparecer`, `mecerse`, `revelar-telon`, `abrir-puertas`)
 * takes its duration from here, never from a document: a document cannot make an animation long or fast.
 * Only `transform` and `opacity` are animated by them; all of them stop under `prefers-reduced-motion: reduce`.
 */
export const motion = {
  /** Milliseconds. */
  duration: { short: 160, appear: 700, settle: 1200, sway: 2200, reveal: 1700 },
  /** CSS timing functions. `out` decelerates (things arriving); `inOut` is for panels that cross the page. */
  easing: { out: 'cubic-bezier(.16, 1, .3, 1)', inOut: 'cubic-bezier(.77, 0, .18, 1)' }
} as const;
