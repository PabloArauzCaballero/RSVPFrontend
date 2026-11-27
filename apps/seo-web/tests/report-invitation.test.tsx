// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createApiClient } from "@rsvp/api-client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ReportInvitation } from "../components/report-invitation";
import { PublicCelebration } from "../components/public-celebration";
import { GALLERY, TEMPLATES, VIEW } from "./celebration-fixtures";

/** F7 · a guest reports the page, or only the music, from the foot of the public invitation (no session, no personal data). */

const anonymous = { getAccessToken: async () => null, getRefreshToken: async () => null, setTokens: async () => undefined, clear: async () => undefined };
interface Sent { readonly url: string; readonly init: RequestInit | undefined }
const sent: Sent[] = [];
const clientWith = (respond: () => Response | Promise<Response>) =>
  createApiClient({ baseUrl: "http://gw.test", tokenStore: anonymous, refreshSession: { refresh: async () => { throw new Error("none"); } }, fetchFn: (async (url: RequestInfo | URL, init?: RequestInit) => { sent.push({ url: String(url), init }); return respond(); }) as typeof fetch });
const problem = (status: number, code: string, headers: Record<string, string> = {}) => new Response(JSON.stringify({ title: code, status, code }), { status, headers: { "content-type": "application/problem+json", ...headers } });
const received = () => new Response(JSON.stringify({ id: "11111111-1111-4111-8111-111111111111", status: "RECEIVED" }), { status: 201, headers: { "content-type": "application/json" } });
const body = (index = 0): Record<string, unknown> => JSON.parse(String(sent[index]?.init?.body));

beforeEach(() => {
  sent.length = 0;
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) { if (this.hasAttribute("open")) { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); } };
});
afterEach(cleanup);

const mount = (props: { music?: boolean; locale?: "es-BO" | "en-US"; respond?: () => Response | Promise<Response> } = {}) =>
  render(<ReportInvitation slug="ana-y-luis" locale={props.locale ?? "es-BO"} hasOwnMusic={props.music ?? false} client={clientWith(props.respond ?? received)} />);
const choose = (reason: string) => fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: reason } });
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Enviar denuncia" }));

describe("the foot of the invitation", () => {
  it("offers to report the page, and the music only when the page plays the host's own MP3", () => {
    mount();
    expect(screen.getByRole("button", { name: "Denunciar esta invitación" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Denunciar la música" })).toBeNull();
    cleanup();
    mount({ music: true });
    expect(screen.getByRole("button", { name: "Denunciar la música" })).toBeTruthy();
  });

  it("speaks English with the English words", () => {
    mount({ locale: "en-US", music: true });
    expect(screen.getByRole("button", { name: "Report this invitation" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Report the music" })).toBeTruthy();
  });
});

describe("reporting the page", () => {
  it("sends the reason and the trimmed comment to the public route, anonymously, and says it was received", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Denunciar esta invitación" }));
    const dialog = screen.getByRole("dialog", { name: "Denunciar esta invitación", hidden: true });
    expect(dialog.hasAttribute("open")).toBe(true);
    expect([...(screen.getByLabelText("Motivo") as HTMLSelectElement).options].map((option) => option.value)).toEqual(["", "SEXUAL_CONTENT", "VIOLENCE_OR_HATE", "SCAM_OR_IMPERSONATION", "COPYRIGHT", "PERSONAL_DATA", "SPAM", "OTHER"]);
    choose("SPAM");
    fireEvent.change(screen.getByLabelText(/Comentario/), { target: { value: "  Publicidad de otro negocio  " } });
    submit();
    expect(await screen.findByText("Recibimos tu denuncia")).toBeTruthy();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.url).toBe("http://gw.test/celebrations/public/ana-y-luis/reports");
    expect(sent[0]?.init?.method).toBe("POST");
    expect(new Headers(sent[0]?.init?.headers).get("authorization")).toBeNull();
    expect(body()).toEqual({ reason: "SPAM", comment: "Publicidad de otro negocio" });
  });

  it("the comment is optional except with «Otro motivo»: nothing is sent without it, and the field is announced", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Denunciar esta invitación" }));
    submit();
    expect((await screen.findAllByRole("alert")).map((node) => node.textContent)).toEqual(["Elige un motivo."]);
    expect(screen.getByLabelText("Motivo").getAttribute("aria-invalid")).toBe("true");
    choose("OTHER");
    submit();
    expect(await screen.findByText("Con este motivo cuéntanos qué pasa en el comentario.")).toBeTruthy();
    expect(screen.getByLabelText(/Comentario/).getAttribute("aria-invalid")).toBe("true");
    expect(sent).toHaveLength(0);
    fireEvent.change(screen.getByLabelText(/Comentario/), { target: { value: "x".repeat(1001) } });
    submit();
    expect(await screen.findByText("El comentario puede tener hasta 1000 caracteres.")).toBeTruthy();
    expect(sent).toHaveLength(0);
  });

  it("whitespace only counts as no comment", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Denunciar esta invitación" }));
    choose("COPYRIGHT");
    fireEvent.change(screen.getByLabelText(/Comentario/), { target: { value: "   " } });
    submit();
    await screen.findByText("Recibimos tu denuncia");
    expect(body()).toEqual({ reason: "COPYRIGHT" });
  });
});

describe("reporting only the music", () => {
  it("names the music, sends the reserved SECTION music element and says the invitation stays up", async () => {
    mount({ music: true });
    fireEvent.click(screen.getByRole("button", { name: "Denunciar la música" }));
    expect(screen.getByRole("dialog", { name: "Denunciar la música", hidden: true })).toBeTruthy();
    expect(screen.getByText(/la invitación y sus fotos siguen visibles/)).toBeTruthy();
    choose("COPYRIGHT");
    submit();
    await screen.findByText("Recibimos tu denuncia");
    expect(body()).toEqual({ reason: "COPYRIGHT", element: { kind: "SECTION", id: "music" } });
  });

  it("the page report that follows is a different report: no element", async () => {
    mount({ music: true });
    fireEvent.click(screen.getByRole("button", { name: "Denunciar la música" }));
    choose("COPYRIGHT"); submit();
    await screen.findByText("Recibimos tu denuncia");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    fireEvent.click(screen.getByRole("button", { name: "Denunciar esta invitación" }));
    choose("SPAM"); submit();
    await waitFor(() => expect(sent).toHaveLength(2));
    expect(body(1)).toEqual({ reason: "SPAM" });
  });
});

// PL-155-V1 · the form unmounts with the focus inside it: keyboard and screen-reader users need an anchor, and a live region that already existed.
describe("focus and announcement", () => {
  const openPage = () => fireEvent.click(screen.getByRole("button", { name: "Denunciar esta invitación" }));

  it("the status region exists while the form is shown, receives the confirmation, and focus lands on its title", async () => {
    mount();
    openPage();
    const region = screen.getByRole("status", { hidden: true });
    expect(region.textContent).toBe("");
    choose("SPAM"); submit();
    const title = await screen.findByRole("heading", { name: "Recibimos tu denuncia", hidden: true });
    expect(screen.getByRole("status", { hidden: true })).toBe(region);
    expect(region.contains(title)).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(title));
  });

  it("a second report starts on a clean form: the previous confirmation is gone before the dialog opens again", async () => {
    mount();
    openPage(); choose("SPAM"); submit();
    await screen.findByText("Recibimos tu denuncia");
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByText("Recibimos tu denuncia")).toBeNull();
    let shownWith = "";
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) { shownWith = this.textContent ?? ""; this.setAttribute("open", ""); };
    openPage();
    expect(shownWith).toContain("Enviar denuncia");
    expect(shownWith).not.toContain("Recibimos tu denuncia");
  });
});

describe("what goes wrong, and what the guest keeps", () => {
  const filled = async (respond: () => Response | Promise<Response>) => {
    mount({ music: true, respond });
    fireEvent.click(screen.getByRole("button", { name: "Denunciar la música" }));
    choose("OTHER");
    fireEvent.change(screen.getByLabelText(/Comentario/), { target: { value: "Es una canción sin permiso" } });
    submit();
  };
  const kept = () => { expect((screen.getByLabelText(/Comentario/) as HTMLTextAreaElement).value).toBe("Es una canción sin permiso"); expect((screen.getByLabelText("Motivo") as HTMLSelectElement).value).toBe("OTHER"); };

  it("429 with Retry-After: says how long to wait, keeps the text and lets them try again", async () => {
    await filled(() => problem(429, "RATE_LIMITED", { "retry-after": "1800" }));
    expect(await screen.findByText("Se enviaron demasiadas denuncias desde tu conexión. Inténtalo de nuevo en 30 min.")).toBeTruthy();
    kept();
    expect((screen.getByRole("button", { name: "Enviar denuncia" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("429 without Retry-After does not invent a number", async () => {
    await filled(() => problem(429, "RATE_LIMITED"));
    expect(await screen.findByText("Se enviaron demasiadas denuncias desde tu conexión. Inténtalo de nuevo más tarde.")).toBeTruthy();
  });

  it("404 (the page went away or is hidden) says so without revealing anything about moderation", async () => {
    await filled(() => problem(404, "NOT_FOUND"));
    expect(await screen.findByText("Esta invitación ya no está disponible, así que no hace falta denunciarla.")).toBeTruthy();
  });

  it("422 ELEMENT_NOT_FOUND (the music is gone) and INVALID_TEXT_CHARACTER have their own words", async () => {
    await filled(() => problem(422, "ELEMENT_NOT_FOUND"));
    expect(await screen.findByText("Esta invitación ya no tiene esa música.")).toBeTruthy();
    cleanup(); sent.length = 0;
    await filled(() => problem(422, "INVALID_TEXT_CHARACTER"));
    expect(await screen.findByText(/caracteres que no podemos aceptar/)).toBeTruthy();
    kept();
  });

  it("a lost connection keeps what they wrote, announces the failure and a second press sends it", async () => {
    let online = false;
    await filled(() => { if (!online) throw new TypeError("Failed to fetch"); return received(); });
    const alert = await screen.findByText(/No pudimos enviar la denuncia. Revisa tu conexión/);
    expect(alert.getAttribute("role")).toBe("alert");
    kept();
    online = true;
    submit();
    expect(await screen.findByText("Recibimos tu denuncia")).toBeTruthy();
    expect(sent).toHaveLength(2);
  });

  it("double press sends once while it is sending", async () => {
    let release: (value: Response) => void = () => undefined;
    await filled(() => new Promise<Response>((resolve) => { release = resolve; }));
    const button = await screen.findByRole("button", { name: "Enviando…" });
    // Announced as unavailable but not `disabled`: a disabled button throws the focus it holds to the body.
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(document.activeElement).toBe(button);
    fireEvent.click(button);
    fireEvent.submit(button.closest("form") as HTMLFormElement);
    expect(sent).toHaveLength(1);
    release(received());
    expect(await screen.findByText("Recibimos tu denuncia")).toBeTruthy();
  });

  // PL-155 N1 · the browser can force the dialog shut while it sends (a second Escape, «back»): `close` fires with the request in flight.
  describe("the browser closes the dialog while it sends", () => {
    const forceClose = () => { const dialog = screen.getByRole("dialog", { hidden: true }); dialog.removeAttribute("open"); fireEvent(dialog, new Event("close")); };
    const reopenPage = () => fireEvent.click(screen.getByRole("button", { name: "Denunciar esta invitación" }));

    it("an answer that arrives after the close leaves nothing in the next report, and its lock does not block the next send", async () => {
      const answers: Array<(value: Response) => void> = [];
      mount({ respond: () => new Promise<Response>((resolve) => { answers.push(resolve); }) });
      reopenPage(); choose("SPAM"); submit();
      await screen.findByRole("button", { name: "Enviando…" });
      forceClose();
      await waitFor(() => expect(screen.getByRole("dialog", { hidden: true }).hasAttribute("open")).toBe(false));
      answers[0]?.(received());
      await new Promise((resolve) => setTimeout(resolve, 20));
      reopenPage();
      expect(screen.queryByText("Recibimos tu denuncia")).toBeNull();
      expect((screen.getByLabelText("Motivo") as HTMLSelectElement).value).toBe("");
      choose("SPAM"); submit();
      await waitFor(() => expect(sent).toHaveLength(2));
      answers[1]?.(received());
      expect(await screen.findByText("Recibimos tu denuncia")).toBeTruthy();
    });

    it("a failure that arrives after the close does not show up in the next report", async () => {
      const answers: Array<(value: Response) => void> = [];
      mount({ respond: () => new Promise<Response>((resolve) => { answers.push(resolve); }) });
      reopenPage(); choose("SPAM"); submit();
      await screen.findByRole("button", { name: "Enviando…" });
      forceClose();
      answers[0]?.(problem(500, "INTERNAL"));
      await new Promise((resolve) => setTimeout(resolve, 20));
      reopenPage();
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.getByRole("button", { name: "Enviar denuncia" })).toBeTruthy();
    });

    it("reopened before the answer, the send works: the old lock is released", async () => {
      const answers: Array<(value: Response) => void> = [];
      mount({ respond: () => new Promise<Response>((resolve) => { answers.push(resolve); }) });
      reopenPage(); choose("SPAM"); submit();
      await screen.findByRole("button", { name: "Enviando…" });
      forceClose();
      reopenPage();
      choose("SPAM"); submit();
      await waitFor(() => expect(sent).toHaveLength(2));
      answers[0]?.(received());
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(screen.queryByText("Recibimos tu denuncia")).toBeNull();
      expect(screen.getByRole("button", { name: "Enviando…" })).toBeTruthy();
      answers[1]?.(received());
      expect(await screen.findByText("Recibimos tu denuncia")).toBeTruthy();
    });
  });
});

describe("the public page carries the foot", () => {
  const page = (view = VIEW, gallery = GALLERY) => ({ view, template: TEMPLATES[0] ?? null, gallery });
  const SONG = { id: "song-1", width: null, height: null, isCover: false, purpose: "music", durationMs: 120000, variants: { audio: "https://media.test/song.mp3" } };

  it("every page has «Denunciar esta invitación»; the music one appears only with an own MP3 and not once moderation hid it", () => {
    const plain = render(<PublicCelebration page={page()} />);
    expect(plain.container.querySelector('[data-report-open="page"]')).toBeTruthy();
    expect(plain.container.querySelector('[data-report-open="music"]')).toBeNull();
    plain.unmount();
    const withSong = render(<PublicCelebration page={page(VIEW, [...GALLERY, SONG])} />);
    expect(withSong.container.querySelector('[data-report-open="music"]')).toBeTruthy();
    withSong.unmount();
    const hidden = render(<PublicCelebration page={page({ ...VIEW, hiddenElements: [{ kind: "SECTION", id: "music" }] }, [...GALLERY, SONG])} />);
    expect(hidden.container.querySelector('[data-report-open="music"]')).toBeNull();
  });

  it("the gifts button and the reply stay on the page whatever happens to the music", () => {
    const { container } = render(<PublicCelebration page={page({ ...VIEW, hiddenElements: [{ kind: "SECTION", id: "music" }] }, [...GALLERY, SONG])} />);
    expect(container.querySelectorAll('a[data-action="gifts"][href="/c/ana-y-luis/regalos"]').length).toBeGreaterThanOrEqual(1);
    expect(container.querySelectorAll('[data-action="rsvp"], [data-action="rsvp-help"]').length).toBeGreaterThanOrEqual(1);
  });
});
