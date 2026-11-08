// The theme check shared by the live matrices: under `colorScheme: dark` the EFFECTIVE background (what a person sees, not just
// <body>) must be dark; under `light` it must be light. Brand regions (the blue cover, the night band) and the device preview of a
// celebration keep their own colours in both schemes (the host's theme is not darkened), so the check samples a grid of points, skips
// the points that fall inside a celebration preview and judges the share of light ground.
// The contrast side is covered by axe in the same sweep (no serious/critical violations).

/** Effective background luminance at a grid of points: the first non-transparent background walking up from the element under the point. */
export function sampleSurface(page) {
  return page.evaluate(() => {
    const luminance = (rgb) => { const m = rgb.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0]; const [r, g, b] = m.slice(0, 3).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const effective = (el) => { for (let node = el; node; node = node.parentElement) { const bg = getComputedStyle(node).backgroundColor; const alpha = bg.match(/rgba\(.*,\s*([\d.]+)\)$/)?.[1]; if (bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent" && alpha !== "0") return bg; } return getComputedStyle(document.documentElement).backgroundColor; };
    const points = [];
    for (const fx of [0.08, 0.3, 0.5, 0.7, 0.92]) for (const fy of [0.15, 0.4, 0.65, 0.9]) points.push([Math.round(innerWidth * fx), Math.round(innerHeight * fy)]);
    const lums = points.map(([x, y]) => { const el = document.elementFromPoint(x, y); return el && !el.closest('[data-testid^="preview-"]') ? luminance(effective(el)) : null; }).filter((v) => v !== null);
    const light = lums.filter((v) => v > 0.5).length;
    return { samples: lums.length, lightShare: lums.length ? light / lums.length : 0, body: getComputedStyle(document.body).backgroundColor, dataTheme: document.documentElement.getAttribute("data-theme"), colorScheme: document.documentElement.style.colorScheme };
  });
}

/** `{ ok, evidence }`: dark needs at most 20 % light ground and the document marked dark; light needs at least 25 % light ground. */
export function followsScheme(scheme, surface) {
  const share = `${Math.round(surface.lightShare * 100)}% light ground of ${surface.samples} samples, body ${surface.body}, data-theme=${surface.dataTheme}`;
  if (scheme === "dark") return { ok: surface.lightShare <= 0.2 && surface.dataTheme === "dark", evidence: share };
  return { ok: surface.lightShare >= 0.25 && surface.dataTheme === "light", evidence: share };
}

/** Both schemes of one route on the same page object: the effective background must differ between them. */
export function changedBetween(light, dark) {
  return { ok: light.lightShare - dark.lightShare >= 0.2, evidence: `light ${Math.round(light.lightShare * 100)}% -> dark ${Math.round(dark.lightShare * 100)}% light ground` };
}
