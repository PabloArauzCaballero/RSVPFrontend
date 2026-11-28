import { cleanup, createEvent, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentsScreen } from "../src/provider/documents-screen";
import { writeLocal } from "../src/platform/local-store";
import { IntakeDocuments } from "../src/admin/partners/kyp-documents";
import { ADMIN, fakeClient, HOST, renderApp, GEO, type Handler } from "./support";

/** The web build: drag and drop and the browser's file input (vitest would otherwise load the iOS/Android files). */
vi.mock("../src/platform/file-drop", () => import("../src/platform/file-drop.web"));
vi.mock("../src/platform/pick-media", () => import("../src/platform/pick-media.web"));

const PID = "4f0f2d3d-0000-4000-8000-0000000000aa";
const profile = { id: PID, slug: "dulce-sol", name: "Dulce Sol", status: "VERIFIED", plan: "FREE", currency: "BOB", timeZone: "America/La_Paz", version: 1, ownerId: "u-host" };
const portal = (extra: Record<string, Handler> = {}): Record<string, Handler> => ({ [`GET /providers/${PID}`]: () => profile, "GET /providers/geo": () => GEO, [`GET /providers/${PID}/listings`]: () => ({ items: [] }), [`GET /providers/${PID}/metrics`]: () => ({ providerId: PID, from: "", to: "", totals: { impressions: 0, clicks: 0, validLeads: 0, invalidLeads: 0, ctr: 0 } }), [`GET /providers/${PID}/documents`]: () => ({ items: [] }), ...extra });
const file = (name: string, type: string, size = 2048): File => { const made = new File(["data"], name, { type }); Object.defineProperty(made, "size", { value: size }); return made; };

function drop(target: Element, files: readonly File[], types: readonly string[] = ["Files"]): { readonly prevented: boolean } {
  const event = createEvent.drop(target);
  Object.defineProperty(event, "dataTransfer", { value: { files, types, items: files.map((item) => ({ type: item.type })), dropEffect: "" } });
  fireEvent(target, event);
  return { prevented: event.defaultPrevented };
}

beforeEach(async () => { await writeLocal("rsvp.provider.u-host", PID); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("provider documents: drag and drop", () => {
  it("takes a dropped PDF as the chosen document, with no URL field on the screen", async () => {
    const { client } = fakeClient(portal());
    renderApp(<DocumentsScreen />, client, HOST);
    const zone = await screen.findByTestId("document-drop");
    expect(zone.getAttribute("role")).toBe("group");
    expect(screen.getByText(/Arrastra aquí tu documento o elígelo/)).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: /url|enlace/i })).toBeNull();
    expect(drop(zone, [file("ci.pdf", "application/pdf")]).prevented).toBe(true);
    expect((await screen.findByTestId("document-chosen")).textContent).toContain("ci.pdf");
    // the file dialog button is still there for the keyboard and for phones
    expect(screen.getByTestId("document-choose")).toBeTruthy();
  });

  it("registers, PUTs the dropped file to the signed URL and completes it", async () => {
    const put = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", put);
    const { client, calls } = fakeClient(portal({
      [`POST /providers/${PID}/documents`]: () => ({ id: "d-9", upload: { url: "https://storage.test/d-9", headers: { "Content-Type": "application/pdf" } } }),
      [`POST /providers/${PID}/documents/d-9/complete`]: () => ({ id: "d-9" })
    }));
    renderApp(<DocumentsScreen />, client, HOST);
    drop(await screen.findByTestId("document-drop"), [file("ci.pdf", "application/pdf")]);
    await screen.findByTestId("document-chosen");
    fireEvent.click(screen.getByTestId("document-upload"));
    expect(await screen.findByText("Documento subido.")).toBeTruthy();
    expect(put).toHaveBeenCalledTimes(1);
    expect(calls.filter((call) => call.method === "POST").map((call) => call.path)).toEqual([`/providers/${PID}/documents`, `/providers/${PID}/documents/d-9/complete`]);
  });

  it("refuses a dropped file of another type with the reason, and sends nothing", async () => {
    const { client, calls } = fakeClient(portal());
    renderApp(<DocumentsScreen />, client, HOST);
    drop(await screen.findByTestId("document-drop"), [file("nota.txt", "text/plain")]);
    fireEvent.click(await screen.findByTestId("document-upload"));
    expect(await screen.findByText("Solo PDF, JPG, PNG o WebP.")).toBeTruthy();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("says why an iPhone HEIC photo is not accepted and how to send it, instead of the generic type error", async () => {
    const { client, calls } = fakeClient(portal());
    renderApp(<DocumentsScreen />, client, HOST);
    drop(await screen.findByTestId("document-drop"), [file("ci.heic", "")]);
    fireEvent.click(await screen.findByTestId("document-upload"));
    expect(await screen.findByText(/Las fotos HEIC del iPhone no se aceptan aquí/)).toBeTruthy();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });

  it("explains that a picture dragged from another page is not a file, and says it takes one document at a time", async () => {
    const { client } = fakeClient(portal());
    renderApp(<DocumentsScreen />, client, HOST);
    const zone = await screen.findByTestId("document-drop");
    drop(zone, [], ["text/uri-list"]);
    expect(await screen.findByText(/Eso no es un archivo/)).toBeTruthy();
    drop(zone, [file("a.pdf", "application/pdf"), file("b.pdf", "application/pdf")]);
    expect(await screen.findByText(/Se sube un documento por vez/)).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("document-chosen").textContent).toContain("a.pdf"));
  });

  it("does not let a file dropped outside the zone navigate away", async () => {
    const { client } = fakeClient(portal());
    renderApp(<DocumentsScreen />, client, HOST);
    await screen.findByTestId("document-drop");
    const event = createEvent.drop(document.body);
    Object.defineProperty(event, "dataTransfer", { value: { files: [file("x.pdf", "application/pdf")], types: ["Files"], items: [], dropEffect: "" } });
    fireEvent(document.body, event);
    expect(event.defaultPrevented).toBe(true);
  });
});

describe("admin KYP documents: drag and drop per kind", () => {
  it("a PDF dropped on one kind is registered for that kind, sent to the signed URL and completed", async () => {
    const put = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", put);
    const { client, calls } = fakeClient({
      "POST /providers/admin/intakes/i-1/documents": () => ({ documentId: "k-1", uploadUrl: "https://storage.test/k-1", method: "PUT", headers: { "Content-Type": "application/pdf" } }),
      "POST /providers/admin/intakes/i-1/documents/k-1/complete": () => ({ id: "k-1" })
    });
    renderApp(<IntakeDocuments intakeId="i-1" required={["IDENTITY", "TAX_ID"]} documents={[]} errors={{}} />, client, ADMIN);
    const zone = await screen.findByTestId("kyp-doc-drop-TAX_ID");
    expect(screen.getByTestId("kyp-doc-upload-TAX_ID")).toBeTruthy();
    drop(zone, [file("nit.pdf", "application/pdf")]);
    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    const posts = calls.filter((call) => call.method === "POST");
    expect((posts[0]?.body as { kind: string; fileName: string }).kind).toBe("TAX_ID");
    expect((posts[0]?.body as { fileName: string }).fileName).toBe("nit.pdf");
    await waitFor(() => expect(posts).toHaveLength(2));
  });

  it("refuses a file that is too big before any request", async () => {
    const { client, calls } = fakeClient({});
    renderApp(<IntakeDocuments intakeId="i-1" required={["IDENTITY"]} documents={[]} errors={{}} />, client, ADMIN);
    drop(await screen.findByTestId("kyp-doc-drop-IDENTITY"), [file("grande.pdf", "application/pdf", 11 * 1024 * 1024)]);
    expect(await screen.findByText("El archivo supera los 10 MB.")).toBeTruthy();
    expect(calls.some((call) => call.method === "POST")).toBe(false);
  });
});
