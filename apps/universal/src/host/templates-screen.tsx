import type { ReactNode } from "react";
import { useT } from "../platform/providers";
import { CelebrationScreen, type ScreenProps } from "./gate";
import { TemplateGallery } from "./template-gallery";

/** C14 · Compatible templates; switching and switching back leaves the celebration identical. */
export function TemplatesScreen({ celebrationId, onNavigate }: ScreenProps): ReactNode {
  const t = useT();
  return (
    <CelebrationScreen celebrationId={celebrationId} onNavigate={onNavigate} current="templates" title={t("host.templates.title")}>
      {({ celebration, eventType, refetch }) => <TemplateGallery celebration={celebration} eventType={eventType} onApplied={refetch} />}
    </CelebrationScreen>
  );
}
