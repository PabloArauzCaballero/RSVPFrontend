import { themeFromTemplate, type CelebrationTheme } from "@rsvp/celebration-theme/model";
import { useCelebrationDesign, useTemplate, type Celebration, type TranslatedEventType } from "@rsvp/query-hooks";
import { useApiClient } from "../platform/providers";
import { asTemplateDocument } from "./template-gallery";

/**
 * The look the host sees in its previews: the design it is editing (its DRAFT, which is what "Vista previa" promises: what the page
 * will look like with the changes already made), on top of the celebration's template. Without a design, or while it loads or
 * fails, the template alone, as before: a preview never breaks for lack of a design.
 */
export function usePreviewTheme(celebration: Celebration, eventType: TranslatedEventType | undefined): CelebrationTheme {
  const client = useApiClient();
  const template = useTemplate(client, celebration.templateId);
  const design = useCelebrationDesign(client, celebration.id);
  const base = template.data ? asTemplateDocument(template.data) : null;
  const document = design.data?.document as { readonly schemaVersion?: unknown } | undefined;
  const drawn = base && document?.schemaVersion === 2 ? { ...base, theme: design.data?.document as unknown as typeof base.theme } : base;
  return themeFromTemplate(drawn, eventType?.enabledSections ?? []);
}
