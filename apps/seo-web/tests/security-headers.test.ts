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
    expect(policies.map(([source]) => source)).toEqual(["/((?!vista-previa$).*)", "/vista-previa"]);
    for (const [, value] of policies) expect(value).toBe(EXPECTED);
  });

  it("las rutas con credencial siguen sin enviar referente", async () => {
    const rules = await nextConfig.headers();
    for (const source of ["/c/:slug/rsvp/:path*", "/c/:slug/rsvp", "/rsvp/:path*", "/vista-previa"]) {
      expect(rules.find((rule) => rule.source === source)?.headers).toContainEqual({ key: "Referrer-Policy", value: "no-referrer" });
    }
  });
});
