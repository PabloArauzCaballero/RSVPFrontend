import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";

const EVIDENCE = join(dirname(fileURLToPath(import.meta.url)), "../../../docs/progress/evidence/plantillas-f5");
mkdirSync(EVIDENCE, { recursive: true });

test("free canvas: add, drag, resize, rotate; the gifts block can be moved but never hidden, rotated or removed", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/");
  await page.getByRole("radio", { name: "Avanzado" }).click();
  const region = page.getByRole("region", { name: "Regalos", exact: true }).first();
  await region.getByRole("button", { name: "Pasar este lienzo a libre" }).click();
  await page.getByRole("region", { name: "Agregar" }).getByLabel("En la página").selectOption({ label: "Regalos" });
  await page.getByRole("region", { name: "Agregar" }).getByRole("button", { name: "Título" }).click();
  const title = region.getByRole("group", { name: "Título" });
  await title.click();
  const before = await title.boundingBox();
  if (!before) throw new Error("no box");
  await page.mouse.move(before.x + 20, before.y + 10);
  await page.mouse.down();
  await page.mouse.move(before.x + 20 + 90, before.y + 10 + 40, { steps: 6 });
  await page.mouse.up();
  const after = await title.boundingBox();
  expect(Math.round((after?.y ?? 0) - before.y)).toBeGreaterThanOrEqual(36);
  const handle = region.locator('[data-handle="resize"]');
  const hb = await handle.boundingBox();
  if (!hb) throw new Error("no handle");
  await page.mouse.move(hb.x + 10, hb.y + 10);
  await page.mouse.down();
  await page.mouse.move(hb.x + 10, hb.y + 10 + 24, { steps: 4 });
  await page.mouse.up();
  const resized = await title.boundingBox();
  expect((resized?.height ?? 0)).toBeGreaterThan(after?.height ?? 0);
  const rot = region.locator('[data-handle="rotate"]');
  const rb = await rot.boundingBox();
  if (!rb) throw new Error("no rotate");
  await page.mouse.move(rb.x + 10, rb.y + 10);
  await page.mouse.down();
  await page.mouse.move(rb.x + 200, rb.y + 60, { steps: 6 });
  await page.mouse.up();
  // turned this close to the gifts button its bounding box would cover it: the editor refuses the gesture and says why (P22)
  expect(await title.evaluate((node) => (node as HTMLElement).style.transform)).not.toContain("rotate(");
  await expect(page.getByRole("alert")).toContainText("Otro elemento quedaría encima del botón de regalos");
  await page.getByRole("button", { name: "Entendido" }).click();
  // far from the button the same element turns freely
  await title.click();
  await page.getByLabel("Fila", { exact: true }).fill("60");
  await page.keyboard.press("Enter");
  await page.getByLabel("Giro (grados)").fill("15");
  await page.keyboard.press("Enter");
  expect(await title.evaluate((node) => (node as HTMLElement).style.transform)).toContain("rotate(");
  const gifts = region.getByRole("group", { name: "Botón de regalos" });
  await gifts.dispatchEvent("click");
  await expect(page.getByLabel("Giro (grados)")).toBeDisabled();
  await expect(page.getByLabel("Visible en este lienzo")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Quitar" })).toBeDisabled();
  await gifts.focus();
  await page.keyboard.press("Delete");
  await expect(gifts).toBeVisible();
  await page.getByLabel("Alto (filas)").fill("1");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("alert")).toContainText("mide al menos 44 px");
  await page.screenshot({ path: join(EVIDENCE, "c-lienzo-libre-1280.png"), fullPage: true });
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious")).toEqual([]);
});

test("desktop canvas is created from mobile; 360 px dark has no horizontal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("radio", { name: "Avanzado" }).click();
  await page.getByRole("radio", { name: "Escritorio" }).click();
  await page.getByRole("region", { name: "Regalos", exact: true }).first().getByRole("button", { name: "Crear el lienzo de escritorio a partir del móvil" }).click();
  await page.screenshot({ path: join(EVIDENCE, "c-lienzo-escritorio-1280.png"), fullPage: true });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/?theme=dark");
  await page.getByRole("radio", { name: "Avanzado" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: join(EVIDENCE, "c-lienzo-oscuro-360.png"), fullPage: true });
});

const free = async (page: Page): Promise<Locator> => {
  await page.getByRole("radio", { name: "Avanzado" }).click();
  const region = page.getByRole("region", { name: "Regalos", exact: true }).first();
  await region.getByRole("button", { name: "Pasar este lienzo a libre" }).click();
  await page.getByRole("region", { name: "Agregar" }).getByLabel("En la página").selectOption({ label: "Regalos" });
  await page.getByRole("region", { name: "Agregar" }).getByRole("button", { name: "Texto" }).click();
  return region;
};
const everything = async (page: Page) => (await new AxeBuilder({ page }).analyze()).violations.map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.length}`);

/** WCAG contrast of two CSS rgb() colours. */
const ratio = (a: string, b: string): number => {
  const channels = (rgb: string): number[] => (rgb.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const lum = (rgb: string): number => { const [r = 0, g = 0, bl = 0] = channels(rgb).map((c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; };
  const [hi, lo] = [Math.max(lum(a), lum(b)), Math.min(lum(a), lum(b))];
  return (hi + 0.05) / (lo + 0.05);
};

for (const [width, theme] of [[1280, "light"], [768, "dark"], [360, "light"], [360, "dark"]] as const) {
  test(`keyboard only at ${width} px ${theme}: select, move, resize, rotate, layer, inspector, delete, with announcements and no axe violations`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/?theme=${theme}`);
    const region = await free(page);
    const live = page.getByTestId("canvas-announcer");
    const text = region.getByRole("group", { name: "Texto" });
    await text.focus();
    await page.keyboard.press("Enter");
    await expect(text).toHaveAttribute("aria-current", "true");
    await expect(live).toHaveText("Seleccionado: Texto.");
    const top = (await text.boundingBox())?.y ?? 0;
    await page.keyboard.press("Shift+ArrowDown");
    await expect(text).toBeFocused();
    expect(((await text.boundingBox())?.y ?? 0) - top).toBeGreaterThanOrEqual(39);
    await expect(live).toHaveText(/^Texto: columna 1, fila \d+\.$/);
    const height = (await text.boundingBox())?.height ?? 0;
    await page.keyboard.press("Alt+ArrowDown");
    expect(((await text.boundingBox())?.height ?? 0) - height).toBeGreaterThanOrEqual(7);
    await expect(live).toContainText("filas de alto");
    await page.keyboard.press("PageUp");
    await expect(live).toHaveText("Texto al frente.");
    await page.keyboard.press("r");
    // the text is far from the gifts button by now: it turns 5 degrees clockwise, and Shift+R turns it back
    await expect(live).toHaveText("Texto: giro de 5 grados.");
    expect(await text.evaluate((node) => (node as HTMLElement).style.transform)).toBe("rotate(5deg)");
    await page.keyboard.press("Shift+r");
    await expect(live).toHaveText("Texto: giro de 0 grados.");
    expect(await text.evaluate((node) => (node as HTMLElement).style.transform)).toBe("");
    // the inspector is reachable by keyboard
    await page.getByRole("button", { name: "Ir al inspector del elemento" }).focus();
    await page.keyboard.press("Enter");
    const field = page.getByLabel("Columna", { exact: true });
    await expect(field).toBeFocused();
    await expect(page.getByRole("button", { name: "Volver al elemento" })).toBeVisible();
    await page.screenshot({ path: join(EVIDENCE, `c2-teclado-${theme === "dark" ? "oscuro" : "claro"}-${width}.png`), fullPage: true });
    expect(await everything(page)).toEqual([]);
    await page.getByRole("button", { name: "Volver al elemento" }).click();
    await expect(text).toBeFocused();
    await page.keyboard.press("Delete");
    await expect(live).toContainText("Se quitó Texto. El foco pasó a");
    await expect(page.locator("[data-element-id]:focus")).toHaveCount(1);
    const gifts = region.getByRole("group", { name: "Botón de regalos" });
    await gifts.focus();
    await page.keyboard.press("Delete");
    await expect(gifts).toBeVisible();
    await expect(live).toHaveText("El botón de regalos es obligatorio: no se puede quitar de la invitación.");
  });
}

test("the handles draw 20 px and respond over 44 px (WCAG 2.5.8), measured on the pseudo-element and by hit testing", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  const region = await free(page);
  await region.getByRole("group", { name: "Texto" }).focus();
  await page.keyboard.press("Enter");
  for (const kind of ["resize", "rotate"]) {
    const handle = region.locator(`[data-handle="${kind}"]`);
    const drawn = await handle.boundingBox();
    expect(drawn?.width).toBeLessThanOrEqual(24);
    const effective = await handle.evaluate((node) => { const style = getComputedStyle(node, "::after"); return { width: Number.parseFloat(style.width), height: Number.parseFloat(style.height) }; });
    expect(effective.width).toBeGreaterThanOrEqual(44);
    expect(effective.height).toBeGreaterThanOrEqual(44);
    const box = drawn as NonNullable<typeof drawn>;
    const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const hit = (dx: number, dy: number) => handle.evaluate((node, point) => document.elementFromPoint(point.x, point.y) === node, { x: centre.x + dx, y: centre.y + dy });
    // the four sides of a 44 px square centred on the drawing hit the handle (21 px out), and 26 px out do not
    for (const [dx, dy] of [[21, 0], [-21, 0], [0, 21], [0, -21]] as const) expect(await hit(dx, dy)).toBe(true);
    expect(await hit(26, 0)).toBe(false);
  }
});

for (const theme of ["light", "dark"] as const) {
  test(`outlines of elements that are not selected reach 3:1 (${theme}), and a hidden element says so with an icon and a label`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/?theme=${theme}`);
    const region = await free(page);
    const text = region.getByRole("group", { name: "Texto" });
    const stage = region.locator("[data-stage]");
    const pair = await text.evaluate((node) => { const own = getComputedStyle(node); const parent = getComputedStyle(node.parentElement as HTMLElement); return { border: own.borderTopColor, outside: parent.backgroundColor, outline: getComputedStyle(node.parentElement as HTMLElement).outlineColor }; });
    expect(ratio(pair.border, pair.outside)).toBeGreaterThanOrEqual(3);
    expect(ratio(pair.outline, pair.outside)).toBeGreaterThanOrEqual(3);
    await text.focus();
    await page.keyboard.press("Enter");
    await page.getByLabel("Visible en este lienzo").uncheck();
    const hidden = region.getByRole("group", { name: "Texto, oculto" });
    await expect(hidden.getByText("Oculto en este lienzo")).toBeVisible();
    await expect(hidden.locator("svg")).toBeVisible();
    await expect(stage).toBeVisible();
  });
}

test("inspector draft: typing 10 in Alto works, Escape reverts, an invalid value shows an inline error", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const region = await free(page);
  const text = region.getByRole("group", { name: "Texto" });
  await text.focus();
  await page.keyboard.press("Enter");
  const height = page.getByLabel("Alto (filas)", { exact: true });
  await height.fill("");
  await height.pressSequentially("10");
  await expect(height).toHaveValue("10");
  await page.keyboard.press("Enter");
  expect(Math.round((await text.boundingBox())?.height ?? 0)).toBe(80);
  await height.fill("30");
  await page.keyboard.press("Escape");
  await expect(height).toHaveValue("10");
  await height.fill("0");
  await page.keyboard.press("Enter");
  await expect(height).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Escribe un número entero entre 1 y 500.")).toBeVisible();
  expect(Math.round((await text.boundingBox())?.height ?? 0)).toBe(80);
});

test.describe("touch at 360 px (A5, m4)", () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  test("a finger over the canvas scrolls the page until an element is selected; then it drags it; the inspector is a sheet one tap away", async ({ page }) => {
    await page.goto("/?theme=dark");
    const region = await free(page);
    const text = region.getByRole("group", { name: "Texto" });
    const touchAction = (locator: Locator) => locator.evaluate((node) => getComputedStyle(node).touchAction);
    expect(await touchAction(region.locator("[data-stage]"))).toBe("auto");
    expect(await touchAction(text)).toBe("auto");
    await text.scrollIntoViewIfNeeded();
    const box = await text.boundingBox();
    if (!box) throw new Error("no box");
    const client = await page.context().newCDPSession(page);
    const swipe = async (x: number, y: number, distance: number): Promise<void> => {
      await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let step = 1; step <= 10; step += 1) {
        await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + (distance * step) / 10 }] });
        await page.waitForTimeout(16);
      }
      await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await page.waitForTimeout(300);
    };
    const before = await page.evaluate(() => window.scrollY);
    await swipe(box.x + box.width / 2, box.y + box.height / 2, -150);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 100);
    await expect(text).toHaveAttribute("aria-current", "false");
    await text.tap();
    await expect(text).toHaveAttribute("aria-current", "true");
    expect(await touchAction(text)).toBe("none");
    expect(await touchAction(region.locator('[data-handle="resize"]'))).toBe("none");
    // selected: the finger drags the element and the page stays where it is
    const selectedBox = await text.boundingBox();
    if (!selectedBox) throw new Error("no box");
    const scrolled = await page.evaluate(() => window.scrollY);
    await swipe(selectedBox.x + selectedBox.width / 2, selectedBox.y + 10, 24);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
    expect(((await text.boundingBox())?.y ?? 0) - selectedBox.y).toBeGreaterThanOrEqual(16);
    // the inspector docks at the bottom of the screen, collapsed, within reach of the element
    const sheet = page.getByTestId("inspector-sheet");
    await expect(sheet).toBeVisible();
    const summary = sheet.locator("summary");
    const sb = await summary.boundingBox();
    expect((sb?.y ?? 0) + (sb?.height ?? 0)).toBeGreaterThan(700);
    expect(sb?.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: join(EVIDENCE, "c2-hoja-inspector-cerrada-oscuro-360.png") });
    await summary.tap();
    await expect(sheet.getByLabel("Ancho (columnas)")).toBeVisible();
    await page.screenshot({ path: join(EVIDENCE, "c2-hoja-inspector-abierta-oscuro-360.png") });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    expect(await everything(page)).toEqual([]);
  });
});

for (const [width, height] of [[360, 800], [768, 1024]] as const) {
  test(`the open inspector sheet keeps the selected element in view at ${width}x${height} (WCAG 2.4.11, PL-125-R2-V1, V2)`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/?theme=light");
    const region = await free(page);
    const text = region.getByRole("group", { name: "Texto" });
    await text.click();
    await expect(text).toHaveAttribute("aria-current", "true");
    const sheet = page.getByTestId("inspector-sheet");
    const summary = sheet.locator("summary");
    // the chevron: drawn by the summary, up while closed and down once open
    const chevron = (): Promise<string> => summary.evaluate((node) => getComputedStyle(node, "::after").transform);
    const closedChevron = await chevron();
    expect(closedChevron).not.toBe("none");
    await summary.click();
    await expect(sheet.getByLabel("Ancho (columnas)")).toBeVisible();
    expect(await chevron()).not.toBe(closedChevron);
    const sheetBox = await sheet.boundingBox();
    const elementBox = await text.boundingBox();
    if (!sheetBox || !elementBox) throw new Error("no box");
    expect(sheetBox.height).toBeLessThanOrEqual(height * 0.45 + 1);
    expect(elementBox.y + elementBox.height).toBeLessThanOrEqual(sheetBox.y);
    expect(elementBox.y).toBeGreaterThanOrEqual(0);
    await expect(sheet.getByRole("button", { name: "Cerrar" })).toBeVisible();
    await page.screenshot({ path: join(EVIDENCE, `c2-hoja-abierta-elemento-visible-${width}.png`) });
    // the sheet's own button closes it and Escape does too, the focus going back to the element
    await sheet.getByRole("button", { name: "Cerrar" }).click();
    await expect(sheet.getByLabel("Ancho (columnas)")).toBeHidden();
    await summary.click();
    await sheet.getByLabel("Ancho (columnas)").focus();
    await page.keyboard.press("Escape");
    await expect(sheet.getByLabel("Ancho (columnas)")).toBeHidden();
    await expect(text).toBeFocused();
    // once more, from the summary
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(sheet.getByLabel("Ancho (columnas)")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet.getByLabel("Ancho (columnas)")).toBeHidden();
  });
}

test("Escape leaves the element: the focus goes to the page and the scrolling keys are no longer taken (PL-125-R2-V6)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 400 });
  await page.goto("/");
  const region = await free(page);
  const text = region.getByRole("group", { name: "Texto" });
  const taken = async (key: string): Promise<boolean> => {
    await page.evaluate(() => { (window as unknown as { __taken: boolean | null }).__taken = null; window.addEventListener("keydown", (event) => { (window as unknown as { __taken: boolean | null }).__taken = event.defaultPrevented; }, { once: true }); });
    await page.keyboard.press(key);
    return page.evaluate(() => (window as unknown as { __taken: boolean | null }).__taken === true);
  };
  await text.focus();
  // with the element focused, the keys act on it (the browser does not scroll)
  expect(await taken("PageDown")).toBe(true);
  await text.focus();
  await page.keyboard.press("Escape");
  await expect(text).not.toBeFocused();
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  for (const key of ["ArrowDown", "ArrowUp", " ", "PageDown", "PageUp"]) expect(await taken(key), key).toBe(false);
  // and Tab still comes back to the canvas
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);
});

test("on the gifts button, Alt+arrows, moving and changing layer are refused with the reason and change nothing (PL-125-R2)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const region = await free(page);
  const gifts = region.getByRole("group", { name: "Botón de regalos" });
  const text = region.getByRole("group", { name: "Texto" });
  const live = page.getByTestId("canvas-announcer");
  const style = (node: Locator): Promise<string | null> => node.getAttribute("style");
  const dismiss = async (): Promise<void> => { await page.getByRole("button", { name: "Entendido" }).click(); };
  const refused = async (reason: RegExp): Promise<void> => { await expect(live).toContainText(reason); await expect(page.getByRole("alert")).toContainText(reason); await dismiss(); };
  const giftsStart = await style(gifts);
  const textStart = await style(text);
  // Alt+ArrowUp would shrink the button below 44 px
  await gifts.focus();
  await page.keyboard.press("Alt+ArrowUp");
  await refused(/mide al menos 44 px/);
  expect(await style(gifts)).toBe(giftsStart);
  // the text may not turn next to the button, nor move up onto it
  await text.focus();
  await page.keyboard.press("r");
  await refused(/Otro elemento quedaría encima del botón de regalos/);
  await text.focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  await refused(/Otro elemento quedaría encima del botón de regalos/);
  expect(await style(text)).toContain("top: 48px");
  // moving the button down over the text is refused too
  await gifts.focus();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await refused(/Otro elemento quedaría encima del botón de regalos/);
  expect(await style(gifts)).toBe(giftsStart);
  // text above the button's layer while overlapping would hide it: sending the button back is refused and its layer stays
  await gifts.focus();
  await page.keyboard.press("PageUp");
  await text.focus();
  await page.keyboard.press("PageDown");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("ArrowUp");
  const overlapped = await style(gifts);
  expect(overlapped).toContain("z-index: 1");
  await gifts.focus();
  await page.keyboard.press("PageDown");
  await refused(/Otro elemento quedaría encima del botón de regalos/);
  expect(await style(gifts)).toBe(overlapped);
  expect(textStart).toContain("top: 56px");
});

test("the halo of a rotate handle over the gifts button does not take the tap from the button (PL-125-R2-V3)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const region = await free(page);
  const gifts = region.getByRole("group", { name: "Botón de regalos" });
  const text = region.getByRole("group", { name: "Texto" });
  await text.click();
  await expect(text).toHaveAttribute("aria-current", "true");
  const handle = region.locator('[data-handle="rotate"]');
  const hb = await handle.boundingBox();
  const gb = await gifts.boundingBox();
  if (!hb || !gb) throw new Error("no box");
  const cx = hb.x + hb.width / 2;
  const cy = hb.y + hb.height / 2;
  // 16 px above the handle's centre: outside the drawn circle (10 px), inside its 44 px area and inside the button
  expect(cy - 16).toBeGreaterThan(gb.y);
  expect(await handle.evaluate((node, [x, y]) => node.contains(document.elementFromPoint(x ?? 0, y ?? 0)), [cx, cy - 16])).toBe(true);
  const before = await text.getAttribute("style");
  await page.mouse.click(cx, cy - 16);
  await expect(gifts).toHaveAttribute("aria-current", "true");
  await expect(text).toHaveAttribute("aria-current", "false");
  expect(await text.getAttribute("style")).toBe(before);
});
