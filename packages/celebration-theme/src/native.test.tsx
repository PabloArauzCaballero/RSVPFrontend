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
    // the title is made of the hosts' names, so the cover does not repeat them underneath
    expect(container.textContent).toContain("Ana y Luis");
    expect(container.textContent).not.toContain("Ana & Luis");
  });

  it("the cover carries who, when and where; hosts are named under a title that does not name them", () => {
    const view = { ...VIEW, content: { ...VIEW.content, title: "Nuestra boda" } };
    const { container, getByTestId } = render(<CelebrationNativeRenderer theme={themeFromTemplate(TEMPLATES[0], VIEW.enabledSections)} view={view} gallery={GALLERY} t={t} now={NOW} />);
    const cover = getByTestId("celebration-cover").textContent ?? "";
    expect(cover).toContain("Nuestra boda");
    expect(cover).toContain("Ana & Luis");
    expect(cover).toContain(String(VIEW.content["venueName"]));
    expect(cover).toContain("celebration.hero.countdown");
    expect(container.querySelectorAll("[data-testid='celebration-cover']")).toHaveLength(1);
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
