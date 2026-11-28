import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Linking } from "react-native";
import { PlaceView as NativePlaceView } from "../src/platform/place-view.native";
import { PlaceView as WebPlaceView } from "../src/platform/place-view";
import { fakeClient, renderApp } from "./support";
import { resetWebViews, webViews } from "./stubs/react-native-webview";

const POINT = { lat: -16.5, lng: -68.15 };
const show = (ui: JSX.Element): void => { renderApp(ui, fakeClient({}).client); };

beforeEach(() => { vi.restoreAllMocks(); resetWebViews(); });

describe("un lugar en la app (V3 partner): sin enlaces pegados", () => {
  it.each([["web", WebPlaceView], ["nativo", NativePlaceView]] as const)("%s: con punto, «Cómo llegar» abre las indicaciones de OpenStreetMap y el mapa solo carga al pedirlo", (_name, PlaceView) => {
    const open = vi.spyOn(Linking, "openURL").mockResolvedValue(true);
    show(<PlaceView name="Dulce Sol" address="Av. Arce 100" point={POINT} />);
    expect(screen.getByText("Av. Arce 100")).toBeTruthy();
    expect(webViews.current).toBeNull();
    expect(screen.queryByTestId("place-iframe")).toBeNull();
    fireEvent.click(screen.getByTestId("place-directions"));
    expect(open).toHaveBeenCalledWith("https://www.openstreetmap.org/directions?route=%3B-16.500000%2C-68.150000");
    fireEvent.click(screen.getByTestId("place-map-toggle"));
    const uri = webViews.current?.source?.uri ?? screen.getByTestId("place-iframe").getAttribute("src") ?? "";
    expect(uri).toContain("/mapa/incrustado?lat=-16.500000&lng=-68.150000");
    expect(uri).toContain("mode=view");
    expect(uri).not.toContain("google");
  });

  it.each([["web", WebPlaceView], ["nativo", NativePlaceView]] as const)("%s: sin punto, «Cómo llegar» busca la dirección escrita en openstreetmap.org y lo dice", (_name, PlaceView) => {
    const open = vi.spyOn(Linking, "openURL").mockResolvedValue(true);
    show(<PlaceView name="Dulce Sol" address="Av. Arce 100, La Paz" />);
    expect(screen.queryByTestId("place-map-toggle")).toBeNull();
    fireEvent.click(screen.getByTestId("place-directions"));
    expect(open).toHaveBeenCalledWith("https://www.openstreetmap.org/search?query=Av.%20Arce%20100%2C%20La%20Paz");
    expect(screen.getByText(/búsqueda de esta dirección en OpenStreetMap/)).toBeTruthy();
  });

  it("el web view nativo solo carga la página de mapa del propio sitio", () => {
    show(<NativePlaceView name="Dulce Sol" point={POINT} />);
    fireEvent.click(screen.getByTestId("place-map-toggle"));
    const view = webViews.current;
    expect(view?.onShouldStartLoadWithRequest?.({ url: view.source?.uri ?? "", isTopFrame: true })).toBe(true);
    expect(view?.onShouldStartLoadWithRequest?.({ url: "https://www.google.com/maps?q=1,2", isTopFrame: true })).toBe(false);
    expect(view?.onShouldStartLoadWithRequest?.({ url: "https://evil.example/mapa/incrustado", isTopFrame: true })).toBe(false);
  });

  it("sin dirección buscable no ofrece «Cómo llegar»", () => {
    show(<WebPlaceView name="---" address="https://maps.app.goo.gl/x" />);
    expect(screen.queryByTestId("place-directions")).toBeNull();
  });
});
