"use client";

import { useEffect, useState } from "react";

type State = "unsupported" | "idle" | "locating" | "denied";

export interface NearMeLabels {
  readonly use: string;
  readonly locating: string;
  readonly denied: string;
}

/**
 * Optional browser geolocation for the directory search. The position is only requested after the click,
 * written into the form's hidden lat/lng fields and submitted. If the visitor refuses or the lookup fails,
 * the city select keeps working: it is the fallback, and the message says so.
 */
export function NearMeButton({ labels }: { readonly labels: NearMeLabels }) {
  const [state, setState] = useState<State>("unsupported");
  useEffect(() => { if ("geolocation" in navigator) setState("idle"); }, []);
  if (state === "unsupported") return null;

  const locate = (form: HTMLFormElement | null): void => {
    if (!form) return;
    setState("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        (form.elements.namedItem("lat") as HTMLInputElement).value = position.coords.latitude.toFixed(2);
        (form.elements.namedItem("lng") as HTMLInputElement).value = position.coords.longitude.toFixed(2);
        form.requestSubmit();
      },
      () => setState("denied"),
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 }
    );
  };

  return (
    <div className="directory-nearme">
      <button type="button" className="rsvp-button rsvp-button--secondary" disabled={state === "locating"} onClick={(event) => locate(event.currentTarget.form)}>
        {state === "locating" ? labels.locating : labels.use}
      </button>
      <p role="status" className="directory-nearme-status">{state === "denied" ? labels.denied : ""}</p>
    </div>
  );
}
