import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

interface Header { readonly key: string; readonly value: string }
interface Rule { readonly source: string; readonly headers: readonly Header[] }
const nextConfig = createRequire(import.meta.url)("../next.config.js") as { headers: () => Promise<readonly Rule[]> };

const EXPECTED = "camera=(), microphone=(), geolocation=(self), payment=(), usb=()";

describe("cabeceras de seguridad del sitio público", () => {
  it("permite la geolocalización solo al propio origen («Cerca de mí») y mantiene cerrado lo demás", async () => {
    const rules = await nextConfig.headers();
    const policies = rules.flatMap((rule) => rule.headers.filter((header) => header.key === "Permissions-Policy").map((header) => [rule.source, header.value]));
    expect(policies.map(([source]) => source)).toEqual(["/((?!vista-previa$|mapa/incrustado$).*)", "/vista-previa", "/mapa/incrustado"]);
    for (const [, value] of policies) expect(value).toBe(EXPECTED);
  });

  it("las rutas con credencial siguen sin enviar referente", async () => {
    const rules = await nextConfig.headers();
    for (const source of ["/c/:slug/rsvp/:path*", "/c/:slug/rsvp", "/rsvp/:path*", "/vista-previa"]) {
      expect(rules.find((rule) => rule.source === source)?.headers).toContainEqual({ key: "Referrer-Policy", value: "no-referrer" });
    }
  });

  it("solo /mapa/incrustado y /vista-previa pueden enmarcarse; todo lo demás sigue en DENY y frame-ancestors 'none'", async () => {
    const rules = await nextConfig.headers();
    const value = (rule: Rule | undefined, key: string): string | undefined => rule?.headers.find((header) => header.key === key)?.value;
    const global = rules.find((rule) => rule.source === "/((?!vista-previa$|mapa/incrustado$).*)");
    expect(value(global, "X-Frame-Options")).toBe("DENY");
    expect(value(global, "Content-Security-Policy-Report-Only")).toContain("frame-ancestors 'none'");
    // the global rule must apply to every path except the two framed pages (same matcher Next uses)
    const matcher = new RegExp(`^${global?.source.replace(/\/\(\(\?!/, "/((?!") ?? ""}$`);
    for (const path of ["/", "/c/ana/lugares", "/mapa", "/mapa/incrustado/x", "/mapa/incrustados", "/p/dulce-sol", "/privacidad", "/vista-previa/x"]) expect(matcher.test(path), path).toBe(true);
    for (const path of ["/vista-previa", "/mapa/incrustado"]) expect(matcher.test(path), path).toBe(false);
    const map = rules.find((rule) => rule.source === "/mapa/incrustado");
    expect(value(map, "X-Frame-Options")).toBeUndefined();
    expect(value(map, "Content-Security-Policy")).toMatch(/^frame-ancestors 'self'( https?:\/\/[^ ;]+)?$/);
    expect(value(map, "Content-Security-Policy")).not.toContain("*");
    expect(value(map, "X-Robots-Tag")).toBe("noindex, nofollow");
    expect(value(map, "Permissions-Policy")).toBe(EXPECTED);
    expect(value(map, "Content-Security-Policy-Report-Only")).toBeUndefined();
  });
});
