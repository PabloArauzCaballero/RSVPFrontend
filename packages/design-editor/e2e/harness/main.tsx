import { createRoot } from "react-dom/client";
import { design } from "@rsvp/celebration-theme";
import { createTranslator, type AppLocale } from "@rsvp/i18n";
import { EditorShell } from "../../src/ui/index.js";
import type { DraftGateway } from "../../src/save/autosave.js";
import type { VersionSummary, VersionsGateway } from "../../src/save/versions.js";

declare global { interface Window { __saves: { id: string; version: number; accent: string }[]; __lastDocument: ReturnType<typeof design.convertV1ToV2> } }

const params = new URLSearchParams(window.location.search);
const locale = (params.get("lang") ?? "es-BO") as AppLocale;
const fail = params.get("fail");
const theme = params.get("theme");
if (theme) document.documentElement.setAttribute("data-theme", theme);

const document0 = design.convertV1ToV2(
  { palette: { canvas: "#FBF7F0", surface: "#FFFFFF", text: "#2B2622", accent: "#7A5230", muted: "#665C52" }, typography: { heading: "'Cormorant Garamond', Georgia, serif", body: "'Source Sans 3', Arial, sans-serif" }, sectionStyle: "bands" },
  "classic", ["story", "schedule", "venues", "gallery", "dressCode", "gifts", "faq", "recommendations", "rsvp"]
);

window.__saves = [];
let version = 4;
const gateway: DraftGateway = {
  async saveDraft(id, draftVersion, doc) {
    window.__lastDocument = doc;
    window.__saves.push({ id, version: draftVersion, accent: doc.tokens.palettes.light.accent });
    if (fail === "409") throw Object.assign(new Error("conflict"), { status: 409, problem: { code: "VERSION_CONFLICT", currentVersion: 9 } });
    if (fail === "offline") throw new TypeError("offline");
    version = draftVersion + 1;
    return { draftVersion: version };
  }
};

let published: VersionSummary[] = [{ version: 1, label: "Inicial", createdAt: "2026-11-20T15:30:00Z" }];
const history: Record<number, typeof document0> = { 1: document0 };
const versions: VersionsGateway = {
  async list() { return published; },
  async publish(_id, draftVersion, label) {
    const next = { version: published.length + 1, label, createdAt: "2026-11-24T12:00:00Z" };
    published = [...published, next];
    history[next.version] = window.__lastDocument ?? document0;
    return { draftVersion, version: next };
  },
  async restore(_id, version, draftVersion) { return { draftVersion: draftVersion + 1, document: history[version] ?? document0 }; }
};

createRoot(window.document.getElementById("root") as HTMLElement).render(
  <EditorShell design={{ id: "design-1", name: "Ana y Luis", draftVersion: 4, document: document0 }} gateway={gateway} t={createTranslator(locale)} onReload={() => undefined} versions={versions} timeZone="America/La_Paz" debounceMs={300} />
);
