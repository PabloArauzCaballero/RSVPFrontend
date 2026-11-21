const DAY_MS = 86_400_000;
const SECOND_MS = 1_000;
const MINUTE_MS = 60_000;

function zoneClock(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  });
}

function clockParts(clock: Intl.DateTimeFormat, instant: number): Record<string, string> {
  return Object.fromEntries(clock.formatToParts(instant).map(({ type, value }) => [type, value]));
}

export function eventCalendarDay(timeZone: string, now = Date.now()): string {
  const { year, month, day } = clockParts(zoneClock(timeZone), now);
  return `${year}-${month}-${day}`;
}

/** Resolve a validated wall-clock value without interpreting it in the device's zone. */
export function eventDateInstant(localDateTime: string, timeZone: string): number {
  const clock = zoneClock(timeZone);
  const wallAsUtc = Date.parse(`${localDateTime}Z`);
  const offset = (instant: number): number => {
    const { year, month, day, hour, minute, second } = clockParts(clock, instant);
    const zonedAsUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    const wholeSecond = Math.floor(instant / SECOND_MS) * SECOND_MS;
    return Math.round((zonedAsUtc - wholeSecond) / MINUTE_MS) * MINUTE_MS;
  };
  const before = offset(wallAsUtc - DAY_MS);
  const candidates = [before, offset(wallAsUtc), offset(wallAsUtc + DAY_MS)]
    .map((zoneOffset) => wallAsUtc - zoneOffset)
    .filter((instant) => instant + offset(instant) === wallAsUtc);
  // Celebration API resolves overlaps to the first occurrence and advances nonexistent hours by the gap.
  return candidates.length ? Math.min(...candidates) : wallAsUtc - before;
}
