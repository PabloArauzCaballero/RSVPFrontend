// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PublicCelebration } from "../components/public-celebration";
import { credentialKey } from "../lib/guest-credential";
import { GALLERY, TEMPLATES, VIEW } from "./celebration-fixtures";

const page = { view: VIEW, template: TEMPLATES[0] ?? null, gallery: GALLERY };
const TOKEN = "g".repeat(43);
const button = (): HTMLElement => {
  const node = document.querySelector<HTMLElement>('a[data-action="rsvp-help"]');
  if (!node) throw new Error("the reply button is missing");
  return node;
};

afterEach(() => { cleanup(); window.sessionStorage.clear(); window.history.replaceState(null, "", "/"); });

describe("PL-114-R1 · the public reply offers «Confirmar asistencia» to the guest who holds their link", () => {
  it("without a credential: «Busca tu enlace personal», to /c/{slug}/rsvp", () => {
    render(<PublicCelebration page={page} />);
    expect(button().getAttribute("data-credential")).toBe("absent");
    expect(screen.getByRole("link", { name: "Busca tu enlace personal" }).getAttribute("href")).toBe("/c/ana-y-luis/rsvp");
    expect(screen.queryByRole("link", { name: "Confirmar asistencia" })).toBeNull();
  });

  it("with a credential in this tab: «Confirmar asistencia», same destination, same box, and no token anywhere in the page", () => {
    window.sessionStorage.setItem(credentialKey("ana-y-luis"), TOKEN);
    const { container } = render(<PublicCelebration page={page} />);
    expect(button().getAttribute("data-credential")).toBe("present");
    const link = screen.getByRole("link", { name: "Confirmar asistencia" });
    expect(link.getAttribute("href")).toBe("/c/ana-y-luis/rsvp");
    expect(screen.queryByRole("link", { name: "Busca tu enlace personal" })).toBeNull();
    // Both faces stay in the button, stacked in one grid cell: the width is the longer label's whichever face shows.
    expect(link.querySelectorAll("[data-face]")).toHaveLength(2);
    expect(link.querySelector('[data-face="find"]')?.getAttribute("aria-hidden")).toBe("true");
    expect(link.querySelector('svg[data-icon="check"]')).toBeTruthy();
    expect(container.innerHTML).not.toContain(TOKEN);
    expect(window.location.href).not.toContain(TOKEN);
  });

  it("the credential of another celebration does not count, and storage that throws is treated as no credential", () => {
    window.sessionStorage.setItem(credentialKey("otra-celebracion"), TOKEN);
    render(<PublicCelebration page={page} />);
    expect(button().getAttribute("data-credential")).toBe("absent");
    cleanup();
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new DOMException("blocked"); };
    try {
      render(<PublicCelebration page={page} />);
      expect(button().getAttribute("data-credential")).toBe("absent");
    } finally { Storage.prototype.getItem = original; }
  });

  it("a fragment `#t=` in the address bar is left alone (the island only tests presence)", () => {
    window.history.replaceState(null, "", `/#t=${TOKEN}`);
    render(<PublicCelebration page={page} />);
    expect(window.location.hash).toBe(`#t=${TOKEN}`);
    expect(button().getAttribute("data-credential")).toBe("absent");
  });
});
