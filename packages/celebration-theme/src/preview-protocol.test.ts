import { describe, expect, it } from "vitest";
import { parsePreviewMessage, parsePreviewPayload, PREVIEW_PAYLOAD, previewMessage } from "./preview-protocol.js";
import { themeFromTemplate } from "./theme.js";
import type { PublicCelebrationView } from "./content.js";

const VIEW = { celebrationId: "c", slug: "ana", locale: "es-BO", availableLocales: ["es-BO"], eventType: { code: "WEDDING", name: "Boda", hostRoles: [] }, enabledSections: ["story"], timeZone: "America/La_Paz", currency: "BOB", templateId: null, content: { title: "Ana" }, localTimes: {}, rsvpDeadline: null, publishedAt: null, version: 1 } as unknown as PublicCelebrationView;
const payload = { theme: themeFromTemplate(null, ["story"]), view: VIEW, gallery: [] };

describe("P10 · the preview message between the app and the site", () => {
  it("a payload survives the trip through JSON (what a web view or postMessage does to it)", () => {
    const sent = JSON.parse(JSON.stringify(previewMessage(payload))) as unknown;
    expect(parsePreviewMessage(sent)).toEqual(JSON.parse(JSON.stringify(payload)));
  });
  it("carries no credential: nothing in the message is a token or a link", () => {
    expect(JSON.stringify(previewMessage(payload))).not.toMatch(/token|credential|#t=/i);
  });
  it.each([
    ["null", null], ["a string", "x"], ["an array", []], ["another type", { type: "other", payload }], ["no theme", { type: PREVIEW_PAYLOAD, payload: { view: VIEW, gallery: [] } }],
    ["no view", { type: PREVIEW_PAYLOAD, payload: { theme: payload.theme, gallery: [] } }], ["no gallery", { type: PREVIEW_PAYLOAD, payload: { theme: payload.theme, view: VIEW } }],
    ["a view without content", { type: PREVIEW_PAYLOAD, payload: { ...payload, view: { slug: "a", locale: "es-BO" } } }]
  ])("%s is ignored", (_name, data) => expect(parsePreviewMessage(data)).toBeNull());
  it("parsePreviewPayload reads a payload without the envelope (the native bridge)", () => {
    expect(parsePreviewPayload(JSON.parse(JSON.stringify(payload)))).not.toBeNull();
    expect(parsePreviewPayload({})).toBeNull();
  });
});
