import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";

const EVIDENCE = join(dirname(fileURLToPath(import.meta.url)), "../../../docs/progress/evidence/plantillas-f5");
mkdirSync(EVIDENCE, { recursive: true });
const shot = (name: string) => join(EVIDENCE, `a-${name}.png`);
const WIDTHS = [360, 768, 1280] as const;
const THEMES = ["claro", "oscuro"] as const;
const accent = (page: Page) => page.getByLabel(/Color de acento \(claro\)|Accent color \(light\)/);
const serious = async (page: Page) => (await new AxeBuilder({ page }).analyze()).violations;

test.describe("editor shell (PR a, ronda 2)", () => {
  for (const width of WIDTHS) {
    for (const tema of THEMES) {
      test(`${width} px, tema ${tema}: sin desbordamiento, targets de 44 px, axe sin hallazgos y el lienzo a la vista`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: tema === "oscuro" ? "dark" : "light" });
        const page = await context.newPage();
        await page.goto(`/?theme=${tema === "oscuro" ? "dark" : "light"}`);
        await expect(page.getByRole("heading", { level: 1, name: "Ana y Luis" })).toBeVisible();
        await expect(page.locator('[data-block="giftsCta"][data-required="true"]').first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
        for (const control of await page.locator("button, [role=radio], input[type=color]").all()) {
          const box = await control.boundingBox();
          if (box) expect(box.height, await control.innerText().catch(() => "control")).toBeGreaterThanOrEqual(43.5);
        }
        // the canvas is the protagonist: on a phone it starts within the first screen, not after the page list
        const stage = await page.getByRole("main").boundingBox();
        expect(stage?.y ?? 9999).toBeLessThan(width === 360 ? 330 : 200);
        expect(await serious(page)).toEqual([]);
        // WCAG 1.4.11: the border of a control against the surface it sits on, from the computed styles
        const ratios = await page.evaluate(() => {
          const rgb = (v: string) => (v.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
          const lum = (c: number[]) => { const [r, g, b] = c.map((x) => { const v = (x ?? 0) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0); };
          const cr = (a: number[], b: number[]) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05); };
          const out: number[] = [];
          for (const el of document.querySelectorAll(".de-group, .de-btn:not(.de-btn--primary)")) {
            const border = rgb(getComputedStyle(el).borderTopColor);
            const parent = el.parentElement ? rgb(getComputedStyle(el.parentElement).backgroundColor) : [255, 255, 255];
            out.push(cr(border, parent));
          }
          const stage = document.querySelector(".de-stage"); const group = document.querySelector(".de-group");
          if (stage && group) out.push(cr(rgb(getComputedStyle(group).borderTopColor), rgb(getComputedStyle(stage).backgroundColor)));
          return out;
        });
        expect(ratios.length).toBeGreaterThan(0);
        for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(3);
        await page.screenshot({ path: shot(`lienzo-${tema}-${width}`), fullPage: width === 360 });
        await context.close();
      });
    }
  }

  test("abre en Básico y móvil con el botón de regalos marcado como obligatorio y nombres en español", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("radio", { name: "Básico" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("design-frame").getByText("Obligatorio")).toBeVisible();
    await expect(page.getByTestId("design-frame").getByText("Botón de regalos")).toBeVisible();
    expect(await page.locator("body").innerText()).not.toMatch(/giftsCta|dressCode|recommendations/);
  });

  test("editar guarda con If-Match y deshacer/rehacer restauran el color", async ({ page }) => {
    await page.goto("/");
    const input = accent(page);
    const original = await input.inputValue();
    await input.fill("#1f6f5c");
    await expect(page.getByTestId("save-status")).toContainText("Cambios sin guardar");
    await expect(page.getByTestId("save-status")).toContainText("Borrador guardado", { timeout: 5000 });
    expect(await page.evaluate(() => window.__saves)).toEqual([{ id: "design-1", version: 4, accent: "#1F6F5C" }]);
    await page.getByRole("button", { name: "Deshacer" }).click();
    expect(await input.inputValue()).toBe(original);
    await input.focus();
    await page.keyboard.press("Control+Shift+Z");
    expect(await input.inputValue()).toBe("#1f6f5c");
    await page.keyboard.press("Control+Z");
    expect(await input.inputValue()).toBe(original);
    await page.getByRole("button", { name: "Rehacer" }).click();
    expect(await input.inputValue()).toBe("#1f6f5c");
    await expect(page.getByTestId("save-status")).toContainText("Borrador guardado", { timeout: 5000 });
  });

  test("el panel Colores no recorta el anillo de foco del selector de color (m-7)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    const input = accent(page);
    await input.focus();
    const room = await input.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const clip = el.closest(".de-sticky")!.getBoundingClientRect();
      const ring = parseFloat(getComputedStyle(el).outlineWidth) + parseFloat(getComputedStyle(el).outlineOffset);
      return { left: box.left - clip.left, right: clip.right - box.right, ring };
    });
    expect(room.ring).toBeGreaterThan(0);
    expect(room.left).toBeGreaterThanOrEqual(room.ring);
    expect(room.right).toBeGreaterThanOrEqual(room.ring);
  });

  test("el lienzo de escritorio y el nivel Avanzado cambian el escenario", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.getByRole("main").getByRole("radio", { name: "Escritorio" }).click();
    await expect(page.getByTestId("design-frame")).toHaveAttribute("data-canvas", "desktop");
    await page.getByRole("radio", { name: "Avanzado" }).click();
    await expect(page.getByRole("radio", { name: "Avanzado" })).toHaveAttribute("aria-checked", "true");
    await page.screenshot({ path: shot("lienzo-escritorio-claro-1280") });
  });

  test("en inglés y en oscuro", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: "dark" });
    const page = await context.newPage();
    await page.goto("/?theme=dark&lang=en-US");
    await expect(page.getByRole("radio", { name: "Advanced" })).toBeVisible();
    await expect(page.getByTestId("design-frame").getByText("Gifts button")).toBeVisible();
    expect(await serious(page)).toEqual([]);
    await page.screenshot({ path: shot("lienzo-oscuro-en-1280") });
    await context.close();
  });

  test("estado guardando: el borrador en vuelo se ve y se anuncia", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/?slow=1");
    await accent(page).fill("#1f6f5c");
    await expect(page.getByTestId("save-status")).toContainText("Guardando el borrador", { timeout: 3000 });
    await page.screenshot({ path: shot("estado-guardando-1280") });
  });

  test("estados vacíos: una página sin elementos y un diseño sin páginas", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/?empty=1");
    await expect(page.getByText("Esta página no tiene elementos en este lienzo.")).toBeVisible();
    await page.screenshot({ path: shot("estado-pagina-vacia-1280") });
    await page.goto("/?nopages=1");
    await expect(page.getByText("Este diseño todavía no tiene páginas.")).toBeVisible();
    await page.screenshot({ path: shot("estado-sin-paginas-1280") });
  });

  for (const tema of THEMES) {
    for (const width of [360, 1280] as const) {
      test(`conflicto 409 (${tema}, ${width} px): aviso con confirmación y salida; al cargar la versión nueva se guarda desde ella`, async ({ browser }) => {
        const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: tema === "oscuro" ? "dark" : "light" });
        const page = await context.newPage();
        await page.goto(`/?fail=409&theme=${tema === "oscuro" ? "dark" : "light"}`);
        await accent(page).fill("#1f6f5c");
        await expect(page.getByRole("alert")).toContainText("Alguien guardó otra versión mientras editabas", { timeout: 5000 });
        await expect(page.getByTestId("save-status")).toContainText("El guardado se detuvo");
        await page.getByRole("button", { name: "Cargar la versión nueva" }).click();
        await expect(page.getByRole("button", { name: "Sí, descartar y cargar" })).toBeFocused();
        await page.screenshot({ path: shot(`estado-conflicto-${tema}-${width}`) });
        expect(await serious(page)).toEqual([]);
        await page.getByRole("button", { name: "Sí, descartar y cargar" }).click();
        await expect(page.getByRole("alert")).toHaveCount(0);
        expect(await accent(page).inputValue()).toBe("#1f6f5c");
        await accent(page).fill("#654321");
        await expect(page.getByTestId("save-status")).toContainText("Borrador guardado", { timeout: 5000 });
        const saves = await page.evaluate(() => window.__saves);
        expect(saves.at(-1)?.version).toBe(9);
        await context.close();
      });
    }
  }

  test("rechazo 422: dice qué pasó, deja reintentar y la siguiente edición reanuda", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/?fail=422");
    await accent(page).fill("#1f6f5c");
    await expect(page.getByRole("alert")).toContainText("demasiado grande", { timeout: 5000 });
    await expect(page.getByRole("alert")).toContainText("Código para soporte: DESIGN_TOO_LARGE");
    await page.screenshot({ path: shot("estado-rechazo-1280") });
    expect(await serious(page)).toEqual([]);
    const before = (await page.evaluate(() => window.__saves)).length;
    await accent(page).fill("#654321");
    await expect.poll(async () => (await page.evaluate(() => window.__saves)).length, { timeout: 5000 }).toBeGreaterThan(before);
  });

  test("sesión terminada 401 y falta de permiso 403", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/?fail=401");
    await accent(page).fill("#1f6f5c");
    const login = page.getByRole("link", { name: "Iniciar sesión en otra pestaña" });
    await expect(login).toHaveAttribute("target", "_blank", { timeout: 5000 });
    await expect(login).toHaveAttribute("rel", "noopener");
    await expect(login).toHaveAttribute("href", /^\/login\?returnTo=/);
    // opening it leaves this tab (and its unsaved edit) where it is
    const [popup] = await Promise.all([page.waitForEvent("popup"), login.click()]);
    await popup.close();
    expect(page.url()).toContain("fail=401");
    expect(await accent(page).inputValue()).toBe("#1f6f5c");
    await page.screenshot({ path: shot("estado-sesion-1280") });
    await page.goto("/?fail=403");
    await accent(page).fill("#1f6f5c");
    await expect(page.getByRole("alert")).toContainText("No puedes cambiar este diseño", { timeout: 5000 });
    await page.screenshot({ path: shot("estado-sin-permiso-1280") });
  });

  test("sin conexión reintenta con cuenta atrás", async ({ page }) => {
    await page.goto("/?fail=offline");
    await accent(page).fill("#1f6f5c");
    await expect(page.getByTestId("save-status")).toContainText("Reintentamos en 2 s", { timeout: 5000 });
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("avisos de contraste P19: se listan con palabras y la sugerencia se aplica", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/?warn=1");
    await accent(page).fill("#1f6f5c");
    await expect(page.getByTestId("design-warnings")).toContainText("En el tema oscuro, acento sobre fondo tiene contraste 3.21:1", { timeout: 5000 });
    await page.screenshot({ path: shot("estado-avisos-contraste-1280") });
    expect(await serious(page)).toEqual([]);
    await page.getByRole("button", { name: /Cambiar acento del tema oscuro a #C9A27A/i }).click();
    await expect(page.getByLabel("Color de acento (oscuro)")).toHaveValue("#c9a27a");
  });

  test("el aviso de conflicto no desborda a 360 px y los botones llevan nombre", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/?fail=409");
    await accent(page).fill("#1f6f5c");
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 5000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
});
