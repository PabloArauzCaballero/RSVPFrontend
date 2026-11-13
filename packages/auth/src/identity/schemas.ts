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
export const registerSchema = z.object({
  email,
  password: z.string().min(1, "required").min(MIN_REGISTER_PASSWORD, "passwordShort").max(MAX_PASSWORD, "tooLong").refine((value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES, "passwordBytes"),
  role: z.enum(["HOST", "PLANNER", "PROVIDER"])
});

/** Validation keys are translated by the app (`auth.validation.<key>`); this returns the first issue per field. */
export function validate<TSchema extends z.ZodTypeAny>(schema: TSchema, input: unknown): { readonly ok: true; readonly value: z.infer<TSchema> } | { readonly ok: false; readonly errors: Readonly<Record<string, string>> } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) { const field = String(issue.path[0] ?? "form"); if (!(field in errors)) errors[field] = issue.message; }
  return { ok: false, errors };
}
