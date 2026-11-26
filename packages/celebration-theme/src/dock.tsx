import type { ReactNode } from "react";
import { GiftsAction, RsvpAction, type SectionProps } from "./sections/index.js";

/**
 * P22: the gifts button and the reply, always in view. Fixed at the bottom of the phone, sticky on top of the desktop. It is the
 * renderer's chrome, not a section or an element of a document: nothing a template or a design says can hide, cover or remove it.
 */
export function Dock({ t, giftsHref, giftsStatus, rsvpHref, rsvpHelpHref, rsvpAdaptive }: Pick<SectionProps, "t" | "giftsHref" | "giftsStatus" | "rsvpHref" | "rsvpHelpHref" | "rsvpAdaptive">): ReactNode {
  return (
    <div className="cdesign-dock" role="group" aria-label={t("celebration.dock.label")} data-dock="">
      <GiftsAction t={t} giftsHref={giftsHref} giftsStatus={giftsStatus} dock />
      <RsvpAction t={t} rsvpHref={rsvpHref} rsvpHelpHref={rsvpHelpHref} rsvpAdaptive={rsvpAdaptive} />
    </div>
  );
}
