import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// La app web la sirve nginx. `deploy/nginx-check.sh` (CI, nginx real) comprueba lo que responde; esto falla antes y sin Docker.
const conf = readFileSync(resolve(process.cwd(), "../../deploy/nginx-security-headers.conf"), "utf8");

describe("cabeceras de seguridad de la app web (nginx)", () => {
  it("permite la geolocalización solo al propio origen («Usar mi ubicación», «Cerca de mí») y mantiene cerrado lo demás", () => {
    const policies = [...conf.matchAll(/^add_header Permissions-Policy "([^"]*)" always;$/gm)].map((match) => match[1]);
    expect(policies).toEqual(["camera=(), microphone=(), geolocation=(self), payment=(), usb=()"]);
  });
});
