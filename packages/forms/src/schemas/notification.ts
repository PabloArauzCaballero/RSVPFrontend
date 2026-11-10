import { z } from "zod";

/** QuietHoursOverride accepts whole local hours, including zero-padded input such as 07. */
export const quietHourSchema = z.string().trim().regex(/^(?:[01]?[0-9]|2[0-3])$/).transform(Number);
