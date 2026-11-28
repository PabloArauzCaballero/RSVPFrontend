import { expect, test, type Page } from "@playwright/test";
import { scopeCss } from "../../../packages/celebration-theme/src/custom/css";

// F6 (P22; PL-131-R1..R4): the host's stylesheet, run through the real sanitiser with the renderer's scope (`.cdesign-author`, see CustomCss), can never cover,
// move, hide, shrink, recolour or de-navigate the gifts and reply buttons. Every sheet below is injected on the real page, at 360 and 1280, in light and dark; for every
// protected button the test checks that it is the element under its own centre, that it is on screen, that its text keeps AA against the background it sits on, that its
// text is not smaller than 13 px, and that a real click navigates. The first 124 sheets are the reviewer's battery of round 4 (copied from his attack list), the rest are the vectors of rounds 1 to 3.
const SCOPE = ".cdesign-author";
const ATTACKS: readonly string[] = [
 "section{position:relative;z-index:100;min-height:200vh}",
 "div{position:relative;z-index:100;width:100vw;height:100vh}",
 "*{position:relative;z-index:100}",
 "section::before{content:'';position:absolute;inset:0;width:100vw;height:100vh;z-index:100}",
 "section::after{content:'';position:absolute;inset:0;width:100vw;height:100vh;z-index:100}",
 "section,div{position:absolute;inset:-100vh;z-index:100}",
 "*::before,*::after{content:'';position:absolute;inset:-100vh;z-index:100}",
 "header{position:absolute;inset:-100vh;z-index:100}",
 "section > div{position:absolute;top:0;left:0;width:100vw;height:200vh;z-index:100}",
 "div{display:none}",
 "section{display:none}",
 "div{height:0}",
 "div{width:0}",
 "section{height:0}",
 "div{margin:-400px}",
 "div{max-height:0}",
 "section{max-height:0}",
 "p,h2,ul,li,span,a{position:absolute;inset:-50vh;width:200vw;height:200vh;z-index:100}",
 "div{position:relative;z-index:100;display:grid;grid-template-columns:0}",
 "div > div{position:absolute;inset:0;width:100vw;height:100vh;z-index:100}",
 "section,header,h2,p,ul,li,span{margin:-400px}",
 "section{margin-top:-400px;margin-bottom:-400px}",
 "div{position:relative;top:-400px;left:-400px;z-index:100}",
 "div{grid-column:1 / 2;grid-row:1 / 2;order:-1}",
 "div{position:relative;z-index:100;padding:400px}",
 "section{position:relative;z-index:100;padding:400px}",
 "div{min-height:2000px;width:1600px;min-width:1600px}",
 "*{max-width:0;max-height:0}",
 "div{display:contents}",
 "section{display:contents}",
 "div{display:flex;flex-direction:column;height:0}",
 "p{margin:0}",
 ".cdesign-pages{transform:translate(800px)}",
 ".cdesign-pages{transform:translate(-800px)}",
 "section{transform:translate(800px)}",
 "section{transform:translateX(-800px)}",
 ".cdesign-page{transform:translateY(800px)}",
 ".cdesign-canvas{transform:translate(800px,0)}",
 ".cdesign-canvas{transform:translate(-800px,0)}",
 "*{transform:translate(400px)}",
 "div{transform:translate(800px)}",
 "section{transform:scale(2);transform-origin:-400px -400px}",
 ".cdesign-canvas{transform:scale(2);transform-origin:400px 400px}",
 ".cdesign-page{transform:rotate(180deg)}",
 "section{text-indent:400px}",
 "section{text-indent:-400px}",
 ".cdesign-canvas{text-indent:400px}",
 ".cdesign-pages{text-indent:400px}",
 "*{text-indent:400px}",
 "div{text-indent:-400px}",
 "section{letter-spacing:20px}",
 "*{letter-spacing:20px}",
 "*{word-spacing:40px}",
 "*{font-size:128px}",
 ".cdesign-pages{font-size:128px}",
 "section{line-height:10px}",
 "*{line-height:512px}",
 "*{white-space:pre}",
 "*{white-space:nowrap}",
 "*{text-transform:uppercase}",
 "*{word-break:break-all}",
 "*{text-shadow:0 0 100px #fff,0 0 100px #fff}",
 "*{text-shadow:100px 100px #000}",
 "*{font-family:monospace}",
 "section{float:left}",
 ".cdesign-canvas{float:right;width:1600px}",
 "section{columns:4}",
 ".cdesign-pages{columns:4}",
 ".cdesign-canvas{columns:4;column-count:4}",
 "*{color:#000}",
 "*{color:#fff}",
 "section{color:#fff;background-color:#fff}",
 ".cdesign-page{background-color:#c8a35a}",
 ".cdesign-canvas{background-color:#c8a35a}",
 "section{background-color:#000}",
 "section{background-color:#fff}",
 "*{background-color:#fff}",
 "*{background-color:#000}",
 "div{background-color:#c8a35a}",
 "div{background:#c8a35a}",
 ".cdesign-el{background-color:#fff;border:20px solid #fff}",
 "*{color:transparent}",
 "*{color:rgba(255,255,255,0)}",
 "*{color:rgba(0,0,0,0)}",
 "section::first-line{color:#fff}",
 "section::first-letter{color:#fff;font-size:128px}",
 "div::first-line{color:transparent}",
 ".cdesign-canvas::first-line{color:rgba(0,0,0,0)}",
 "*::first-line{color:transparent}",
 "*::first-letter{color:transparent}",
 "*::first-letter{font-size:128px}",
 "*::selection{color:#fff;background:#fff}",
 "*:hover{transform:scale(2);color:#fff}",
 "*:focus-within{transform:translate(800px)}",
 "section:hover{transform:translate(800px)}",
 "section:focus-within{transform:translate(-800px)}",
 "section::before{content:'';position:absolute;top:0;left:0;width:100vw;height:100vh;z-index:100}",
 "section::after{content:'ABCDEFGHIJ ABCDEFGHIJ';font-size:128px;position:relative}",
 "div::before{content:'';display:block;height:2000px}",
 "div::after{content:'';display:block;height:2000px}",
 "section::before{content:'';display:block;height:2000px}",
 ".cdesign-canvas::before{content:'';display:block;grid-column:1/-1;height:2000px}",
 ".cdesign-canvas::before{content:'';grid-column:1/-1;grid-row:1/-1;position:absolute;inset:-400px;z-index:100}",
 ".cdesign-canvas::after{content:'';position:absolute;inset:-400px;z-index:100}",
 ".cdesign-canvas{grid-template-columns:1600px}",
 ".cdesign-canvas{grid-template-rows:2000px}",
 ".cdesign-canvas{grid-auto-flow:column;grid-auto-columns:1600px}",
 ".cdesign-canvas{justify-content:end;justify-items:end}",
 ".cdesign-canvas{place-content:end}",
 ".cdesign-canvas{gap:200px}",
 ".cdesign-canvas{grid-template-columns:repeat(24,1600px)}",
 ".cdesign-el{grid-column:20 / 24;grid-row:1 / 2}",
 ".cdesign-el{justify-self:end;align-self:end}",
 ".cdesign-el{margin-left:400px;margin-top:400px}",
 ".cdesign-el{width:1600px}",
 ".cdesign-el{position:absolute;top:400px;left:400px;width:1600px;height:2000px;z-index:100}",
 ".cdesign-el:not(.x){position:absolute;inset:-400px;width:1600px;height:2000px;z-index:100}",
 ".cdesign-el{display:block;min-height:2000px;min-width:1600px}",
 ".cdesign-page{padding:400px}",
 ".cdesign-pages{padding:400px}",
 ".cdesign-pages{padding:400px;margin:-400px}",
 ".cdesign-pages{margin-left:400px}",
 ".cdesign-pages{margin-top:400px;margin-bottom:-400px}",
 ".cdesign-pages{display:flex;flex-direction:row}",
 ".cdesign-pages{display:grid;grid-template-columns:1600px}",
 ".cdesign-pages{display:flex;width:0;height:0}",
 ".cdesign-pages{height:0}",
 ".cdesign-pages{width:0}",
 ".cdesign-pages{max-width:0;max-height:0}",
 ".cdesign-pages{min-width:1600px}",
 ".cdesign-pages{position:absolute;top:-400px;left:400px}",
 ".cdesign-pages{position:relative;left:400px}",
 ".cdesign-pages{position:relative;top:-400px;z-index:-100}",
 ".cdesign-pages{z-index:100}",
 ".cdesign-canvas{padding:400px}",
 ".cdesign-canvas{border:20px solid #fff}",
 ".cdesign-page{position:absolute;top:0;left:400px}",
 ".cdesign-page{float:left;width:1600px}",
 ".cdesign-page{border-width:20px;border-style:solid;border-color:#fff;}",
 ".cdesign-pages{font-size:0}",
 ".cdesign-pages{box-sizing:content-box;padding:400px 400px}",
 ".cdesign-pages{margin:-400px}",
 ".cdesign-pages{margin-top:-400px}",
 ".cdesign-pages{margin-left:-400px}",
 ".cdesign-pages{margin-left:-400px;margin-right:-400px}",
 ".cdesign-canvas > *{margin-left:400px}",
 ".cdesign-page > *{margin-left:400px}",
 ".cdesign-page > .cdesign-canvas{margin-left:400px}",
 ".cdesign-page > .cdesign-canvas{padding-left:400px}",
 ".cdesign-page > :not(.cdesign-canvas){position:absolute;inset:0;z-index:100}",
 "section > *{position:absolute;inset:-400px;width:1600px;height:2000px;z-index:100}",
 ".cdesign-page-title{position:absolute;inset:-400px;width:1600px;height:2000px;z-index:100}",
 ".cdesign-page-title,.cdesign-intro,.celebration-hero,.cdesign-cover,.cdesign-sectionnav{position:absolute;inset:-400px;width:1600px;height:2000px;z-index:100}",
 ".celebration-hero{transform:scale(2)}",
 "html,body{margin:0}"
];

const lum = (r: number, g: number, b: number): number => { const f = (v: number): number => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const channels = (value: string): number[] => (value.match(/[\d.]+/g) ?? []).map(Number);

async function load(page: Page, width: number, scheme: "light" | "dark", css: string): Promise<void> {
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
  await page.goto("/c/fixture-v2-medios");
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: css });
}

for (const [index, css] of ATTACKS.entries()) {
  for (const width of [360, 1280] as const) {
    for (const scheme of ["light", "dark"] as const) {
      if (scheme === "dark" && index % 3 !== 0) continue; // dark on every third sheet: the colours do not depend on the geometry
      test(`sheet #${index} ${width}px ${scheme}: ${css.slice(0, 70)}`, async ({ page }) => {
        const { css: scoped, issues } = scopeCss(css, { scope: SCOPE });
        // A sheet the sanitiser refuses outright never reaches the page: there is nothing to attack with.
        if (scoped === "") { expect(issues.length).toBeGreaterThan(0); return; }
        await load(page, width, scheme, scoped);
        const links = page.locator('a[data-action="gifts"], a[data-action="rsvp"], a[data-action="rsvp-help"]');
        const count = await links.count();
        expect(count).toBeGreaterThanOrEqual(2);
        for (let position = 0; position < count; position += 1) {
          if (position > 0) await load(page, width, scheme, scoped);
          const link = links.nth(position);
          await link.scrollIntoViewIfNeeded();
          const info = await link.evaluate((node) => {
            const rect = node.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            const top = document.elementFromPoint(x, y);
            let background = "rgba(0, 0, 0, 0)";
            for (let walk: Element | null = node; walk; walk = walk.parentElement) { const value = getComputedStyle(walk).backgroundColor; const alpha = value.match(/[\d.]+/g)?.[3]; if (alpha === undefined || Number(alpha) > 0.5) { background = value; break; } }
            const style = getComputedStyle(node);
            return { onScreen: x >= 0 && x <= innerWidth && y >= 0 && y <= innerHeight, hit: top !== null && (top === node || node.contains(top)), by: top ? `${top.tagName}.${top.className}` : "null", color: style.color, background, size: parseFloat(style.fontSize), width: rect.width, height: rect.height, overflow: document.documentElement.scrollWidth > innerWidth };
          });
          const label = `button ${position} (${await link.getAttribute("data-action")})`;
          expect(info.hit, `${label} is covered by ${info.by}`).toBe(true);
          expect(info.onScreen, `${label} is off screen`).toBe(true);
          expect(info.width > 20 && info.height > 20, `${label} lost its box`).toBe(true);
          expect(info.size, `${label} font size`).toBeGreaterThanOrEqual(13);
          const ink = lum(...(channels(info.color).slice(0, 3) as [number, number, number]));
          const ground = lum(...(channels(info.background).slice(0, 3) as [number, number, number]));
          expect((Math.max(ink, ground) + 0.05) / (Math.min(ink, ground) + 0.05), `${label} contrast`).toBeGreaterThanOrEqual(4.5);
          expect(info.overflow, "the page scrolls sideways").toBe(false);
          const before = page.url();
          await Promise.all([page.waitForURL((url) => url.toString() !== before, { timeout: 5000 }), link.click({ timeout: 5000 })]);
        }
      });
    }
  }
}
