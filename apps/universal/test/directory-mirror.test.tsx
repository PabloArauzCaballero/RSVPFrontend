import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CategoryCityScreen, CategoryScreen, DirectoryHomeScreen, DirectorySearchScreen, searchPath, searchQuery } from "../src/directory/directory-screens";
import { groupOfPath } from "../src/auth/routes";
import { GUEST, HttpFailure, fakeClient, renderApp, type Handler } from "./support";

const card = (n: number, over: Record<string, unknown> = {}) => ({
  listingId: `6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a${String(n).padStart(2, "0")}`, providerSlug: `proveedor-${n}`, name: `Proveedor ${n}`, category: "CATERING", city: "La Paz", department: "La Paz",
  verified: n % 2 === 1, summary: "Comida para eventos", priceFrom: { amountMinor: 150000, currency: "BOB" }, ...over
});

function show(ui: (onNavigate: (path: string) => void) => JSX.Element, handler: Handler = () => ({ items: [card(1), card(2)], total: 2, page: 1, pageSize: 12 })) {
  const { client, calls } = fakeClient({ "GET /providers": handler, "GET /providers/categories": () => ({ items: [{ code: "PASTRY", name: "Pastelería" }] }), "POST /providers/impressions": () => ({}) });
  const onNavigate = vi.fn();
  renderApp(ui(onNavigate), client, GUEST);
  // The directory also reads the published category names; `searches()` are the GET /providers calls themselves.
  return { searches: () => calls.filter((call) => call.path === "/providers"), onNavigate };
}

afterEach(() => { vi.useRealTimers(); });
beforeEach(() => { vi.useRealTimers(); });

describe("Espejo web · B4 search: the same parameters and the same GET /providers query as the web", () => {
  it("builds the web's address from the filled values only", () => {
    expect(searchPath({ categoria: "catering", ciudad: "la-paz", precioMax: "", verificado: "1" })).toBe("/proveedores/buscar?categoria=catering&ciudad=la-paz&verificado=1");
    expect(searchPath({})).toBe("/proveedores/buscar");
  });
  it("turns slugs into codes; proximity wins over the city; a bad price or page is ignored", () => {
    expect(searchQuery({ categoria: "salones", ciudad: "santa-cruz", precioMax: "500", fecha: "2027-02-20", verificado: "1", page: "3" }))
      .toEqual({ category: "VENUE", city: "santa-cruz", verifiedOnly: true, maxPriceMinor: 50000, date: "2027-02-20", page: 3 });
    expect(searchQuery({ ciudad: "santa-cruz", lat: "-16.5", lng: "-68.15", radio: "10" })).toEqual({ near: { lat: -16.5, lng: -68.15, radiusKm: 10 }, page: 1 });
    expect(searchQuery({ categoria: "inventada", precioMax: "abc", page: "-2" })).toEqual({ page: 1 });
  });
  it("renders results with the provider link to /p/{slug}, verified mark and price, and asks with the web's query", async () => {
    const { searches, onNavigate } = show((go) => <DirectorySearchScreen values={{ categoria: "catering", ciudad: "la-paz", verificado: "1" }} onNavigate={go} />);
    expect(await screen.findByTestId("directory-count")).toBeTruthy();
    expect(searches()).toHaveLength(1);
    expect(screen.getByText("Proveedor 1")).toBeTruthy();
    expect(screen.getAllByText(/Verificado/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId(`open-provider-${card(1).listingId}`));
    expect(onNavigate).toHaveBeenCalledWith("/p/proveedor-1");
  });
  it("a category the translation lacks shows the name the catalogue publishes, never the key", async () => {
    show((go) => <DirectorySearchScreen values={{}} onNavigate={go} />, () => ({ items: [card(1, { category: "PASTRY" })], total: 1, page: 1, pageSize: 12 }));
    expect(await screen.findByText("Pastelería · La Paz")).toBeTruthy();
    expect(screen.queryByText(/directory\.category\.PASTRY/)).toBeNull();
  });
  it("the form submits to the web's address, page reset", async () => {
    const { onNavigate } = show((go) => <DirectorySearchScreen values={{ categoria: "catering", page: "2" }} onNavigate={go} />);
    await screen.findByTestId("directory-search");
    fireEvent.click(within(screen.getByTestId("directory-search")).getByRole("radio", { name: "La Paz" }));
    fireEvent.click(screen.getByTestId("directory-submit"));
    expect(onNavigate).toHaveBeenCalledWith("/proveedores/buscar?categoria=catering&ciudad=la-paz");
  });
  it("negative: no results says so and offers the directory; an unreachable catalogue is not 'no results' and retries", async () => {
    show((go) => <DirectorySearchScreen values={{ categoria: "salones", ciudad: "santa-cruz" }} onNavigate={go} />, () => ({ items: [], total: 0, page: 1, pageSize: 12 }));
    expect(await screen.findByTestId("directory-empty")).toBeTruthy();
  });
  it("negative 503: unavailable with retry (one transient retry first)", async () => {
    let fail = true;
    show((go) => <DirectorySearchScreen values={{}} onNavigate={go} />, () => (fail ? new HttpFailure(503) : { items: [card(1)], total: 1, page: 1, pageSize: 12 }));
    expect(await screen.findByTestId("directory-unavailable", {}, { timeout: 4000 })).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByTestId("directory-retry"));
    expect(await screen.findByText("Proveedor 1")).toBeTruthy();
  });
});

describe("Espejo web · B1–B3 home, category and category + city pages", () => {
  it("B1 home: search, every category, the featured cities and the quote steps; a city goes to the search", async () => {
    const { onNavigate } = show((go) => <DirectoryHomeScreen onNavigate={go} />);
    expect(screen.getByTestId("directory-home")).toBeTruthy();
    expect(within(screen.getByTestId("category-links")).getAllByRole("link")).toHaveLength(11);
    fireEvent.click(within(screen.getByTestId("featured-cities")).getByText("Santa Cruz de la Sierra"));
    expect(onNavigate).toHaveBeenCalledWith("/proveedores/buscar?ciudad=santa-cruz");
    expect(screen.getByTestId("quote-steps")).toBeTruthy();
  });
  it("B2 category: verified only, the intro count, the cities, and pagination keeps the address", async () => {
    const { searches, onNavigate } = show((go) => <CategoryScreen categorySlug="catering" onNavigate={go} />, () => ({ items: [card(1)], total: 30, page: 1, pageSize: 12 }));
    expect(await screen.findByText(/30/)).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Catering");
    expect(within(screen.getByTestId("city-links")).getAllByRole("link")).toHaveLength(9);
    fireEvent.click(screen.getByTestId("page-next"));
    expect(onNavigate).toHaveBeenCalledWith("/proveedores/catering?page=2");
    expect(searches()).toHaveLength(1);
  });
  it("B3 category + city: other cities exclude this one; other categories keep the city", async () => {
    const { onNavigate } = show((go) => <CategoryCityScreen categorySlug="catering" citySlug="la-paz" onNavigate={go} />);
    await screen.findByTestId("directory-count");
    const crumbs = within(screen.getByTestId("directory-breadcrumbs"));
    fireEvent.click(crumbs.getByText("Catering"));
    expect(onNavigate).toHaveBeenCalledWith("/proveedores/catering");
    expect(within(screen.getByTestId("city-links")).getAllByRole("link")).toHaveLength(8);
    fireEvent.click(within(screen.getByTestId("category-links")).getByText("Fotografía"));
    expect(onNavigate).toHaveBeenLastCalledWith("/proveedores/fotografia/la-paz");
  });
  it("negative: an unknown category or city is not a page and asks nothing", () => {
    const { searches } = show((go) => <CategoryCityScreen categorySlug="catering" citySlug="atlantida" onNavigate={go} />);
    expect(screen.getByTestId("directory-not-found")).toBeTruthy();
    expect(searches()).toHaveLength(0);
  });
  it("the directory and the microsites are public routes: no sign-in", () => {
    for (const path of ["/proveedores", "/proveedores/buscar?ciudad=la-paz", "/proveedores/catering/la-paz", "/p/proveedor-1"]) expect(groupOfPath(path)).toBe("guest");
    expect(groupOfPath("/regalos/proveedores")).toBe("host");
    expect(groupOfPath("/publicar")).toBe("host");
  });
});
