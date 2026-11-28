import { z } from "zod";

const MAX_EMAIL = 320;
const MAX_PASSWORD_BYTES = 72;
const MIN_REGISTER_PASSWORD = 12;
const MAX_PASSWORD = 128;
/** Deliberately loose: the server is the authority on addresses. This only catches obvious typos. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const email = z.string().trim().min(1, "required").max(MAX_EMAIL, "tooLong").regex(EMAIL, "invalidEmail");

export const loginSchema = z.object({ email, password: z.string().min(1, "required").max(MAX_PASSWORD, "tooLong") });
export const recoverySchema = z.object({ email });
/** Identity's PasswordPolicy: 12+ characters, at most 72 UTF-8 bytes (bcrypt). */
const newPassword = z.string().min(1, "required").min(MIN_REGISTER_PASSWORD, "passwordShort").max(MAX_PASSWORD, "tooLong").refine((value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES, "passwordBytes");
const MAX_LINK_TOKEN = 128;

const MAX_NAME = 80;
const MAX_COMPANY = 120;
/** E.164 once spaces, dashes and brackets are dropped: "+591 7 123 4567" is accepted and sent as "+59171234567". A bare country code counts as empty. */
const E164 = /^\+[1-9]\d{6,14}$/;
const personName = z.string().trim().min(1, "required").max(MAX_NAME, "tooLong");

/** Bolivian cities offered at sign-up (department capitals plus El Alto); the screen also lets the person type another one. */
export const SIGN_UP_CITIES = ["La Paz", "El Alto", "Santa Cruz de la Sierra", "Cochabamba", "Sucre", "Oruro", "Potosí", "Tarija", "Trinidad", "Cobija"] as const;

const ROLES = z.enum(["HOST", "PLANNER", "PROVIDER"]);
const phone = z.string().transform((value) => { const compact = value.replace(/[\s().-]/g, ""); return /^\+?\d{0,3}$/.test(compact) ? "" : compact; }).pipe(z.string().min(1, "required").regex(E164, "invalidPhone"));
const city = z.string().trim().min(1, "required").max(MAX_NAME, "tooLong");
const CODE_LENGTH = 6;

/**
 * Sign-up in four steps (MV-D2). Each step has its own schema so a step is validated when the person leaves it and the whole
 * form again at the end; the server stays the authority. There is one password (no confirmation: the field has a show toggle).
 *  1. e-mail, then the 6-digit code that proves it (`registrationEmailSchema`, `registrationCodeSchema`);
 *  2. account type, first name and last name (`registrationAccountSchema`);
 *  3. mobile and city (`registrationContactSchema`);
 *  4. password and marketing consent (`registrationPasswordSchema`); the terms checkbox is checked by the screen (B6).
 */
export const registrationEmailSchema = z.object({ email });
/** The code is typed, pasted or auto-filled from the e-mail: spaces and dashes are dropped before looking at it. */
export const registrationCodeSchema = z.object({
  code: z.string().transform((value) => value.replace(/[\s-]/g, "")).pipe(z.string().min(1, "required").regex(new RegExp(`^\\d{${CODE_LENGTH}}$`), "invalidCode"))
});
export const registrationAccountSchema = z.object({
  role: ROLES,
  givenName: personName,
  familyName: personName,
  /** Company or team of a PLANNER (created as an Identity organization with the account); ignored for other roles. */
  organizationName: z.string().trim().max(MAX_COMPANY, "tooLong").default("")
});
export const registrationContactSchema = z.object({ phone, city, country: z.string().regex(/^[A-Z]{2}$/).default("BO") });
export const registrationPasswordSchema = z.object({ password: newPassword, marketingOptIn: z.boolean().default(false) });
export const REGISTRATION_CODE_LENGTH = CODE_LENGTH;

/**
 * The whole sign-up form (Identity 2.1.0 profile + 2.3.0 proof). Identity takes the profile as optional; the app asks for name,
 * mobile and city because the account needs them from day one.
 */
export const registerSchema = registrationAccountSchema.merge(registrationContactSchema).merge(registrationPasswordSchema).extend({ email });
export type RegisterForm = z.infer<typeof registerSchema>;

/** Adds the cross-field rule to a schema's verdict: a PLANNER names the company or team that is created with the account. */
function withCompanyRule<TSchema extends z.ZodTypeAny>(schema: TSchema, input: unknown): ReturnType<typeof validate<TSchema>> {
  const checked = validate(schema, input);
  const raw = (input ?? {}) as Partial<Record<"role" | "organizationName", unknown>>;
  if (raw.role === "PLANNER" && typeof raw.organizationName === "string" && !raw.organizationName.trim()) return { ok: false, errors: { organizationName: "required", ...(checked.ok ? {} : checked.errors) } };
  return checked;
}
/**
 * Validates the whole sign-up form and reports every field at once. Cross-field rules live outside the zod object because zod
 * skips the refinements of an object while any of its fields fails, which would hide them until a second try.
 */
export function validateRegistration(input: unknown): ReturnType<typeof validate<typeof registerSchema>> { return withCompanyRule(registerSchema, input); }
/** Step 2 on its own, with the same company rule. */
export function validateRegistrationAccount(input: unknown): ReturnType<typeof validate<typeof registrationAccountSchema>> { return withCompanyRule(registrationAccountSchema, input); }
export const passwordResetSchema = z.object({ token: z.string().min(1, "linkInvalid").max(MAX_LINK_TOKEN, "linkInvalid"), newPassword });

/** Validation keys are translated by the app (`auth.validation.<key>`); this returns the first issue per field. */
export function validate<TSchema extends z.ZodTypeAny>(schema: TSchema, input: unknown): { readonly ok: true; readonly value: z.infer<TSchema> } | { readonly ok: false; readonly errors: Readonly<Record<string, string>> } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) { const field = String(issue.path[0] ?? "form"); if (!(field in errors)) errors[field] = issue.message; }
  return { ok: false, errors };
}
