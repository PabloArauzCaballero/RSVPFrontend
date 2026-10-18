import type { LayoutId, LayoutSpec } from "../types.js";

/**
 * The five base layouts. One renderer reads these specs; adding a layout is a new entry
 * here plus its id in Template/Media, never a new page component.
 */

const NARROW = 720;
const MEDIUM = 880;
const WIDE = 1080;

export const LAYOUTS: Readonly<Record<LayoutId, LayoutSpec>> = {
  classic: { id: "classic", hero: "centered", align: "center", headingCase: "none", headingScale: 1.25, radius: 0, sectionGap: 48, maxWidth: NARROW, divider: "ornament", imageTreatment: "framed" },
  minimal: { id: "minimal", hero: "compact", align: "start", headingCase: "none", headingScale: 1.1, radius: 4, sectionGap: 40, maxWidth: NARROW, divider: "line", imageTreatment: "natural" },
  editorial: { id: "editorial", hero: "overlay", align: "start", headingCase: "uppercase", headingScale: 1.4, radius: 0, sectionGap: 64, maxWidth: WIDE, divider: "none", imageTreatment: "natural" },
  festive: { id: "festive", hero: "banner", align: "center", headingCase: "none", headingScale: 1.3, radius: 20, sectionGap: 32, maxWidth: MEDIUM, divider: "none", imageTreatment: "rounded" },
  corporate: { id: "corporate", hero: "split", align: "start", headingCase: "none", headingScale: 1.05, radius: 8, sectionGap: 32, maxWidth: WIDE, divider: "line", imageTreatment: "natural" }
};
