import { cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { TranslatedEventType } from "@rsvp/query-hooks";
import { usePreviewTheme } from "../src/host/preview-theme";
import { fixture } from "../../../packages/design-editor/src/test/fixture";
import { baseHandlers, CELEBRATION, fakeClient, HttpFailure, renderApp, TEMPLATES } from "./support";

afterEach(cleanup);
const eventType = undefined as TranslatedEventType | undefined;

function Probe() {
  const theme = usePreviewTheme(CELEBRATION, eventType);
  return <p data-testid="theme">{theme.design ? `design:${theme.design.pages.length}` : `template:${theme.layout}`}</p>;
}
const template = TEMPLATES[0];
const record = (document: unknown) => ({ id: "d1", kind: "CELEBRATION", celebrationId: "c-1", name: "x", draftVersion: 4, publishedVersion: 1, hasUnpublishedChanges: true, document });

describe("the host's previews draw its own design draft", () => {
  it("uses the design document the host is editing, not only the template", async () => {
    const document = fixture();
    const { client } = fakeClient({ ...baseHandlers(), [`GET /media/templates/${template?.id}`]: () => template, "GET /media/celebrations/c-1/design": () => record(document) });
    renderApp(<Probe />, client);
    expect((await screen.findByText(`design:${document.pages.length}`)).textContent).toBe(`design:${document.pages.length}`);
  });

  it("falls back to the template when there is no design yet or it cannot be read", async () => {
    const none = fakeClient({ ...baseHandlers(), [`GET /media/templates/${template?.id}`]: () => template, "GET /media/celebrations/c-1/design": () => new HttpFailure(404, { code: "NOT_FOUND" }) });
    renderApp(<Probe />, none.client);
    expect((await screen.findByTestId("theme")).textContent).toMatch(/^template:/);
    cleanup();
    const broken = fakeClient({ ...baseHandlers(), [`GET /media/templates/${template?.id}`]: () => template, "GET /media/celebrations/c-1/design": () => new HttpFailure(500, { code: "INTERNAL" }) });
    renderApp(<Probe />, broken.client);
    expect((await screen.findByTestId("theme")).textContent).toMatch(/^template:/);
  });
});
