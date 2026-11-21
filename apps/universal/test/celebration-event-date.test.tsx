import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ContentEditorScreen } from "../src/host/content-editor";
import { eventDateInstant } from "../src/host/event-date";
import { OnboardingScreen } from "../src/host/onboarding";
import { baseHandlers, CELEBRATION, fakeClient, HOST, HttpFailure, pickOnboardingDate, pickTime, renderApp } from "./support";

const NOW = "2026-11-20T03:00:00Z";
const PAST_DATE = "2026-11-18";
const TODAY = "2026-11-19";
const FUTURE_ERROR = "Elige una fecha válida.";
const LEGACY_DATE_ERROR = "The event date and time must be in the future";
const DATE_PROBLEM = { code: "EVENT_DATE_NOT_IN_FUTURE", field: "content.eventDate" };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(NOW));
  const resolvedOptions = Intl.DateTimeFormat.prototype.resolvedOptions;
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockImplementation(function (this: Intl.DateTimeFormat) {
    return { ...resolvedOptions.call(this), timeZone: "America/La_Paz" };
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function field(testId: string): HTMLInputElement {
  return screen.getByTestId<HTMLInputElement>(testId);
}

function change(testId: string, value: string): void {
  fireEvent.change(field(testId), { target: { value } });
}

async function expectDateFieldError(message: string): Promise<void> {
  const date = screen.getByTestId("field-event-date");
  const hint = await screen.findByText(message);
  const descriptionId = date.getAttribute("aria-describedby");
  expect(descriptionId && document.getElementById(descriptionId)?.contains(hint)).toBe(true);
  expect(date.parentElement?.contains(hint)).toBe(true);
  expect(date.compareDocumentPosition(hint) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(date.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getAllByText(message)).toHaveLength(1);
  expect(screen.queryByText(new RegExp(LEGACY_DATE_ERROR))).toBeNull();
}

async function openDateStep(): Promise<void> {
  fireEvent.click(await screen.findByRole("radio", { name: "Boda" }));
  fireEvent.click(screen.getByTestId("onboarding-next"));
  fireEvent.change(screen.getByLabelText("Novia"), { target: { value: "Ana" } });
  fireEvent.change(screen.getByLabelText("Novio"), { target: { value: "Luis" } });
  change("onboarding-venue-name", "Salón Las Palmas");
}

it.each([
  ["shift a nonexistent New York time forward", "2026-03-08T02:30", "America/New_York", "2026-03-08T07:30:00Z"],
  ["use the first occurrence of a repeated Madrid time", "2026-10-25T02:30", "Europe/Madrid", "2026-10-25T00:30:00Z"],
  ["account for a half-hour offset", "2026-11-20T09:30", "Asia/Kolkata", "2026-11-20T04:00:00Z"]
])("matches the backend rule to %s", (_name, wallTime, zone, expected) => {
  expect(eventDateInstant(wallTime, zone)).toBe(Date.parse(expected));
});

it("REQ-F11-01 · blocks past dates and the current instant, and creates a future event on the same day", async () => {
  const { client, calls } = fakeClient({ ...baseHandlers(), "POST /celebrations": () => CELEBRATION });
  const navigate = vi.fn();
  renderApp(<OnboardingScreen step={1} onNavigate={navigate} />, client);
  await openDateStep();
  fireEvent.click(screen.getByTestId("onboarding-date"));
  const pastDay = screen.getByTestId<HTMLButtonElement>(`calendar-day-${PAST_DATE}`);
  expect(pastDay.disabled).toBe(true);
  fireEvent.click(pastDay);
  expect(screen.getByTestId("onboarding-date-panel")).toBeTruthy();
  fireEvent.click(screen.getByTestId(`calendar-day-${TODAY}`));
  pickTime("Hora", "23:00");
  fireEvent.click(screen.getByTestId("onboarding-next"));
  expect(screen.queryByTestId("onboarding-create")).toBeNull();
  expect(await screen.findByText(FUTURE_ERROR)).toBeTruthy();
  expect(screen.queryByText(/^Es hoy$/i)).toBeNull();
  expect(field("onboarding-date").getAttribute("aria-invalid")).toBe("true");
  const description = field("onboarding-date").getAttribute("aria-describedby");
  expect(description && document.getElementById(description)?.textContent).toBe(FUTURE_ERROR);

  expect(calls.filter(({ method }) => method === "POST")).toHaveLength(0);

  pickTime("Hora", "23:05");
  fireEvent.click(screen.getByTestId("onboarding-next"));
  fireEvent.click(screen.getByTestId("onboarding-create"));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/onboarding/listo?c=c-1"));
  expect(calls.find(({ method }) => method === "POST")?.body).toMatchObject({
    timeZone: "America/La_Paz", content: { eventDate: "2026-11-19T23:05", venueName: "Salón Las Palmas" }
  });
});

it.each(["elapsed time", "changed zone"])("REQ-F11-01 · rechecks the date before POST after %s", async (cause) => {
  const { client, calls } = fakeClient({ ...baseHandlers(), "POST /celebrations": () => CELEBRATION });
  renderApp(<OnboardingScreen step={1} onNavigate={vi.fn()} />, client);
  await openDateStep();
  pickOnboardingDate(TODAY);
  pickTime("Hora", "23:05");
  fireEvent.click(screen.getByTestId("onboarding-next"));
  change("onboarding-title", "Mi celebración");
  if (cause === "changed zone") {
    fireEvent.click(screen.getByTestId("onboarding-more"));
    change("onboarding-time-zone", "Europe/Madrid");
  } else {
    vi.setSystemTime(new Date("2026-11-20T03:05:01Z"));
  }
  fireEvent.click(screen.getByTestId("onboarding-create"));
  expect(await screen.findByText(FUTURE_ERROR)).toBeTruthy();
  expect(field("onboarding-venue-name").value).toBe("Salón Las Palmas");
  expect(calls.some(({ method }) => method === "POST")).toBe(false);

  pickOnboardingDate("2026-11-21");
  fireEvent.click(screen.getByTestId("onboarding-next"));
  expect(field("onboarding-title").value).toBe("Mi celebración");
});

it("REQ-F11-01 · a server-side 422 returns to the date field and a corrected date can be sent", async () => {
  const send = vi.fn()
    .mockReturnValueOnce(new HttpFailure(422, DATE_PROBLEM))
    .mockReturnValueOnce(CELEBRATION);
  const { client } = fakeClient({ ...baseHandlers(), "POST /celebrations": send });
  const navigate = vi.fn();
  renderApp(<OnboardingScreen step={1} onNavigate={navigate} />, client);
  await openDateStep();
  pickOnboardingDate(TODAY);
  const shownDate = screen.getByTestId("onboarding-date").textContent;
  pickTime("Hora", "23:05");
  fireEvent.click(screen.getByTestId("onboarding-next"));
  fireEvent.click(screen.getByTestId("onboarding-create"));
  expect(await screen.findByText(FUTURE_ERROR)).toBeTruthy();
  expect(screen.getByTestId("onboarding-date").textContent).toBe(shownDate);
  expect(send).toHaveBeenCalledTimes(1);
  pickOnboardingDate("2026-11-21");
  fireEvent.click(screen.getByTestId("onboarding-next"));
  fireEvent.click(screen.getByTestId("onboarding-create"));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith("/onboarding/listo?c=c-1"));
  expect(send).toHaveBeenCalledTimes(2);
});

it("REQ-F11-02 · blocks a reschedule that expires before saving, then saves a future date with the original version", async () => {
  const { client, calls } = fakeClient({ ...baseHandlers(), "PATCH /celebrations/c-1": () => CELEBRATION });
  renderApp(<ContentEditorScreen section="general" celebrationId="c-1" onNavigate={vi.fn()} />, client);
  await screen.findByTestId("field-event-date");
  pickOnboardingDate("2026-11-20", "field-event-date");
  vi.setSystemTime(new Date("2026-11-20T23:00:01Z"));
  fireEvent.click(screen.getByTestId("save-content"));
  await expectDateFieldError(FUTURE_ERROR);
  expect(calls.some(({ method }) => method === "PATCH")).toBe(false);

  pickOnboardingDate("2026-11-21", "field-event-date");
  fireEvent.click(screen.getByTestId("save-content"));
  await waitFor(() => expect(calls.find(({ method }) => method === "PATCH")).toMatchObject({
    body: { content: { eventDate: "2026-11-21T19:00" } }
  }));
  expect(calls.find(({ method }) => method === "PATCH")?.headers.get("if-match")).toBe('"3"');
});

it("REQ-F11-02 · can update other fields without resending a stored historical date", async () => {
  vi.setSystemTime(new Date("2026-12-30T12:00:00Z"));
  const { client, calls } = fakeClient({ ...baseHandlers(), "PATCH /celebrations/c-1": () => CELEBRATION });
  renderApp(<ContentEditorScreen section="general" celebrationId="c-1" onNavigate={vi.fn()} />, client);
  const date = await screen.findByTestId("field-event-date");
  expect(date.textContent).toBe(new Intl.DateTimeFormat("es-BO", { dateStyle: "medium", timeZone: "UTC" }).format(new Date("2026-12-19T00:00:00Z")));
  fireEvent.click(date);
  expect(screen.getByTestId<HTMLButtonElement>("calendar-day-2026-12-19").disabled).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(screen.queryByText(FUTURE_ERROR)).toBeNull();
  change("field-title", "Boda de Ana y Luis");
  fireEvent.click(screen.getByTestId("save-content"));
  await waitFor(() => expect(calls.find(({ method }) => method === "PATCH")?.body).toEqual({
    content: { title: "Boda de Ana y Luis" }
  }));
});

it.each([
  { status: 422, problem: DATE_PROBLEM, locale: "en-US", message: "Choose a valid date.", reschedule: true },
  { status: 422, problem: { ...DATE_PROBLEM, code: "INVALID_EVENT_DATE" }, locale: "en-US", message: "Choose a valid date.", reschedule: true },
  { status: 422, problem: { title: LEGACY_DATE_ERROR }, locale: "es-BO", message: FUTURE_ERROR, reschedule: true },
  { status: 400, problem: { title: LEGACY_DATE_ERROR }, locale: "es-BO", message: FUTURE_ERROR, reschedule: false }
] as const)("REQ-F11-02 · shows a $status date rejection below the date field in $locale", async ({ status, problem, locale, message, reschedule }) => {
  const { client } = fakeClient({
    ...baseHandlers(), "PATCH /celebrations/c-1": () => new HttpFailure(status, problem)
  });
  renderApp(<ContentEditorScreen section="general" celebrationId="c-1" onNavigate={vi.fn()} />, client, HOST, locale);
  await screen.findByTestId("field-event-date");
  change("field-title", "Boda de Ana y Luis");
  if (reschedule) pickOnboardingDate("2026-11-21", "field-event-date");
  fireEvent.click(screen.getByTestId("save-content"));
  await expectDateFieldError(message);
  expect(field("field-title").value).toBe("Boda de Ana y Luis");
  pickOnboardingDate(reschedule ? "2026-11-22" : "2026-12-20", "field-event-date");
  expect(screen.queryByText(message)).toBeNull();
});
