// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PublicCelebration } from "../components/public-celebration";
import { credentialKey } from "../lib/guest-credential";
import { GALLERY, TEMPLATES, VIEW } from "./celebration-fixtures";

const page = { view: VIEW, template: TEMPLATES[0] ?? null, gallery: GALLERY };
const TOKEN = "g".repeat(43);
/** The reply is offered twice: in the always-visible dock and in the reply section. Both are checked together. */
const buttons = (): HTMLElement[] => {
  const nodes = [...document.querySelectorAll<HTMLElement>('a[data-action="rsvp-help"]')];
  if (nodes.length !== 2) throw new Error(`expected the dock and the section reply, found ${nodes.length}`);
  return nodes;
};
const states = (): (string | undefined)[] => buttons().map((node) => node.dataset["credential"]);

afterEach(() => { cleanup(); window.sessionStorage.clear(); window.history.replaceState(null, "", "/"); });

describe("PL-114-R1 · the public reply offers «Confirmar asistencia» to the guest who holds their link", () => {
  it("without a credential: «Busca tu enlace personal», to /c/{slug}/rsvp", () => {
    render(<PublicCelebration page={page} />);
    expect(states()).toEqual(["absent", "absent"]);
    const links = screen.getAllByRole("link", { name: "Busca tu enlace personal" });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link.getAttribute("href")).toBe("/c/ana-y-luis/rsvp");
    expect(screen.queryByRole("link", { name: "Confirmar asistencia" })).toBeNull();
  });

  it("with a credential in this tab: «Confirmar asistencia», same destination, same box, and no token anywhere in the page", () => {
    window.sessionStorage.setItem(credentialKey("ana-y-luis"), TOKEN);
    const { container } = render(<PublicCelebration page={page} />);
    expect(states()).toEqual(["present", "present"]);
    const confirm = screen.getAllByRole("link", { name: "Confirmar asistencia" });
    // The dock and the reply section flip together: no button is left offering «Busca tu enlace personal».
    expect(confirm).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "Busca tu enlace personal" })).toBeNull();
    for (const link of confirm) {
      expect(link.getAttribute("href")).toBe("/c/ana-y-luis/rsvp");
      // Both faces stay in the button, stacked in one grid cell: the width is the longer label's whichever face shows.
      expect(link.querySelectorAll("[data-face]")).toHaveLength(2);
      expect(link.querySelector('[data-face="find"]')?.getAttribute("aria-hidden")).toBe("true");
      expect(link.querySelector('svg[data-icon="check"]')).toBeTruthy();
    }
    expect(document.querySelector('.cdesign-dock a[data-action="rsvp-help"]')?.getAttribute("data-credential")).toBe("present");
    expect(container.innerHTML).not.toContain(TOKEN);
    expect(window.location.href).not.toContain(TOKEN);
  });

  it("the credential of another celebration does not count, and storage that throws is treated as no credential", () => {
    window.sessionStorage.setItem(credentialKey("otra-celebracion"), TOKEN);
    render(<PublicCelebration page={page} />);
    expect(states()).toEqual(["absent", "absent"]);
    cleanup();
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new DOMException("blocked"); };
    try {
      render(<PublicCelebration page={page} />);
      expect(states()).toEqual(["absent", "absent"]);
    } finally { Storage.prototype.getItem = original; }
  });

  it("PL-134-M1 · a fragment `#t=` (the app on the web) is stored and removed from the address bar, and the reply becomes «Confirmar asistencia»", () => {
    window.history.replaceState(null, "", `/c/ana-y-luis#t=${TOKEN}`);
    render(<PublicCelebration page={page} />);
    expect(window.location.hash).toBe("");
    expect(window.sessionStorage.getItem(credentialKey("ana-y-luis"))).toBe(TOKEN);
    expect(states()).toEqual(["present", "present"]);
  });
});
