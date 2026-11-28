// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocationView, type LocationLabels } from "./location-view.js";

const labels: LocationLabels = { showMap: "Ver mapa", hideMap: "Ocultar mapa", directions: "Cómo llegar", copy: "Copiar dirección", copied: "Copiada", copyFailed: "No se copió", mapLabel: "Mapa de Salón", privacy: "Se conecta a OpenStreetMap", loading: "Cargando", unavailable: "Sin mapa", openInOsm: "Abrir en OSM", unverified: "Sin verificar", searchNote: "Es una búsqueda" };
const PIN = { lat: -16.5, lng: -68.15, source: "pin" as const };

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("LocationView", () => {
  it("shows text first; the map is not requested until the guest asks, then it loads with the backend's tile settings", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ tileUrl: "https://tiles.example/{z}/{x}/{y}.png", attribution: "© Otro", maxZoom: 18, searchEnabled: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const view = render(<LocationView name="Salón" lines={["Av. Arce 1", "Portón verde"]} location={PIN} labels={labels} mapConfigUrl="https://api.example/providers/geo/map-config" />);
    expect(view.container.textContent).toContain("Av. Arce 1");
    expect(view.container.querySelector(".celebration-map")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    const open = view.getByRole("button", { name: "Ver mapa" });
    expect(open.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(open);
    await waitFor(() => expect(view.container.querySelector(".celebration-map")).not.toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(view.container.querySelector(".celebration-map")?.getAttribute("aria-label")).toBe("Mapa de Salón");
    expect(view.container.textContent).toContain("Se conecta a OpenStreetMap");
    expect(view.getByRole("button", { name: "Ocultar mapa" }).getAttribute("aria-expanded")).toBe("true");
    expect(view.getByRole("link", { name: "Cómo llegar" }).getAttribute("href")).toBe("https://www.openstreetmap.org/directions?route=%3B-16.500000%2C-68.150000");
    expect(view.container.innerHTML).not.toContain("google");
  });

  it("without map settings reachable it falls back to OpenStreetMap's own server, and without a point only text and copy are offered", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const view = render(<LocationView name="Salón" lines={[]} location={PIN} labels={labels} mapConfigUrl="https://api.example/x" />);
    fireEvent.click(view.getByRole("button", { name: "Ver mapa" }));
    await waitFor(() => expect(view.container.querySelector(".celebration-map")).not.toBeNull());
    cleanup();
    const textOnly = render(<LocationView name="Salón" lines={["Av. Arce 1"]} labels={labels} />);
    expect(textOnly.queryByRole("button", { name: "Ver mapa" })).toBeNull();
    // Old invitation with no pin: «Cómo llegar» opens OpenStreetMap's search of the written address, never a pasted link.
    expect(textOnly.getByRole("link", { name: "Cómo llegar" }).getAttribute("href")).toBe("https://www.openstreetmap.org/search?query=Av.%20Arce%201");
    expect(textOnly.container.textContent).toContain("Es una búsqueda");
    expect(textOnly.getByRole("button", { name: "Copiar dirección" })).toBeTruthy();
  });

  it("without a point nor address it searches the name, and with nothing searchable offers no link", () => {
    const byName = render(<LocationView name="Salón Los Pinos" lines={[]} labels={labels} />);
    expect(byName.getByRole("link", { name: "Cómo llegar" }).getAttribute("href")).toBe("https://www.openstreetmap.org/search?query=Sal%C3%B3n%20Los%20Pinos");
    cleanup();
    const nothing = render(<LocationView name="---" lines={["https://maps.app.goo.gl/abc"]} labels={labels} />);
    expect(nothing.queryByRole("link", { name: "Cómo llegar" })).toBeNull();
    expect(nothing.container.textContent).not.toContain("Es una búsqueda");
  });

  it("copies the name and address, and says when it could not", async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const view = render(<LocationView name="Salón" lines={["Av. Arce 1"]} location={PIN} labels={labels} />);
    fireEvent.click(view.getByRole("button", { name: "Copiar dirección" }));
    await waitFor(() => expect(view.container.textContent).toContain("Copiada"));
    expect(writeText).toHaveBeenCalledWith("Salón, Av. Arce 1");
    writeText.mockRejectedValueOnce(new Error("denied"));
    fireEvent.click(view.getByRole("button", { name: "Copiar dirección" }));
    await waitFor(() => expect(view.container.textContent).toContain("No se copió"));
  });

  it("marks a point read from an old link as unverified", () => {
    const view = render(<LocationView name="Salón" lines={[]} location={{ ...PIN, source: "legacy-link" }} labels={labels} />);
    expect(view.container.textContent).toContain("Sin verificar");
  });
});
