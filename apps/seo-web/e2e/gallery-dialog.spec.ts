import { expect, test } from "@playwright/test";

test("the invitation gallery browses photos in place and restores focus on close", async ({ page }) => {
  await page.goto("/c/fixture-v2-medios/galeria");
  const photos = page.locator(".celebration-gallery a");
  await expect(photos).toHaveCount(2);
  const second = photos.nth(1);
  const invitation = page.url();
  await second.focus();
  await page.keyboard.press("Enter");

  const viewer = page.getByRole("dialog", { name: "Galería" });
  const close = viewer.getByRole("button", { name: "Cerrar" });
  await expect(viewer.getByRole("status")).toHaveText("Foto 2 de 2");
  await expect(close).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(viewer.getByRole("status")).toHaveText("Foto 1 de 2");
  await viewer.getByRole("button", { name: "Siguiente" }).click();
  await expect(viewer.getByRole("status")).toHaveText("Foto 2 de 2");
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);
  await expect(second).toBeFocused();

  await second.click();
  await close.click();
  await expect(viewer).toHaveCount(0);
  await expect(second).toBeFocused();
  expect(page.url()).toBe(invitation);
});
