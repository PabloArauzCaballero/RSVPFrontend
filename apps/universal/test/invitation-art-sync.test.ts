import { describe, expect, it } from "vitest";
import { EASE, MOTION } from "../../../packages/ui/src/motion-tokens";
import { ART_MOTION } from "../../../packages/celebration-theme/src/art/motion";
import { circle as uiCircle, ellipse as uiEllipse, ILLUSTRATIONS, rect as uiRect } from "../../../packages/ui/src/illustrations";
import { capsule, circle, ellipse, rect } from "../../../packages/celebration-theme/src/art/geometry";

/**
 * `packages/celebration-theme` cannot import `@rsvp/ui` (the public site renders invitations and must not depend on the app kit),
 * so the invitation art writes its own path builders. They must write exactly the strings DOne's illustrations do, so a drawing can
 * move between the two libraries unchanged; this test fails the day one of them changes.
 */
describe("Dibujitos de invitación · la geometría es la de las ilustraciones de DOne", () => {
  it.each([[60, 56, 46], [38.5, 12, 3.2], [0, 0, 1]] as const)("circle(%s, %s, %s)", (cx, cy, r) => expect(circle(cx, cy, r)).toBe(uiCircle(cx, cy, r)));
  it.each([[60, 99, 32, 5], [10.25, 4, 7, 2.5]] as const)("ellipse(%s, %s, %s, %s)", (cx, cy, rx, ry) => expect(ellipse(cx, cy, rx, ry)).toBe(uiEllipse(cx, cy, rx, ry)));
  it.each([[30, 56, 60, 42, 8], [24.5, 44, 68, 14, 6]] as const)("rect(%s, %s, %s, %s, %s)", (x, y, w, h, r) => expect(rect(x, y, w, h, r)).toBe(uiRect(x, y, w, h, r)));

  it("capsule writes the pill of DOne's `offline` bar", () => {
    const offline = ILLUSTRATIONS.offline.map((shape) => shape.d);
    expect(offline).toContain(capsule(32, 94, 90, 30, 7));
    expect(offline).toContain(capsule(32, 94, 90, 30, 4.5));
  });

  it("stages the disc and the shadow exactly as DOne does", async () => {
    const { DRAWINGS } = await import("../../../packages/celebration-theme/src/art/library");
    const stage = ILLUSTRATIONS.gift.slice(0, 2).map((shape) => shape.d);
    expect(DRAWINGS[0]?.paths[0]?.d).toBe(stage[0]);
    expect(DRAWINGS.find((item) => item.id === "regalo")?.paths[1]?.d).toBe(uiEllipse(60, 99, 32, 5));
  });

  it("moves with DOne's motion tokens: 500 ms, 12 px, 70 ms per step, at most 8 steps and the same ease-out", () => {
    expect(ART_MOTION.enterMs).toBe(MOTION.enterMs);
    expect(ART_MOTION.enterDistance).toBe(MOTION.enterDistance);
    expect(ART_MOTION.staggerMs).toBe(MOTION.staggerMs);
    expect(ART_MOTION.staggerMax).toBe(MOTION.staggerMax);
    expect(ART_MOTION.ease).toBe(`cubic-bezier(${EASE.out.join(", ")})`);
  });
});
