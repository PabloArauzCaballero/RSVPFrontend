/**
 * The import answers each rejected row with an English sentence ("email must be valid") and a technical field name.
 * Rows show our own words, picked by pattern; a sentence we do not know is never shown raw.
 */
export type ReasonKey = "email" | "contact" | "header" | "name" | "phone" | "locale" | "companions" | "group" | "other";

const PATTERNS: readonly (readonly [RegExp, ReasonKey])[] = [
  [/header must contain/i, "header"],
  [/at least one contact/i, "contact"],
  [/email/i, "email"],
  [/phone/i, "phone"],
  [/locale|language/i, "locale"],
  [/companion|non-negative|integer/i, "companions"],
  [/group/i, "group"],
  [/name/i, "name"]
];

export function reasonKey(reason: string): ReasonKey {
  return PATTERNS.find(([pattern]) => pattern.test(reason))?.[1] ?? "other";
}

export const IMPORT_FIELDS = ["name", "email", "phone", "contact", "csv", "locale", "allowedCompanions", "groupId"] as const;
export const isImportField = (field: string): field is (typeof IMPORT_FIELDS)[number] => (IMPORT_FIELDS as readonly string[]).includes(field);
