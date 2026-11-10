import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GiftsScreen } from "../src/host/gifts/gifts-screen";
import { PublishScreen } from "../src/host/publish-checklist";
import { SettingsScreen } from "../src/host/settings-screen";
import { CelebrationsScreen } from "../src/host/celebrations";
import { baseHandlers, fakeClient, renderApp } from "./support";

/** The owner's rule applied to gifts, invitation and settings: one primary action in the header, the rest in «⋯», nothing repeated. */
const navigate = vi.fn();
const gifts = { "GET /gifts/celebrations/c-1/list": () => ({ items: [] }), "GET /gifts/celebrations/c-1/reservations": () => ({ items: [] }) };

describe("host header rule", () => {
  it("no screen repeats the celebration's name and type under its title", async () => {
    const { client } = fakeClient({ ...baseHandlers(), ...gifts });
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("go-add");
    expect(screen.queryByText(/Ana y Luis · Boda/)).toBeNull();
  });

  it("the gifts list has a single «Agregar regalo» in the header and it navigates to the add flow", async () => {
    const { client } = fakeClient({ ...baseHandlers(), ...gifts });
    renderApp(<GiftsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    fireEvent.click(await screen.findByTestId("go-add"));
    expect(navigate).toHaveBeenCalledWith("/regalos/catalogo?c=c-1");
    expect(screen.getAllByRole("button", { name: "Agregar regalo" })).toHaveLength(1);
  });

  it("settings: time zone and currency stay under «Más opciones»; one «Guardar» sends nothing when nothing changed", async () => {
    const { client, calls } = fakeClient(baseHandlers());
    renderApp(<SettingsScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("save-settings");
    expect(screen.queryByTestId("settings-time-zone")).toBeNull();
    expect(screen.queryByTestId("save-deadline")).toBeNull();
    fireEvent.click(screen.getByTestId("more-settings"));
    expect(screen.getByTestId("settings-time-zone")).toBeTruthy();
    fireEvent.click(screen.getByTestId("save-settings"));
    await waitFor(() => expect(screen.getByText("Configuración guardada.")).toBeTruthy());
    expect(calls.some((call) => call.method === "PATCH" || call.method === "PUT")).toBe(false);
  });

  it("publish: the draft's primary action is «Publicar celebración»; archiving is only in the «⋯» menu", async () => {
    const { client } = fakeClient({ ...baseHandlers(), "GET /celebrations/c-1/publish-check": () => ({ ready: true, missingFields: [] }) });
    renderApp(<PublishScreen celebrationId="c-1" onNavigate={navigate} />, client);
    await screen.findByTestId("publish");
    expect(screen.queryByTestId("archive")).toBeNull();
    fireEvent.click(screen.getByTestId("more-publish"));
    expect(await screen.findByRole("menuitem", { name: "Archivar" })).toBeTruthy();
  });

  it("my celebrations: «Nueva celebración» lives in the header, once, also when the list is empty", async () => {
    const { client } = fakeClient({ "GET /celebrations": () => ({ items: [] }) });
    renderApp(<CelebrationsScreen onNavigate={navigate} />, client);
    expect(await screen.findByText("Aquí vivirán tus celebraciones")).toBeTruthy();
    expect(screen.getAllByTestId("create-celebration")).toHaveLength(1);
  });
});
