import type { ArtPath } from "./types.js";

/**
 * Motion of the art, the values of DOne's `MOTION` (`packages/ui/src/motion-tokens.ts`): an entrance rises 12 px while fading in over
 * 500 ms with `cubic-bezier(0.16, 1, 0.3, 1)`, and pieces cascade 70 ms apart, at most 8 steps (560 ms of delay in all, the last
 * step starts at 490 ms). This package cannot import `@rsvp/ui`, so the numbers are copied here, written literally in `art.css`, and
 * `apps/universal/test/invitation-art-sync.test.ts` fails the day one of them stops matching DOne.
 */
export const ART_MOTION = { enterMs: 500, enterDistance: 12, staggerMs: 70, staggerMax: 8, ease: "cubic-bezier(0.16, 1, 0.3, 1)" } as const;

/**
 * The step (0 to `staggerMax - 1`) each path of a drawing enters on. The disc and its shadow come first together; then every piece
 * of the figure on its own step, in drawing order; a cutout enters with the piece it is cut from, so a detail never shows up after
 * (or before) the ink it belongs to. Past the cap the remaining pieces share the last step.
 */
export function stepsOf(paths: readonly ArtPath[]): number[] {
  const last = ART_MOTION.staggerMax - 1;
  let step = paths[0]?.role === "disc" ? 0 : -1;
  return paths.map((path) => {
    if (path.role === "disc" || path.role === "shadow") return 0;
    if (path.role !== "cutout") step += 1;
    return Math.min(Math.max(step, 0), last);
  });
}
