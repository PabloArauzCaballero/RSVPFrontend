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

/**
 * The sign-up form (Identity 2.1.0): who the person is, how to reach them, what they do and how they sign in. Identity takes
 * the profile as optional; the app asks for name, mobile and city because the account needs them from day one.
 */
export const registerSchema = z.object({
  role: z.enum(["HOST", "PLANNER", "PROVIDER"]),
  givenName: personName,
  familyName: personName,
  phone: z.string().transform((value) => { const compact = value.replace(/[\s().-]/g, ""); return /^\+?\d{0,3}$/.test(compact) ? "" : compact; }).pipe(z.string().min(1, "required").regex(E164, "invalidPhone")),
  city: z.string().trim().min(1, "required").max(MAX_NAME, "tooLong"),
  country: z.string().regex(/^[A-Z]{2}$/).default("BO"),
  /** Company or team of a PLANNER (created as an Identity organization with the account); ignored for other roles. */
  organizationName: z.string().trim().max(MAX_COMPANY, "tooLong").default(""),
  email,
  password: newPassword,
  passwordConfirmation: z.string().min(1, "required"),
  marketingOptIn: z.boolean().default(false)
});
export type RegisterForm = z.infer<typeof registerSchema>;

/**
 * Validates the whole sign-up form and reports every field at once. Cross-field rules live outside the zod object because zod
 * skips the refinements of an object while any of its fields fails, which would hide them until a second try.
 */
export function validateRegistration(input: unknown): ReturnType<typeof validate<typeof registerSchema>> {
  const checked = validate(registerSchema, input);
  const raw = (input ?? {}) as Partial<Record<"role" | "organizationName" | "password" | "passwordConfirmation", unknown>>;
  const extra: Record<string, string> = {};
  if (raw.role === "PLANNER" && typeof raw.organizationName === "string" && !raw.organizationName.trim()) extra["organizationName"] = "required";
  if (typeof raw.passwordConfirmation === "string" && raw.passwordConfirmation && raw.password !== raw.passwordConfirmation) extra["passwordConfirmation"] = "passwordMismatch";
  if (!Object.keys(extra).length) return checked;
  return { ok: false, errors: { ...extra, ...(checked.ok ? {} : checked.errors) } };
}
export const passwordResetSchema = z.object({ token: z.string().min(1, "linkInvalid").max(MAX_LINK_TOKEN, "linkInvalid"), newPassword });

/** Validation keys are translated by the app (`auth.validation.<key>`); this returns the first issue per field. */
export function validate<TSchema extends z.ZodTypeAny>(schema: TSchema, input: unknown): { readonly ok: true; readonly value: z.infer<TSchema> } | { readonly ok: false; readonly errors: Readonly<Record<string, string>> } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) { const field = String(issue.path[0] ?? "form"); if (!(field in errors)) errors[field] = issue.message; }
  return { ok: false, errors };
}
