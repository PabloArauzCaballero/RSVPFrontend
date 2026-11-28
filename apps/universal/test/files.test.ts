import { afterEach, describe, expect, it, vi } from "vitest";

const share = vi.hoisted(() => vi.fn());
vi.mock("react-native", () => ({ Share: { share, sharedAction: "sharedAction", dismissedAction: "dismissedAction" } }));

afterEach(() => { vi.restoreAllMocks(); share.mockReset(); });

describe("saveTextFile on the device (m2 · the system share sheet)", () => {
  it("says shared only when the sheet sent the text somewhere", async () => {
    const { saveTextFile } = await import("../src/platform/files");
    share.mockResolvedValueOnce({ action: "sharedAction" });
    expect(await saveTextFile("leads-2026-11.csv", "a,b")).toBe("shared");
    expect(share).toHaveBeenCalledWith({ title: "leads-2026-11.csv", message: "a,b" });
  });
  it("a sheet closed without choosing is dismissed, not shared, so no screen announces a file that went nowhere", async () => {
    const { saveTextFile } = await import("../src/platform/files");
    share.mockResolvedValueOnce({ action: "dismissedAction" });
    expect(await saveTextFile("leads.csv", "a")).toBe("dismissed");
  });
  it("a failure of the sheet is failed", async () => {
    const { saveTextFile } = await import("../src/platform/files");
    share.mockRejectedValueOnce(new Error("no sheet"));
    expect(await saveTextFile("leads.csv", "a")).toBe("failed");
  });
});

describe("saveTextFile on the web (m3 · one byte order mark, the name and the type)", () => {
  it("downloads a UTF-8 text/csv Blob that starts with exactly one U+FEFF and keeps the text as is", async () => {
    const { saveTextFile } = await import("../src/platform/files.web");
    const blobs: Blob[] = [];
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: (blob: Blob) => { blobs.push(blob); return "blob:test"; }, revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const names: string[] = [];
    const original = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => { const node = original(tag); if (tag === "a") Object.defineProperty(node, "download", { set: (value: string) => names.push(value), get: () => names.at(-1) ?? "" }); return node; });
    expect(await saveTextFile("leads-2026-11.csv", "título,válidos\n")).toBe("downloaded");
    expect(click).toHaveBeenCalledTimes(1);
    expect(names).toEqual(["leads-2026-11.csv"]);
    expect(blobs[0]?.type).toBe("text/csv;charset=utf-8");
    const bytes = await new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(blobs[0]!);
    });
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // exactly one U+FEFF in UTF-8
    expect([...bytes.slice(3, 6)]).not.toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes.slice(3))).toBe("título,válidos\n");
    vi.unstubAllGlobals();
  });
});
