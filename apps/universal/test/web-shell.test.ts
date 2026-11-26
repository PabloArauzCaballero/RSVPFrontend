import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { languageBootScript, webBootJs, webIndexHtml } from "../src/platform/web-shell";

/**
 * M12 · the single-page export builds its document from `public/index.html` (app/+html.tsx is ignored with
 * `web.output: "single"`). The files are generated: `yarn workspace @rsvp/universal web-shell` rewrites them
 * (`WRITE_WEB_SHELL=1`), and this test fails when they drift from the tokens, keys or languages.
 */
const publicDir = join(process.cwd(), "public");
const files = { "index.html": webIndexHtml(), "web-boot.js": webBootJs } as const;

if (process.env.WRITE_WEB_SHELL === "1") for (const [name, content] of Object.entries(files)) writeFileSync(join(publicDir, name), content);

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); document.documentElement.removeAttribute("lang"); });

describe("M12 · web document of the single-page export", () => {
  it.each(Object.keys(files))("public/%s is up to date (run `yarn workspace @rsvp/universal web-shell` after changing tokens or keys)", (name) => {
    expect(readFileSync(join(publicDir, name), "utf8")).toBe(files[name as keyof typeof files]);
  });

  it("declares es-BO, colour schemes, the blocking boot script and the font preconnects; no inline script (CSP script-src 'self')", () => {
    const html = files["index.html"];
    expect(html).toMatch(/<html lang="es-BO">/);
    expect(html).toContain('<meta name="color-scheme" content="light dark" />');
    expect(html).toMatch(/<script src="\/web-boot\.js\?v=[0-9a-f]{12}"><\/script>/);
    expect(html).toContain('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />');
    expect(html.indexOf("web-boot.js")).toBeLessThan(html.indexOf("fonts.googleapis.com/css2"));
    expect(html.match(/<script(?![^>]*\ssrc=)[^>]*>/g)).toBeNull();
  });

  const lang = (stored: string | null, languages: readonly string[]): string => {
    if (stored) localStorage.setItem("rsvp.locale", stored);
    vi.spyOn(window.navigator, "languages", "get").mockReturnValue(languages);
    new Function(languageBootScript)();
    return document.documentElement.lang;
  };

  it.each([
    [null, ["es-BO"], "es-BO"],
    [null, ["es-AR", "en-US"], "es-BO"],
    [null, ["en-GB", "es-BO"], "en-US"],
    [null, ["fr-FR", "de-DE"], "es-BO"],
    [null, ["fr-FR", "en-US"], "en-US"],
    [null, [], "es-BO"],
    ["en-US", ["es-BO"], "en-US"],
    ["es-BO", ["en-US"], "es-BO"]
  ] as const)("before paint: stored %s, browser %j → lang=%s (same rule as resolveLocale)", (stored, languages, expected) => {
    expect(lang(stored, languages)).toBe(expected);
  });

  it("a storage that throws (private mode) still gets a language", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(lang(null, ["en-US"])).toBe("en-US");
  });
});
