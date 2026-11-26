import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";

const EVIDENCE = join(dirname(fileURLToPath(import.meta.url)), "../../../docs/progress/evidence/plantillas-f5");
mkdirSync(EVIDENCE, { recursive: true });
const serious = async (page: Page) => (await new AxeBuilder({ page }).analyze()).violations.filter((violation) => violation.impact === "critical" || violation.impact === "serious");
const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const panel = (page: Page) => page.locator(".de-publish");

test("contrast warns live in ONE list and suggests a fix; publishing creates a version; restoring asks, copies it to the draft without publishing, and can be undone", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/");
  await expect(page.getByText("Todos los textos se leen bien")).toBeVisible();
  await page.getByRole("group", { name: "Modo claro" }).getByLabel("Acento").fill("#cccccc");
  await expect(page.getByTestId("design-warnings")).toHaveCount(1);
  await expect(page.getByTestId("design-warnings")).toContainText("En el tema claro, acento sobre fondo tiene contraste");
  await expect(page.getByText(/puedes publicar igual/)).toHaveCount(1);
  await page.screenshot({ path: join(EVIDENCE, "e-aviso-contraste-1280.png"), fullPage: true });
  await page.getByRole("button", { name: /^Usar #\w+ en acento del tema claro, sobre fondo/ }).click();
  await expect(page.getByTestId("design-warnings")).toHaveCount(0);
  await expect(page.getByText("Versión 1")).toBeVisible();
  await expect(page.getByText(/11:30 a\. m\./)).toBeVisible();
  await page.getByLabel("Nombre de esta versión (opcional)").fill("Con acento nuevo");
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("Publicada la versión 2.")).toBeVisible();
  await page.screenshot({ path: join(EVIDENCE, "e-publicar-versiones-1280.png"), fullPage: true });
  const accent = page.getByRole("group", { name: "Modo claro" }).getByLabel("Acento");
  const published = await accent.inputValue();
  await accent.fill("#1f6f5c");
  await page.getByRole("button", { name: "Restaurar versión 1" }).click();
  await expect(page.getByText(/reemplaza tu borrador actual/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Sí, restaurar la versión 1" })).toBeFocused();
  await page.screenshot({ path: join(EVIDENCE, "e-restaurar-confirmar-1280.png"), fullPage: true });
  await page.getByRole("button", { name: "Sí, restaurar la versión 1" }).click();
  await expect(page.getByText(/Versión 1 copiada al borrador/)).toBeVisible();
  expect(await accent.inputValue()).not.toBe(published);
  await page.getByRole("button", { name: "Deshacer" }).click();
  await expect(accent).toHaveValue("#1f6f5c");
  await expect(page.getByTestId("save-status")).toContainText("Borrador guardado", { timeout: 5000 });
  expect(await serious(page)).toEqual([]);
});

test("English and dark at 360 px: panels fit", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/?lang=en-US&theme=dark");
  await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: join(EVIDENCE, "e-publicar-oscuro-en-360.png"), fullPage: true });
});

const states = [
  { name: "cargando", query: "versions=loading", expect: (page: Page) => expect(page.getByText("Cargando versiones…")).toBeVisible() },
  { name: "error-lista", query: "versions=error", expect: (page: Page) => expect(page.getByText("No pudimos cargar las versiones publicadas.")).toBeVisible() },
  { name: "vacio", query: "versions=empty", expect: (page: Page) => expect(page.getByText("Todavía no publicaste ninguna versión.")).toBeVisible() },
  { name: "publicar-409", query: "publish=409", act: (page: Page) => page.getByRole("button", { name: "Publicar" }).click(), expect: (page: Page) => expect(page.getByText(/Otra pestaña o persona guardó un borrador más nuevo/)).toBeVisible() },
  { name: "restaurar-409", query: "restore=409", act: async (page: Page) => { await page.getByRole("button", { name: "Restaurar versión 1" }).click(); await page.getByRole("button", { name: "Sí, restaurar la versión 1" }).click(); }, expect: (page: Page) => expect(page.getByText(/No se restauró la versión/)).toBeVisible() },
  { name: "restaurando", query: "restore=slow", act: async (page: Page) => { await page.getByRole("button", { name: "Restaurar versión 1" }).click(); await page.getByRole("button", { name: "Sí, restaurar la versión 1" }).click(); }, expect: (page: Page) => expect(page.getByText("Restaurando la versión 1…")).toBeVisible() }
] as const;

for (const tema of ["light", "dark"] as const) {
  for (const width of [360, 768, 1280]) {
    for (const state of states) {
      test(`estado de versiones «${state.name}» · ${tema} · ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/?theme=${tema}&${state.query}`);
        if ("act" in state) await state.act(page);
        await state.expect(page);
        await panel(page).scrollIntoViewIfNeeded();
        expect(await overflow(page)).toBeLessThanOrEqual(0);
        if (tema === "dark" || width === 360) expect(await serious(page)).toEqual([]);
        if (width === 360 || (width === 1280 && tema === "light")) await panel(page).screenshot({ path: join(EVIDENCE, `e-versiones-${state.name}-${tema}-${width}.png`) });
      });
    }
  }
}

test("error de lista: «Reintentar» vuelve a pedirla; «Ver más versiones» sigue nextBefore hasta la versión 1", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?versions=error");
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByText("Versión 1")).toBeVisible();
  await page.goto("/?versions=many");
  await expect(page.getByText("Versión 100", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Restaurar versión / })).toHaveCount(50);
  await page.getByRole("button", { name: "Ver más versiones" }).click();
  await expect(page.getByRole("button", { name: /^Restaurar versión / })).toHaveCount(100);
  await expect(page.getByRole("button", { name: "Ver más versiones" })).toHaveCount(0);
});

test("publicar con 409: el aviso de conflicto y «Cargar la versión del servidor» llevan a la confirmación", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?publish=409");
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByTestId("save-status")).toContainText("El guardado se detuvo");
  await page.getByRole("button", { name: "Cargar la versión del servidor" }).click();
  await expect(page.getByRole("button", { name: "Sí, descartar y cargar" })).toBeFocused();
});
