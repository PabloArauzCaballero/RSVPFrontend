/** Selects an ISO day through the invitation calendar, regardless of the browser's locale or current date. */
export async function pickDate(page, trigger, value) {
  await trigger.click();
  const grid = page.getByRole("grid");
  const currentDay = await grid.locator("button[tabindex='0']").getAttribute("data-testid");
  const [year, month] = value.split("-").map(Number);
  const [currentYear, currentMonth] = currentDay.slice(-10).split("-").map(Number);
  const distance = (year - currentYear) * 12 + month - currentMonth;
  if (distance !== 0) {
    const navigation = page.getByTestId(distance > 0 ? "calendar-next-month" : "calendar-previous-month");
    for (let step = 0; step < Math.abs(distance); step++) await navigation.click();
  }
  await grid.getByTestId(`calendar-day-${value}`).click();
}
