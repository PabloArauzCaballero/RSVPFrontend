import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { AttendanceChoice, GuestConsent } from "../src/guest/response-controls.web";
import { fakeClient, renderApp } from "./support";

it("F21 web · exposes real radio/checkbox controls and preserves exclusive attendance selection", () => {
  function Form() {
    const [value, setValue] = useState<"CONFIRMED" | "DECLINED" | null>(null);
    const [consent, setConsent] = useState(false);
    return <><AttendanceChoice value={value} onChange={setValue} /><GuestConsent value={consent} onChange={setConsent} /></>;
  }
  renderApp(<Form />, fakeClient({}).client);
  const yes = screen.getByRole("radio", { name: "Sí, asistiré" }) as HTMLInputElement;
  const no = screen.getByRole("radio", { name: "No podré asistir" }) as HTMLInputElement;
  expect(yes.tagName).toBe("INPUT");
  fireEvent.click(yes); expect(yes.checked).toBe(true); expect(no.checked).toBe(false);
  fireEvent.click(no); expect(no.checked).toBe(true); expect(yes.checked).toBe(false);
  const consent = screen.getByRole("checkbox") as HTMLInputElement;
  fireEvent.click(consent); expect(consent.checked).toBe(true);
  fireEvent.click(consent); expect(consent.checked).toBe(false);
});
