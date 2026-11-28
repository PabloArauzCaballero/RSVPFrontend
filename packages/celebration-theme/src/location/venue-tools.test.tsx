// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VenueDetails } from "./venue-details.js";

const { map, tileHandlers, tileLayer, marker, remove } = vi.hoisted(() => {
  const handlers: Record<string, () => void> = {};
  const removeMap = vi.fn();
  return {
    tileHandlers: handlers,
    remove: removeMap,
    map: vi.fn(() => ({ attributionControl: { setPrefix: vi.fn() }, remove: removeMap })),
    tileLayer: vi.fn(() => ({ on: (name: string, handler: () => void) => { handlers[name] = handler; }, addTo: vi.fn() })),
    marker: vi.fn(() => ({ addTo: vi.fn() }))
  };
});
vi.mock("leaflet", () => ({ default: { map, tileLayer, marker, divIcon: vi.fn(() => ({})) } }));

const t = (key: string, values?: Readonly<Record<string, string | number>>): string => (values ? `${key}|${Object.values(values).join(",")}` : key);
const PLACE = { key: "main", kind: "other" as const, name: "Salón", address: "Calle 1", location: { lat: -17.78, lng: -63.18, source: "pin" as const, reference: "portón azul" } };
const writeText = vi.fn<(text: string) => Promise<void>>();

beforeEach(() => {
  vi.clearAllMocks();
  writeText.mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

const showMap = (view: ReturnType<typeof render>): void => { fireEvent.click(view.getByRole("button", { name: "celebration.media.showMap|Salón" })); };

describe("the map of a place", () => {
  it("loads nothing until the tap; then it draws the pin on OpenStreetMap tiles with attribution and takes the focus", async () => {
    const view = render(<VenueDetails venue={PLACE} t={t} />);
    expect(map).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("celebration.media.privacy|OpenStreetMap");
    showMap(view);
    expect(view.container.textContent).toContain("celebration.media.loading|OpenStreetMap");
    await waitFor(() => expect(marker).toHaveBeenCalledWith([-17.78, -63.18], expect.objectContaining({ keyboard: false })));
    expect(tileLayer).toHaveBeenCalledWith("https://tile.openstreetmap.org/{z}/{x}/{y}.png", expect.objectContaining({ referrerPolicy: "strict-origin-when-cross-origin", attribution: expect.stringContaining("openstreetmap.org/copyright") }));
    const canvas = view.getByRole("region", { name: "celebration.venues.mapLabel|Salón" });
    expect(document.activeElement).toBe(canvas);
    act(() => { tileHandlers["tileload"]?.(); });
    expect(view.container.querySelector(".celebration-map")?.getAttribute("data-phase")).toBe("ready");
    // A later batch with errors does not take away a map already on screen.
    act(() => { tileHandlers["load"]?.(); });
    expect(view.queryByRole("alert")).toBeNull();
    view.unmount();
    expect(remove).toHaveBeenCalled();
  });

  it("when no tile arrives it says so, keeps the address and directions, and retrying builds the map again", async () => {
    const view = render(<VenueDetails venue={PLACE} t={t} />);
    showMap(view);
    await waitFor(() => expect(map).toHaveBeenCalledTimes(1));
    act(() => { tileHandlers["load"]?.(); });
    expect(view.getByRole("alert").textContent).toBe("celebration.media.loadFailed|OpenStreetMap");
    // A tile that arrives after giving up changes nothing, and the abandoned map is removed.
    act(() => { tileHandlers["tileload"]?.(); });
    expect(view.container.querySelector(".celebration-map")?.getAttribute("data-phase")).toBe("failed");
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    expect(view.container.textContent).toContain("Calle 1");
    expect(view.getByRole("link", { name: "celebration.venues.directionsName|Salón" }).getAttribute("href")).toBe("https://www.openstreetmap.org/directions?to=-17.780000%2C-63.180000");
    fireEvent.click(view.getByRole("button", { name: "celebration.media.retry|Salón" }));
    await waitFor(() => expect(map).toHaveBeenCalledTimes(2));
  });

  it("a map that never answers ends in the same alert at the deadline", async () => {
    vi.useFakeTimers();
    const view = render(<VenueDetails venue={PLACE} t={t} />);
    showMap(view);
    await act(async () => { await vi.advanceTimersByTimeAsync(12_001); });
    expect(view.getByRole("alert")).toBeTruthy();
  });

  it("respects reduced motion", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    showMap(render(<VenueDetails venue={PLACE} t={t} />));
    await waitFor(() => expect(map).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ zoomAnimation: false, fadeAnimation: false, inertia: false, scrollWheelZoom: false })));
    vi.unstubAllGlobals();
  });
});

describe("copy address", () => {
  const press = (view: ReturnType<typeof render>): void => { fireEvent.click(view.getByRole("button", { name: "celebration.venues.copyName|Salón" })); };

  it("copies name, address and reference, and announces it", async () => {
    const view = render(<VenueDetails venue={PLACE} t={t} />);
    press(view);
    await waitFor(() => expect(view.container.textContent).toContain("celebration.venues.copied"));
    expect(writeText).toHaveBeenCalledWith("Salón, Calle 1, portón azul");
  });

  it("with a point and no written address it adds the coordinates; without either it copies the name", async () => {
    const view = render(<VenueDetails venue={{ key: "main", kind: "other", name: "Salón", location: { lat: -17.78, lng: -63.18, source: "legacy-link" } }} t={t} />);
    press(view);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("Salón, -17.780000, -63.180000"));
    cleanup();
    const bare = render(<VenueDetails venue={{ key: "main", kind: "other", name: "Salón" }} t={t} />);
    const search = bare.getByRole("link", { name: "celebration.venues.searchName|Salón" });
    expect(search.getAttribute("href")).toBe("https://www.openstreetmap.org/search?query=Sal%C3%B3n");
    expect(search.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(bare.container.textContent).toContain("celebration.venues.searchOnly");
    expect(bare.queryByRole("button", { name: "celebration.media.showMap|Salón" })).toBeNull();
    press(bare);
    await waitFor(() => expect(writeText).toHaveBeenLastCalledWith("Salón"));
  });

  it("when the browser refuses, it shows the text to copy by hand", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    const view = render(<VenueDetails venue={PLACE} t={t} />);
    press(view);
    await waitFor(() => expect(view.container.querySelector(".celebration-venue-copytext")?.textContent).toBe("Salón, Calle 1, portón azul"));
    expect(view.container.textContent).toContain("celebration.venues.copyFailed");
  });
});
