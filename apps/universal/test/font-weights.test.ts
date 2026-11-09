import { describe, expect, it } from "vitest";
import { brandFamilyFor } from "../src/platform/font-weights";

describe("brand font by weight (native)", () => {
  it("maps the weight a style asks for to the bundled file", () => {
    expect(brandFamilyFor({ fontWeight: "800" })).toBe("Geist_700Bold");
    expect(brandFamilyFor({ fontWeight: "bold" })).toBe("Geist_700Bold");
    expect(brandFamilyFor([{ fontWeight: "600" }, { color: "red" }])).toBe("Geist_600SemiBold");
  });
  it("uses the regular file when no weight is given", () => {
    expect(brandFamilyFor(undefined)).toBe("Geist_400Regular");
    expect(brandFamilyFor({ fontWeight: "300" })).toBe("Geist_400Regular");
  });
  it("leaves a style that names its own family alone", () => {
    expect(brandFamilyFor({ fontFamily: "Menlo", fontWeight: "700" })).toBeUndefined();
  });
});
