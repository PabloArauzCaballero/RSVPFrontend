import { z } from "zod";
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const registerSchema = loginSchema.extend({ password: z.string().min(12), role: z.enum(["HOST", "PLANNER", "PROVIDER"]) });
