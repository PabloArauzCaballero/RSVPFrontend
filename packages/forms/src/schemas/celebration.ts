import { z } from "zod";
export const celebrationSchema = z.object({ typeCode: z.string().min(1), eventDate: z.string().datetime(), timeZone: z.string().min(1), defaultLocale: z.enum(["es-BO", "en-US"]).default("es-BO") });
