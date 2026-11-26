import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const EVIDENCE = join(dirname(fileURLToPath(import.meta.url)), "../../../docs/progress/evidence/plantillas-f5");
mkdirSync(EVIDENCE, { recursive: true });

test("Advanced code panel: hostile HTML and CSS are listed and never reach the draft", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("radio", { name: "Avanzado" }).click();
  await page.getByLabel("HTML").fill('<p onclick="alert(1)">Hola</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><iframe src="https://evil.example"></iframe>');
  await page.getByLabel("CSS").fill("p { color: red; position: fixed; background: url(https://evil.example/t.gif) } body { display: none } @import url(https://evil.example/x.css);");
  const status = page.getByRole("status").last();
  await expect(status).toContainText("Se ajustaron o quitaron");
  await expect(status).toContainText("Quitamos la etiqueta «script»");
  await expect(status).toContainText("Quitamos un selector no permitido");
  await expect(page.getByRole("status").first()).toContainText("Borrador guardado", { timeout: 5000 });
  const saved = await page.evaluate(() => window.__lastDocument);
  expect(saved.custom.html).toBe("<p>Hola</p><a>x</a>");
  expect(saved.custom.css).toContain(".rsvp-invitation p:not(.rsvp-protected)");
  for (const bad of ["fixed", "evil.example", "@import", "body", "onclick", "script", "javascript"]) expect(JSON.stringify(saved.custom)).not.toContain(bad);
  await page.screenshot({ path: join(EVIDENCE, "d-codigo-propio-1280.png"), fullPage: true });
});

test("360 px and dark: no horizontal scroll with the code panel open", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/?theme=dark");
  await page.getByRole("radio", { name: "Avanzado" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: join(EVIDENCE, "d-codigo-propio-oscuro-360.png"), fullPage: true });
});
