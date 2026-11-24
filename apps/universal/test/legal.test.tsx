import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LegalScreen } from "../src/legal/legal-screen";
import { AppProviders } from "../src/platform/providers";

afterEach(cleanup);

describe("B6 · legal texts inside the app", () => {
  it("privacy: draft notice, version, every section and a link to the terms (es-BO)", () => {
    const navigate = vi.fn();
    render(<AppProviders locale="es-BO" claims={{ userId: null, roles: [], organizationIds: [] }}><LegalScreen document="privacy" onNavigate={navigate} /></AppProviders>);
    expect(screen.getByText(/Borrador pendiente de revisión legal/)).toBeTruthy();
    expect(screen.getByText("Versión 2026-11-21-borrador")).toBeTruthy();
    for (const heading of ["Quién es responsable", "Qué datos tratamos", "Para qué los usamos", "Con qué base", "Cuánto tiempo los guardamos", "Tus derechos"]) expect(screen.getByText(heading)).toBeTruthy();
    expect(screen.getByText(/Notas de alimentación o de salud/)).toBeTruthy();
    expect(screen.getByText(/12 meses después de la fecha del evento/)).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "Términos de uso" }));
    expect(navigate).toHaveBeenCalledWith("/terminos");
  });
  it("terms in en-US link back to the privacy policy", () => {
    const navigate = vi.fn();
    render(<AppProviders locale="en-US" claims={{ userId: null, roles: [], organizationIds: [] }}><LegalScreen document="terms" onNavigate={navigate} /></AppProviders>);
    expect(screen.getByText("Terms of use")).toBeTruthy();
    expect(screen.getByText(/Draft pending legal review/)).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "Privacy policy" }));
    expect(navigate).toHaveBeenCalledWith("/privacidad");
  });
});
