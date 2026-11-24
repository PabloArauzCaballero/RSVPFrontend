import { describe, expect, it } from "vitest";
import { guestCover } from "./index.js";

/** M21 · the app and the public site build the guest's cover with this one function, so both show the same invitation. */
const t = (key: string, values?: Readonly<Record<string, string>>): string => (key === "rsvp.invite.hostedBy" ? `Te invitan ${values?.["hosts"]}` : key);
const view = (content: Record<string, unknown>) => ({ content, eventType: { code: "WEDDING", name: "Boda", hostRoles: [{ role: "BRIDE", label: "Novia" }, { role: "GROOM", label: "Novio" }] } }) as never;

describe("guestCover", () => {
  it("title, who invites (as a list in the reader's language) and date · place", () => {
    const cover = guestCover(view({ title: "Ana y Luis", eventDate: "2026-12-19T23:00:00.000Z", venueName: "Hacienda El Prado", hosts: { BRIDE: "Ana", GROOM: "Luis" } }), { locale: "es-BO", t, formatDate: () => "sábado, 19 de diciembre de 2026" });
    expect(cover).toEqual({ heading: "Ana y Luis", lead: "Te invitan Ana y Luis", meta: "sábado, 19 de diciembre de 2026 · Hacienda El Prado" });
  });

  it("an empty title falls back to the generic one, and nothing is invented when hosts, date or place are missing", () => {
    expect(guestCover(view({}), { locale: "es-BO", t, formatDate: () => "x" })).toEqual({ heading: "rsvp.page.title" });
  });

  it("negative: a date that cannot be formatted is left out instead of breaking the page", () => {
    const cover = guestCover(view({ title: "T", eventDate: "no-es-fecha", venueName: "Salón" }), { locale: "es-BO", t, formatDate: () => { throw new RangeError("Invalid time value"); } });
    expect(cover).toEqual({ heading: "T", meta: "Salón" });
  });
});
