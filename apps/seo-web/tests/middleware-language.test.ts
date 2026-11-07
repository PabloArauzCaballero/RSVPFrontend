import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { middleware } from "../middleware";

const get = (path: string, headers: Record<string, string> = {}): NextRequest => new NextRequest(`http://localhost:3000${path}`, { headers });

describe("one address, one language (middleware)", () => {
  it("sends a browser that asks for English, with no choice yet, to the English address and remembers it", () => {
    const response = middleware(get("/proveedores", { "accept-language": "en-US,en;q=0.9" }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/proveedores?lang=en-US");
    expect(response.cookies.get("rsvp-lang")?.value).toBe("en-US");
    expect(response.headers.get("vary")).toMatch(/Accept-Language/);
  });

  it("keeps the query and replaces nothing else when redirecting", () => {
    const response = middleware(get("/proveedores/buscar?categoria=salones&page=2", { "accept-language": "en" }));
    expect(response.headers.get("location")).toBe("http://localhost:3000/proveedores/buscar?categoria=salones&page=2&lang=en-US");
  });

  it("serves the clean address in Spanish to a crawler (no Accept-Language) and to a Spanish browser", () => {
    expect(middleware(get("/proveedores")).status).toBe(200);
    expect(middleware(get("/proveedores", { "accept-language": "es-BO,es;q=0.9" })).status).toBe(200);
  });

  it("does not redirect when the visitor already chose (explicit ?lang= or the cookie)", () => {
    expect(middleware(get("/proveedores?lang=es-BO", { "accept-language": "en-US" })).status).toBe(200);
    expect(middleware(get("/proveedores?lang=en-US", { "accept-language": "en-US" })).status).toBe(200);
    expect(middleware(get("/proveedores", { "accept-language": "en-US", cookie: "rsvp-lang=en-US" })).status).toBe(200);
  });

  it("never redirects the partner redirector, well-known files or the celebration and RSVP pages (they negotiate their own language)", () => {
    for (const path of ["/r/3fa85f64-5717-4562-b3fc-2c963f66afa6", "/.well-known/assetlinks", "/c/boda/rsvp", "/rsvp/token123"]) {
      expect(middleware(get(path, { "accept-language": "en-US" })).status, path).toBe(200);
    }
  });
});
