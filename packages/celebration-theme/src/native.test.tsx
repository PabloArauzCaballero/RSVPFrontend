import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CelebrationNativeRenderer, coverPhotoHeight } from "./native.js";
import { themeFromTemplate } from "./theme.js";
import { GALLERY, NOW, t, TEMPLATES, VIEW } from "../test/fixtures.js";

afterEach(cleanup);

/** react-native-web compiles styles into CSSOM rules (insertRule); read them back. */
const injectedCss = (): string => [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules].map((rule) => rule.cssText)).join(" ");

describe("CelebrationNativeRenderer (react-native-web)", () => {
  it("REQ-F09-04 · same theme data and section order as the web renderer, palette from context", () => {
    const { container } = render(<CelebrationNativeRenderer theme={themeFromTemplate(TEMPLATES[3], VIEW.enabledSections)} view={VIEW} gallery={GALLERY} t={t} now={NOW} />);
    const order = [...container.querySelectorAll("[data-testid^='section-']")].map((node) => node.getAttribute("data-testid"));
    expect(order).toEqual(["section-story", "section-schedule", "section-venues", "section-dressCode", "section-gallery", "section-gifts", "section-faq", "section-rsvp"]);
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

describe("CelebrationNativeRenderer · the guest's invitation in the app (mirror of the public page)", () => {
  const actionsFor = () => ({ openUrl: vi.fn(), partnerUrl: vi.fn((id: string) => `https://done.test/r/${id}?surface=app`), openSection: vi.fn(), openRsvp: vi.fn() });
  const show = (extra: Partial<Parameters<typeof CelebrationNativeRenderer>[0]> = {}) =>
    render(<CelebrationNativeRenderer theme={themeFromTemplate(TEMPLATES[0], VIEW.enabledSections)} view={VIEW} gallery={GALLERY} t={t} now={NOW} {...extra} />);

  it("section navigation: home is current on the cover and every section with content is one tap away", () => {
    const actions = actionsFor();
    show({ actions });
    const nav = screen.getByTestId("celebration-nav");
    // A landmark of links, like the web's <nav>: role "menu" would demand menuitem children (axe aria-required-children).
    expect(nav.getAttribute("role")).toBe("navigation");
    const links = [...nav.querySelectorAll("[role='link']")].map((node) => node.textContent);
    expect(links).toEqual(["celebration.nav.home", "celebration.sections.story", "celebration.sections.schedule", "celebration.sections.venues", "celebration.sections.gallery", "celebration.sections.dressCode", "celebration.sections.gifts", "celebration.sections.faq", "celebration.sections.recommendations"]);
    expect(nav.querySelector("[aria-current='page']")?.textContent).toBe("celebration.nav.home");
    fireEvent.click(within(nav).getByText("celebration.sections.venues"));
    expect(actions.openSection).toHaveBeenCalledWith("venues");
  });

  it("a section's own page: compact header named after the section, only that section, current in the navigation", () => {
    const actions = actionsFor();
    show({ actions, only: "faq" });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("celebration.sections.faq");
    expect(screen.getByTestId("celebration-cover").textContent).toContain("Ana y Luis");
    expect([...document.querySelectorAll("[data-testid^='section-']")].map((node) => node.getAttribute("data-testid"))).toEqual(["section-faq"]);
    expect(screen.getByTestId("celebration-nav").querySelector("[aria-current='page']")?.textContent).toBe("celebration.sections.faq");
    fireEvent.click(screen.getByText("celebration.nav.home"));
    expect(actions.openSection).toHaveBeenCalledWith(null);
  });

  it("how to get there opens maps for the venue; the partner recommendation goes through the redirector, never to the partner", () => {
    const actions = actionsFor();
    show({ actions });
    fireEvent.click(screen.getAllByText("celebration.venues.howToGetThere")[0] as HTMLElement);
    expect(actions.openUrl).toHaveBeenCalledWith("https://www.google.com/maps/search/?api=1&query=Iglesia%20San%20Francisco%2C%20Plaza%20San%20Francisco%2C%20La%20Paz");
    fireEvent.click(screen.getByText("celebration.recommendations.view"));
    expect(actions.partnerUrl).toHaveBeenCalledWith("listing-42");
    expect(actions.partnerUrl).toHaveBeenCalledTimes(1);
    expect(actions.openUrl).toHaveBeenLastCalledWith("https://done.test/r/listing-42?surface=app");
    // A recommendation without a listing has no link at all.
    expect(screen.getAllByText("celebration.recommendations.view")).toHaveLength(1);
  });

  it("the schedule says its times are the event's local time; a photo opens full size; a question opens to its answer", () => {
    const actions = actionsFor();
    show({ actions });
    expect(screen.getByTestId("section-schedule").textContent).toContain("celebration.schedule.zoneNote");
    expect(screen.getByTestId("section-schedule").textContent).toContain("America/La_Paz");
    fireEvent.click(screen.getByLabelText(/celebration.gallery.open/));
    expect(actions.openUrl).toHaveBeenCalledWith("https://media.test/g1-full.webp");
    const question = screen.getByRole("button", { name: "¿Pueden ir niños?" });
    expect(question.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText("Sí.")).toBeNull();
    fireEvent.click(question);
    expect(question.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Sí.")).toBeTruthy();
  });

  it.each([["classic", true], ["editorial", true], ["festive", true], ["corporate", true], ["minimal", false]] as const)("cover photo on the %s layout: %s", (layout, expected) => {
    const template = TEMPLATES.find((candidate) => candidate.layout === layout) ?? TEMPLATES[0];
    render(<CelebrationNativeRenderer theme={themeFromTemplate(template, VIEW.enabledSections)} view={VIEW} gallery={GALLERY} t={t} now={NOW} />);
    expect(Boolean(document.querySelector("[data-testid='celebration-cover-photo']"))).toBe(expected);
  });

  it("negative: a listing the app cannot link (partnerUrl null) shows the recommendation without a link", () => {
    show({ actions: { ...actionsFor(), partnerUrl: () => null } });
    expect(screen.getByText("Hotel Partner")).toBeTruthy();
    expect(screen.queryByText("celebration.recommendations.view")).toBeNull();
  });

  it("negative: without actions (host preview, admin) nothing navigates — no section menu, no links", () => {
    show();
    expect(screen.queryByTestId("celebration-nav")).toBeNull();
    expect(screen.queryByText("celebration.venues.howToGetThere")).toBeNull();
    expect(screen.queryByText("celebration.recommendations.view")).toBeNull();
    expect(document.querySelectorAll("[role='link']")).toHaveLength(0);
  });
});

describe("P22 · PL-A10 / PL-A11 · gifts and reply buttons in the app", () => {
  const actions = () => ({ openUrl: vi.fn(), partnerUrl: vi.fn((id: string) => `https://done.test/r/${id}`), openSection: vi.fn(), openRsvp: vi.fn() });
  const withoutGifts = <TSection extends string>(order: readonly TSection[]): TSection[] => order.filter((section) => section !== "gifts");

  it.each(TEMPLATES.map((template) => [template.layout, template] as const))("%s · gifts button shown although sectionOrder and the event type omit it; opens the gift list without any token", (_layout, template) => {
    const a = actions();
    const omitted = { ...template, sectionOrder: withoutGifts(template.sectionOrder) };
    render(<CelebrationNativeRenderer theme={themeFromTemplate(omitted, withoutGifts(VIEW.enabledSections))} view={{ ...VIEW, enabledSections: withoutGifts(VIEW.enabledSections) }} gallery={GALLERY} t={t} now={NOW} actions={a} />);
    const section = screen.getByTestId("section-gifts");
    expect(within(section).getByText("gifts.guest.title")).toBeTruthy();
    const button = screen.getByTestId("celebration-gifts-cta");
    expect(button.textContent).toBe("celebration.gifts.cta");
    expect(button.getAttribute("role")).toBe("link");
    fireEvent.click(button);
    expect(a.openSection).toHaveBeenCalledWith("gifts");
    expect(a.openRsvp).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByTestId("celebration-nav")).getByText("celebration.sections.gifts"));
    expect(a.openSection).toHaveBeenCalledTimes(2);
    cleanup();
  });

  it("the reply leads somewhere: the help to find the link without it, «Confirmar asistencia» with it", () => {
    const a = actions();
    const view = render(<CelebrationNativeRenderer theme={themeFromTemplate(TEMPLATES[0], VIEW.enabledSections)} view={VIEW} gallery={GALLERY} t={t} now={NOW} actions={a} />);
    expect(screen.getByTestId("celebration-rsvp-cta").textContent).toBe("celebration.rsvp.findLink");
    fireEvent.click(screen.getByTestId("celebration-rsvp-cta"));
    expect(a.openRsvp).toHaveBeenCalledTimes(1);
    view.unmount();
    render(<CelebrationNativeRenderer theme={themeFromTemplate(TEMPLATES[0], VIEW.enabledSections)} view={VIEW} gallery={GALLERY} t={t} now={NOW} actions={a} hasPersonalLink />);
    expect(screen.getByTestId("celebration-rsvp-cta").textContent).toBe("celebration.rsvp.cta");
  });

  it("negative: in a still preview (no actions) the buttons are drawn but are not controls", () => {
    render(<CelebrationNativeRenderer theme={themeFromTemplate(TEMPLATES[0], VIEW.enabledSections)} view={VIEW} gallery={GALLERY} t={t} now={NOW} />);
    expect(screen.getByTestId("celebration-gifts-cta")).toBeTruthy();
    expect(document.querySelectorAll("[role='link']")).toHaveLength(0);
  });
});

describe("cover photo size (native regression: Yoga shrank the width to honour maxHeight)", () => {
  it("is always the full width; the height follows the photo, never taller than 3:4, capped at 352", () => {
    expect(coverPhotoHeight(360, 16 / 9)).toBe(203);
    expect(coverPhotoHeight(370, 442 / 694)).toBe(352);
    expect(coverPhotoHeight(200, 442 / 694)).toBe(267);
    expect(coverPhotoHeight(720, 4 / 3)).toBe(352);
  });
});

