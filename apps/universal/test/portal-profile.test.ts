import { describe, expect, it } from "vitest";
import { documentProblem } from "../src/provider/documents-screen";
import { validateMicrosite } from "../src/provider/microsite-screen";

const blank = { es: "", en: "", website: "", instagram: "", facebook: "", whatsapp: "", line: "", reference: "", days: "", opens: "", closes: "", note: "" };

describe("REQ-F28-02 · microsite editor validation mirrors MicrositeInput", () => {
  it("builds a whole-document body from the form", () => {
    const { input, errors } = validateMicrosite({ ...blank, es: " Tortas ", website: "https://dulce.example", whatsapp: "+59170000000", line: "Av. Arce 123", days: "1, 2,3", opens: "09:00", closes: "18:30", note: "Feriados cerrado" });
    expect(errors).toEqual({});
    expect(input).toEqual({ descriptions: { "es-BO": "Tortas" }, social: { website: "https://dulce.example", whatsapp: "+59170000000" }, hours: { weekly: [{ weekdays: [1, 2, 3], opens: "09:00", closes: "18:30" }], note: "Feriados cerrado" }, address: { line: "Av. Arce 123" } });
  });
  it("rejects non-https links, bad phones, bad days and hours that do not open before closing", () => {
    const { errors } = validateMicrosite({ ...blank, website: "javascript:alert(1)", instagram: "http://insecure.example", whatsapp: "12", days: "9", opens: "18:00", closes: "09:00" });
    expect(Object.keys(errors).sort()).toEqual(["days", "instagram", "opens", "website", "whatsapp"]);
  });
  it("empty form sends empty hours, not a half-filled one", () => {
    expect(validateMicrosite(blank).input.hours).toEqual({ weekly: [] });
  });
});

describe("F28 · verification document checks before any request", () => {
  it("accepts PDF and images up to 10 MB, refuses the rest", () => {
    expect(documentProblem({ type: "application/pdf", size: 1000 })).toBeNull();
    expect(documentProblem({ type: "image/png", size: 10_485_760 })).toBeNull();
    expect(documentProblem({ type: "image/png", size: 10_485_761 })).toBe("portal.documents.tooBig");
    expect(documentProblem({ type: "application/x-msdownload", size: 10 })).toBe("portal.documents.badType");
    expect(documentProblem(null)).toBe("portal.documents.none");
  });
});
