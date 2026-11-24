import { expect, test } from "@playwright/test";

const EMAIL = "confirmacionesinvitadosmatrimoniocivil2026@example.test";

test("F15 · a long host email fits inside the mobile RSVP card", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/c/fixture-contacto-rsvp/rsvp?lang=es-BO");
  await expect(page.getByRole("heading", { name: "Esta celebración solo admite invitados con enlace personal" })).toBeVisible();

  const link = page.getByRole("link", { name: EMAIL, exact: true });
  await expect(link).toHaveAttribute("href", `mailto:${EMAIL}`);
  await page.evaluate(() => document.fonts.ready);

  const fits = await link.evaluate((element) => {
    const card = element.closest(".rsvp-card")?.getBoundingClientRect();
    if (!card) return false;
    const rightEdge = Math.min(card.right, window.innerWidth);
    const lineBoxes = Array.from(element.getClientRects());
    return lineBoxes.length > 0 && lineBoxes.every(({ left, right }) => left >= card.left && right <= rightEdge);
  });
  expect(fits).toBe(true);
  await link.focus();
  await expect(link).toBeFocused();
});
