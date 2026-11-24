import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useDocumentLanguage } from "../src/platform/document-language";
import type { AppLocale } from "@rsvp/i18n";

function Probe({ locale }: { readonly locale: AppLocale }) { useDocumentLanguage(locale); return null; }

afterEach(() => { document.documentElement.removeAttribute("lang"); });

describe("M12 · <html lang> follows the language on screen", () => {
  it("sets and updates the document language when the person changes it", () => {
    const view = render(<Probe locale="es-BO" />);
    expect(document.documentElement.lang).toBe("es-BO");
    act(() => { view.rerender(<Probe locale="en-US" />); });
    expect(document.documentElement.lang).toBe("en-US");
  });
});
