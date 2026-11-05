import { describe, expect, it } from "vitest";
import { celebrationSchema, loginSchema, registerSchema } from "../index.js";

describe("auth forms", () => {
  it("login needs a valid email and any non-empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
  it("register demands 12+ characters and one of the three public roles (never ADMIN)", () => {
    const base = { email: "a@b.co", password: "123456789012", role: "HOST" };
    expect(registerSchema.safeParse(base).success).toBe(true);
    expect(registerSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, role: "ADMIN" }).success).toBe(false);
  });
});

describe("celebration form", () => {
  it("defaults the locale to es-BO and requires an ISO instant", () => {
    const parsed = celebrationSchema.parse({ typeCode: "WEDDING", eventDate: "2026-12-19T23:00:00.000Z", timeZone: "America/La_Paz" });
    expect(parsed.defaultLocale).toBe("es-BO");
    expect(celebrationSchema.safeParse({ typeCode: "WEDDING", eventDate: "19/12/2026", timeZone: "America/La_Paz" }).success).toBe(false);
    expect(celebrationSchema.safeParse({ typeCode: "", eventDate: "2026-12-19T23:00:00.000Z", timeZone: "x" }).success).toBe(false);
  });
});
