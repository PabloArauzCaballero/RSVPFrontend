import { expect, test } from "@playwright/test";

test("the invitation carousel and viewer browse photos in place", async ({ page }) => {
  await page.goto("/c/fixture-v2-medios/galeria");
  const track = page.locator(".celebration-gallery");
  const photos = track.getByRole("link");
  await expect(photos).toHaveCount(2);
  const [trackBox, firstBox] = await Promise.all([track.boundingBox(), photos.nth(0).boundingBox()]);
  expect(trackBox && firstBox && Math.abs(firstBox.width - trackBox.width)).toBeLessThanOrEqual(2);
  const controls = page.locator(".celebration-gallery-navigation");
  const next = controls.getByRole("button", { name: "Siguiente" });
  const previous = controls.getByRole("button", { name: "Anterior" });
  const position = controls.getByRole("status");
  await expect(position).toHaveText("Foto 1 de 2");
  await expect(previous).toBeDisabled();
  await next.click();
  await expect(position).toHaveText("Foto 2 de 2");
  await expect(next).toBeDisabled();
  await expect(photos.nth(1)).toBeInViewport();

  const first = photos.nth(0);
  const second = photos.nth(1);
  await second.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(first).toBeFocused();
  await expect(position).toHaveText("Foto 1 de 2");
  await page.keyboard.press("ArrowRight");
  await expect(second).toBeFocused();
  await expect(position).toHaveText("Foto 2 de 2");

  const invitation = page.url();
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

  await second.click();
  await expect(viewer).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(viewer).toHaveCount(0);
  await expect(second).toBeFocused();
  expect(page.url()).toBe(invitation);
});

test("the invitation omits the gallery when it has no photos", async ({ page }) => {
  await page.goto("/c/fixture-v2-marfil-sinfoto");
  await expect(page.locator(".celebration-gallery-carousel")).toHaveCount(0);
  const response = await page.goto("/c/fixture-v2-marfil-sinfoto/galeria");
  expect(response?.status()).toBe(404);
});
