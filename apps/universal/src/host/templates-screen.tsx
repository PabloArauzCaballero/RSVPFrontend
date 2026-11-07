import type { ReactNode } from "react";
import { useT } from "../platform/providers";
import { CelebrationScreen, type ScreenProps } from "./gate";
import { HOST_ROUTES, withCelebration } from "./routes";
import { TemplateGallery } from "./template-gallery";

/** C14 · Compatible styles; switching and switching back leaves the celebration identical. */
export function TemplatesScreen({ celebrationId, onNavigate }: ScreenProps): ReactNode {
  const t = useT();
  return (
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="templates" editable title={t("host.templates.title")} intro={t("host.templates.intro")}>
      {({ celebration, eventType, refetch }) => <TemplateGallery celebration={celebration} eventType={eventType} onApplied={refetch} onSeeFull={() => onNavigate(withCelebration(HOST_ROUTES.preview, celebration.id))} />}
    </CelebrationScreen>
  );
}
