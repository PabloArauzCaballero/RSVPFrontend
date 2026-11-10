import { cleanup, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { GuestLinkLanding } from "../src/guest/link-landing";
import { fakeClient, HttpFailure, renderApp } from "./support";

const token = "T".repeat(43);
afterEach(cleanup);
it.each(["rsvp", "gifts"] as const)("F21 · a legacy %s link resolves the celebration from the token alone", async (surface) => {
  const resolved = vi.fn();
  const { client, calls } = fakeClient({ "POST /rsvp/resolve": () => ({ celebrationId: "c-1", slug: "ana-luis" }) });
  renderApp(<GuestLinkLanding token={token} surface={surface} onResolved={resolved} />, client);
  await waitFor(() => expect(resolved).toHaveBeenCalledWith(`/c/ana-luis/${surface === "gifts" ? "regalos" : "rsvp"}/${token}`));
  expect(calls[0]?.headers.get("authorization")).toBe(`Bearer ${token}`);
  expect(calls[0]?.path).not.toContain(token);
});
it.each([401, 403, 404, 409, 422, 429, 503])("F21 · legacy resolver %s has an explained outcome", async (status) => {
  const { client } = fakeClient({ "POST /rsvp/resolve": () => new HttpFailure(status) });
  const resolved = vi.fn();
  renderApp(<GuestLinkLanding token={token} onResolved={resolved} />, client);
  if (status === 401 || status === 404) await screen.findByText("Este enlace no está disponible");
  else await screen.findByRole("alert");
  expect(resolved).not.toHaveBeenCalled();
});
it("F21 · malformed token or malformed resolved slug cannot navigate", async () => {
  const first = fakeClient({});
  const view = renderApp(<GuestLinkLanding token="short" onResolved={vi.fn()} />, first.client);
  await screen.findByText("Este enlace no está disponible");
  expect(first.calls).toHaveLength(0); view.unmount();
  const { client } = fakeClient({ "POST /rsvp/resolve": () => ({ celebrationId: "c-1", slug: "../other" }) });
  const resolved = vi.fn();
  renderApp(<GuestLinkLanding token={token} onResolved={resolved} />, client);
  await screen.findByText("Este enlace no está disponible");
  expect(resolved).not.toHaveBeenCalled();
});
