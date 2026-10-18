import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CelebrationNativeRenderer } from "./native.js";
import { themeFromTemplate } from "./theme.js";
import { GALLERY, NOW, t, TEMPLATES, VIEW } from "../test/fixtures.js";

afterEach(cleanup);

/** react-native-web compiles styles into CSSOM rules (insertRule); read them back. */
const injectedCss = (): string => [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).join(" ");

describe("CelebrationNativeRenderer (react-native-web)", () => {
  it("REQ-F09-04 · same theme data and section order as the web renderer, palette from context", () => {
    const { container } = render(<CelebrationNativeRenderer theme={themeFromTemplate(TEMPLATES[3], VIEW.enabledSections)} view={VIEW} gallery={GALLERY} t={t} now={NOW} />);
    const order = [...container.querySelectorAll("[data-testid^='section-']")].map((node) => node.getAttribute("data-testid"));
    expect(order).toEqual(["section-story", "section-schedule", "section-venues", "section-dressCode", "section-gallery", "section-faq", "section-rsvp"]);
    expect(injectedCss()).toContain("rgba(255,245,250,1.00)");
    expect(container.textContent).toContain("Ana & Luis");
  });

  it.each(TEMPLATES.map((template) => [template.layout, template] as const))("%s renders in light and dark", (_layout, template) => {
    const light = render(<CelebrationNativeRenderer theme={themeFromTemplate(template, VIEW.enabledSections)} view={VIEW} gallery={GALLERY} t={t} now={NOW} />);
    const lightClasses = light.container.innerHTML;
    light.unmount();
    const dark = render(<CelebrationNativeRenderer theme={themeFromTemplate(template, VIEW.enabledSections)} view={VIEW} gallery={GALLERY} t={t} now={NOW} colorScheme="dark" />);
    expect(dark.container.innerHTML).not.toBe(lightClasses);
    expect(injectedCss()).toContain("rgba(20,18,24,1.00)");
    dark.unmount();
  });
});
