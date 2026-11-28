import { cleanup, createEvent, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MicrositeScreen } from "../src/provider/microsite-screen";
import { ServicesScreen } from "../src/provider/services-screen";
import { writeLocal } from "../src/platform/local-store";
import { resetSecureStore } from "./stubs/expo-secure-store";
import { resetRouter } from "./stubs/expo-router";
import { fakeClient, GEO, HOST, HttpFailure, renderApp, type Handler } from "./support";

/** The device picker is the platform's; the tests hand it a file. */
const picked = vi.hoisted(() => ({ next: null as null | { file: Blob; name: string; type: string; size: number } }));
vi.mock("../src/platform/pick-image", () => ({ pickImage: async () => picked.next }));
vi.mock("../src/platform/file-drop", () => import("../src/platform/file-drop.web"));
vi.mock("../src/platform/pick-media", () => import("../src/platform/pick-media.web"));

/** Imagenes por archivo · photos of a SERVICE, and the gallery and logo of the microsite: uploaded from the device, never typed as a link. */
const PID = "4f0f2d3d-0000-4000-8000-0000000000bb";
const SID = "7a1e2b3c-0000-4000-8000-0000000000cc";
const profile = { id: PID, slug: "banquetes", name: "Banquetes Andinos", status: "VERIFIED", plan: "FREE", currency: "BOB", timeZone: "America/La_Paz", version: 1, ownerId: "u-host" };
const rendition = (id: string) => ({ thumb: { url: `https://media.test/${id}/thumb.webp`, width: 160, height: 120 }, card: { url: `https://media.test/${id}/card.webp`, width: 480, height: 360 }, full: { url: `https://media.test/${id}/full.webp`, width: 1280, height: 960 } });
const mediaItem = (id: string, purpose: "GALLERY" | "LOGO", status = "READY", extra: Record<string, unknown> = {}) => ({ id, purpose, status, rejectReason: null, contentType: "image/png", altText: null, position: 0, createdAt: "2026-11-28T10:00:00Z", updatedAt: "2026-11-28T10:00:00Z", renditions: status === "READY" ? rendition(id) : null, ...extra });
const MICROSITE = { providerId: PID, version: 4, descriptions: { "es-BO": "Banquetes" }, gallery: [], logo: null, hours: { weekly: [] }, social: {}, address: null };
const SERVICE = { id: SID, providerId: PID, type: "SERVICE", category: "CATERING", city: "la-paz", title: "Banquete andino", published: false, version: 1, fulfillment: { responsible: "PROVIDER", coverageZones: ["la-paz"], leadTimeDays: 5, transportCostMinor: 1000 } };
const handlers = (extra: Record<string, Handler> = {}): Record<string, Handler> => ({
  [`GET /providers/${PID}`]: () => profile,
  [`GET /providers/${PID}/microsite`]: () => MICROSITE,
  [`GET /providers/${PID}/media`]: () => ({ items: [] }),
  [`GET /providers/${PID}/listings`]: () => ({ items: [SERVICE] }),
  [`GET /providers/${PID}/listings/${SID}`]: () => ({ ...SERVICE, photos: [] }),
  "GET /providers/geo": () => GEO,
  "GET /providers/categories": () => ({ items: [] }),
  ...extra
});
const drag = (kind: "dragEnter" | "dragOver" | "drop", target: Element, files: File[] = [], types: string[] = ["Files"]): { prevented: boolean } => {
  const event = createEvent[kind](target);
  Object.defineProperty(event, "dataTransfer", { value: { files, types, items: files.map((file) => ({ type: file.type })), dropEffect: "unset" } });
  fireEvent(target, event);
  return { prevented: event.defaultPrevented };
};
const png = (name: string, content = "data"): File => new File([content], name, { type: "image/png" });
const uploadHandlers = (id: string, purpose: "GALLERY" | "LOGO", seen: unknown[]): Record<string, Handler> => {
  let ready = false;
  return {
    [`POST /providers/${PID}/media/uploads`]: (call) => { seen.push(call.body); return { ...mediaItem(id, purpose, "PENDING_UPLOAD"), upload: { method: "PUT", url: "https://s3.test/up", headers: { "Content-Type": "image/png" }, expiresAt: "2026-11-28T10:10:00Z" } }; },
    [`POST /providers/${PID}/media/${id}/complete`]: () => { ready = true; return mediaItem(id, purpose, "QUEUED"); },
    [`GET /providers/${PID}/media`]: () => ({ items: ready ? [mediaItem(id, purpose)] : [] })
  };
};

beforeEach(async () => { resetSecureStore(); resetRouter(); await writeLocal("rsvp.provider.u-host", PID); vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 }))); });
afterEach(() => { cleanup(); picked.next = null; vi.unstubAllGlobals(); });

describe("photos of a service", () => {
  it("a SERVICE row offers Fotos; opening it shows the uploader (drag and drop, no link field) and it never appears on a product row", async () => {
    const { client } = fakeClient(handlers());
    renderApp(<ServicesScreen />, client, HOST);
    const toggle = await screen.findByTestId(`listing-photos-${SID}`);
    expect(screen.queryByTestId(`service-photos-${SID}`)).toBeNull();
    fireEvent.click(toggle);
    const panel = await screen.findByTestId(`service-photos-${SID}`);
    expect(within(panel).getByText(/De 1 a 5 fotos de tu servicio/)).toBeTruthy();
    expect(within(panel).getByTestId("photo-dropzone")).toBeTruthy();
    expect(within(panel).getByTestId("photo-add")).toBeTruthy();
    expect(within(panel).queryByRole("textbox", { name: /https|enlace|URL/i })).toBeNull();
  });

  it("a dropped file goes register, PUT, complete and shows as ready; a picture dragged from another page is not taken", async () => {
    const seen: unknown[] = [];
    let ready = false;
    const { client, calls } = fakeClient(handlers({
      [`GET /providers/${PID}/listings/${SID}`]: () => ({ ...SERVICE, photos: ready ? [{ id: "ph1", listingId: SID, variantId: null, status: "READY", rejectReason: null, contentType: "image/png", altText: null, position: 0, renditions: rendition("ph1"), createdAt: "2026-11-28T10:00:00Z", updatedAt: "2026-11-28T10:00:00Z" }] : [] }),
      [`POST /providers/${PID}/listings/${SID}/photos/uploads`]: (call) => { seen.push(call.body); return { id: "ph1", listingId: SID, variantId: null, status: "PENDING_UPLOAD", rejectReason: null, contentType: "image/png", altText: null, position: 0, renditions: null, createdAt: "x", updatedAt: "x", upload: { method: "PUT", url: "https://s3.test/up", headers: {}, expiresAt: "x" } }; },
      [`POST /providers/${PID}/listings/${SID}/photos/ph1/complete`]: () => { ready = true; return { id: "ph1", status: "QUEUED" }; }
    }));
    renderApp(<ServicesScreen />, client, HOST);
    fireEvent.click(await screen.findByTestId(`listing-photos-${SID}`));
    const zone = await screen.findByTestId("photo-dropzone");
    drag("drop", zone, [], ["text/uri-list"]);
    expect(await screen.findByText(/Eso no es un archivo/)).toBeTruthy();
    expect(seen).toHaveLength(0);
    drag("drop", zone, [png("banquete.png", "abc")]);
    await waitFor(() => expect(seen).toEqual([{ contentType: "image/png", bytes: 3 }]));
    await waitFor(() => expect(screen.getByTestId("photo-ph1")).toBeTruthy(), { timeout: 5000 });
    expect(calls.some((call) => call.path.endsWith("/photos/ph1/complete"))).toBe(true);
  });
});

describe("gallery and logo of the microsite", () => {
  it("shows the zones and no link field; a dropped gallery photo joins the profile and the save sends its id (and the logo), never a typed address", async () => {
    const seen: unknown[] = [];
    let saved: unknown;
    const { client } = fakeClient(handlers({
      ...uploadHandlers("g1", "GALLERY", seen),
      [`PUT /providers/${PID}/microsite`]: (call) => { saved = call.body; return { ...MICROSITE, version: 5 }; }
    }));
    renderApp(<MicrositeScreen />, client, HOST);
    const zone = await screen.findByTestId("microsite-GALLERY-zone");
    expect(screen.getByTestId("microsite-LOGO-zone")).toBeTruthy();
    expect(screen.getByTestId("microsite-gallery-count").textContent).toBe("0 de 12 fotos");
    drag("drop", zone, [png("mesa.png", "abcd")]);
    await waitFor(() => expect(seen).toEqual([{ purpose: "GALLERY", contentType: "image/png", bytes: 4 }]));
    await screen.findByTestId("microsite-photo-g1", undefined, { timeout: 5000 });
    expect(screen.getByTestId("microsite-gallery-count").textContent).toBe("1 de 12 fotos");
    fireEvent.click(screen.getByTestId("microsite-save"));
    await waitFor(() => expect(saved).toBeTruthy());
    const body = saved as { gallery: { mediaId: string }[]; logo: unknown };
    expect(body.gallery.map((entry) => entry.mediaId)).toEqual(["g1"]);
    expect(body.logo).toBeNull();
  });

  it("the logo uses the button of the device; removing it from the draft sends logo null on save, and the file stays available to reuse", async () => {
    const seen: unknown[] = [];
    let saved: unknown;
    picked.next = { file: new Blob(["logo"], { type: "image/png" }), name: "logo.png", type: "image/png", size: 4 };
    const { client } = fakeClient(handlers({
      ...uploadHandlers("l1", "LOGO", seen),
      // The server answers with the address it derived from the photo.
      [`PUT /providers/${PID}/microsite`]: (call) => { saved = call.body; return { ...MICROSITE, version: 5, logo: { mediaId: "l1", url: "https://media.test/l1/card.webp" } }; }
    }));
    renderApp(<MicrositeScreen />, client, HOST);
    fireEvent.click(await screen.findByTestId("microsite-LOGO-add"));
    await screen.findByTestId("microsite-logo", undefined, { timeout: 5000 });
    expect(seen).toEqual([{ purpose: "LOGO", contentType: "image/png", bytes: 4 }]);
    fireEvent.click(screen.getByTestId("microsite-save"));
    await waitFor(() => expect(saved).toMatchObject({ logo: { mediaId: "l1" } }));
    fireEvent.click(screen.getByTestId("microsite-logo-remove"));
    expect(screen.queryByTestId("microsite-logo")).toBeNull();
    expect(await screen.findByTestId("microsite-media-unused")).toBeTruthy();
  });

  it("a non-image, an address dropped instead of a file and a gallery that is full are refused without any request", async () => {
    const seen: unknown[] = [];
    const full = Array.from({ length: 12 }, (_, n) => ({ mediaId: `m${n}`, url: `https://media.test/m${n}/card.webp`, alt: {} }));
    const { client } = fakeClient(handlers({ ...uploadHandlers("g9", "GALLERY", seen), [`GET /providers/${PID}/microsite`]: () => ({ ...MICROSITE, gallery: full }) }));
    renderApp(<MicrositeScreen />, client, HOST);
    const zone = await screen.findByTestId("microsite-GALLERY-zone");
    expect(screen.getByTestId("microsite-gallery-count").textContent).toBe("12 de 12 fotos");
    expect(screen.getByText(/Tu galería ya tiene 12 fotos/)).toBeTruthy();
    expect(screen.getByTestId("microsite-GALLERY-add").getAttribute("aria-disabled")).toBe("true");
    drag("drop", zone, [png("otra.png")]);
    await new Promise((resolve) => { setTimeout(resolve, 30); });
    expect(seen).toHaveLength(0);
  });

  it("deleting an unused file that the saved profile still shows says to remove it first (409 MEDIA_IN_USE)", async () => {
    const { client } = fakeClient(handlers({
      [`GET /providers/${PID}/media`]: () => ({ items: [mediaItem("old", "GALLERY")] }),
      [`DELETE /providers/${PID}/media/old`]: () => new HttpFailure(409, { code: "MEDIA_IN_USE" })
    }));
    renderApp(<MicrositeScreen />, client, HOST);
    const unused = await screen.findByTestId("microsite-media-unused");
    fireEvent.click(within(unused).getByTestId("microsite-media-delete-old"));
    expect((await screen.findByTestId("sheet-error")).textContent).toMatch(/todavía usa esta foto/);
  });
});
