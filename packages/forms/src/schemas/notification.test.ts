import { describe, expect, it } from "vitest";
import { quietHourSchema } from "./notification.js";

describe("quiet-hour input", () => {
  it.each([["00", 0], [" 07 ", 7], ["23", 23]] as const)("parses %s as %i", (input, hour) => {
    expect(quietHourSchema.parse(input)).toBe(hour);
  });

  it.each(["", "-1", "24", "7.5", "07:30"])("rejects %j", (input) => {
    expect(quietHourSchema.safeParse(input).success).toBe(false);
  });
});
