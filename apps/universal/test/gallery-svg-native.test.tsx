import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GalleryEditorScreen } from "../src/host/gallery-editor";
import { baseHandlers, fakeClient, renderApp } from "./support";

/** Without mocks vitest loads the iOS/Android platform files, where `Image` draws no SVG. */
afterEach(cleanup);

describe("E10 · an SVG in the gallery of the app", () => {
  it("shows a placeholder with the file name instead of an empty tile; it keeps its automatic cover mark", async () => {
    const drawing = { id: "d1", celebrationId: "c-1", filename: "dibujo.svg", contentType: "image/svg+xml", sizeBytes: 1, status: "PROCESSED", width: null, height: null, sortOrder: 0, isCover: true, purpose: "gallery", variants: { svg: "https://x.test/d.svg" } };
    const { client } = fakeClient({ ...baseHandlers(), "GET /media/celebrations/c-1/assets": () => ({ items: [drawing] }) });
    renderApp(<GalleryEditorScreen celebrationId="c-1" onNavigate={vi.fn()} />, client);
    expect((await screen.findByTestId("svg-placeholder-d1")).textContent).toBe("dibujo.svg");
    expect(document.querySelector('img[src="https://x.test/d.svg"]')).toBeNull();
    expect(screen.getByText("Portada")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Más opciones: / }));
    expect(await screen.findByRole("menuitem", { name: "Eliminar" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Usar como portada" })).toBeNull();
  });
});
