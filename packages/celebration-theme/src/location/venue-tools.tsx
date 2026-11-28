"use client";

import { useState, type ReactNode } from "react";
import { VenueMap, type VenueMapLabels } from "./venue-map.js";

/** The parts of a place that need the browser. They get their text already translated (see venue-details.tsx). */

export interface VenueToolsLabels extends VenueMapLabels {
  readonly directions: string;
  readonly directionsName: string;
  readonly copy: string;
  readonly copyName: string;
  readonly copied: string;
  readonly copyFailed: string;
  readonly unmarked: string;
}

export interface VenueToolsProps {
  readonly labels: VenueToolsLabels;
  readonly copyText: string;
  readonly point?: { readonly lat: number; readonly lng: number };
  readonly directionsHref?: string;
}

export function VenueTools({ labels, copyText, point, directionsHref }: VenueToolsProps): ReactNode {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const copyAddress = async (): Promise<void> => {
    setCopy("idle");
    try {
      // Absent on insecure origins and in some in-app browsers: the failure shows the text to copy by hand.
      await navigator.clipboard.writeText(copyText);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  };
  return (
    <div className="celebration-venue-tools">
      {point ? <VenueMap point={point} labels={labels} /> : <p className="celebration-note">{labels.unmarked}</p>}
      <div className="celebration-venue-actions">
        {directionsHref ? <a href={directionsHref} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" data-link-kind="navigation" aria-label={labels.directionsName}>{labels.directions}</a> : null}
        <button type="button" onClick={() => { void copyAddress(); }} aria-label={labels.copyName}>{labels.copy}</button>
      </div>
      {/* Always in the page, so screen readers announce what appears inside it. */}
      <div aria-live="polite" className="celebration-venue-status">
        {copy === "copied" ? <p>{labels.copied}</p> : null}
        {copy === "failed" ? <><p>{labels.copyFailed}</p><p className="celebration-venue-copytext">{copyText}</p></> : null}
      </div>
    </div>
  );
}
