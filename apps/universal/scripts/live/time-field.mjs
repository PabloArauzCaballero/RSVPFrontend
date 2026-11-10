/**
 * The product's own time field: a button named "<label>: <shown time>" that opens the clock panel.
 * `timeButton(page, "Hora")` finds it; `pickTime(page, button, "17:30")` chooses hour, minutes and morning or afternoon as a
 * person would, and an empty value clears it. Minutes must be a multiple of five (the steps the panel offers).
 */
export const timeButton = (page, label) => page.getByRole("button", { name: new RegExp(`^${label}: `) }).filter({ visible: true });

export async function pickTime(page, button, value) {
  await button.click();
  const within = (id) => page.getByTestId(id).filter({ visible: true }).first();
  if (!value) {
    const clear = within("time-clear");
    await ((await clear.getAttribute("aria-disabled")) === "true" ? within("time-done") : clear).click();
    return;
  }
  const [hours, minutes] = value.split(":").map(Number);
  await within(`time-hour-${hours % 12 || 12}`).click();
  await within(`time-minute-${String(minutes).padStart(2, "0")}`).click();
  await within(hours >= 12 ? "time-pm" : "time-am").click();
  await within("time-done").click();
}
