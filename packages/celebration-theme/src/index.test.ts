import { describe, expect, it } from "vitest";
import { compatibleThemes, type CelebrationTheme } from "./index.js";

const theme: CelebrationTheme = { id: "classic", name: "Classic", layout: "classic", eventTypes: ["wedding"], colors: { canvas: "#fff", surface: "#fff", text: "#111", accent: "#000" }, fontFamily: "serif", sectionOrder: ["story"], enabledSections: ["story"] };
describe("celebration themes", () => {
  it("keeps incompatible templates out of the selector", () => {
    expect(compatibleThemes([theme], "wedding")).toEqual([theme]);
    expect(compatibleThemes([theme], "quince")).toEqual([]);
  });
});
