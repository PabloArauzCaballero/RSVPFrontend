import { createRoot } from "react-dom/client";
import { design } from "@rsvp/celebration-theme";
import { createTranslator, type AppLocale } from "@rsvp/i18n";
import { EditorShell, type EditableDesign } from "../../src/ui/index.js";
import type { DraftGateway } from "../../src/save/autosave.js";
import type { VersionSummary, VersionsGateway } from "../../src/save/versions.js";

declare global { interface Window { __saves: { id: string; version: number; accent: string }[]; __lastDocument: ReturnType<typeof design.convertV1ToV2> } }

/**
 * ?fail=409|422|401|403|offline  the first saves fail that way (409 stops until the newer version is loaded)
 * ?warn=1                        the server answers with a P19 contrast warning
 * ?slow=1                        a save takes 4 s (to see the saving state)
 * ?empty=1                       the first section page has no elements; ?nopages=1 the design has no pages
 * ?versions=loading|error|empty|many  the history never answers / fails the first time / is empty / has 100 versions in two pages
 * ?publish=409|422|offline ?restore=slow|409|422|401  publishing or restoring fails that way (restore=slow takes 3 s)
 * ?theme=dark|light ?lang=en-US
 */
const params = new URLSearchParams(window.location.search);
const locale = (params.get("lang") ?? "es-BO") as AppLocale;
const fail = params.get("fail");
const theme = params.get("theme");
if (theme) document.documentElement.setAttribute("data-theme", theme);

const base = design.convertV1ToV2(
  { palette: { canvas: "#FBF7F0", surface: "#FFFFFF", text: "#2B2622", accent: "#7A5230", muted: "#665C52" }, typography: { heading: "'Cormorant Garamond', Georgia, serif", body: "'Source Sans 3', Arial, sans-serif" }, sectionStyle: "bands" },
  "classic", ["story", "schedule", "venues", "gallery", "dressCode", "gifts", "faq", "recommendations", "rsvp"]
);
const document0: design.DesignDocumentV2 = params.get("nopages") ? { ...base, pages: [] }
  : params.get("empty") ? { ...base, pages: base.pages.map((page, index) => (index === 1 ? { ...page, canvases: { ...page.canvases, mobile: { ...page.canvases.mobile, elements: [] } } } : page)) }
  : base;

window.__saves = [];
let version = 4;
let failing = fail !== null;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const gateway: DraftGateway = {
  async saveDraft(id, draftVersion, doc) {
    window.__lastDocument = doc;
    window.__saves.push({ id, version: draftVersion, accent: doc.tokens.palettes.light.accent });
    if (params.get("slow")) await sleep(4000);
    if (failing && fail === "409") throw Object.assign(new Error("conflict"), { status: 409, problem: { code: "VERSION_CONFLICT", currentVersion: 9 } });
    if (failing && fail === "422") throw Object.assign(new Error("invalid"), { status: 422, problem: { code: "DESIGN_TOO_LARGE" } });
    if (failing && fail === "401") throw Object.assign(new Error("expired"), { status: 401 });
    if (failing && fail === "403") throw Object.assign(new Error("forbidden"), { status: 403 });
    if (failing && fail === "offline") throw new TypeError("offline");
    version = draftVersion + 1;
    if (params.get("warn")) {
      return { draftVersion: version, warnings: [{ code: "LOW_CONTRAST" as const, scheme: "dark" as const, foreground: "accent" as const, background: "canvas" as const, ratio: 3.21, minimum: 4.5, suggestion: "#C9A27A" }] };
    }
    return { draftVersion: version };
  }
};

let published: VersionSummary[] = [{ version: 1, label: "Inicial", createdAt: "2026-11-20T15:30:00Z" }];
const history: Record<number, typeof document0> = { 1: document0 };
const mode = params.get("versions");
const many: VersionSummary[] = Array.from({ length: 100 }, (_, index) => ({ version: 100 - index, label: index % 7 === 0 ? `Cambio ${100 - index}` : "", createdAt: "2026-11-20T15:30:00Z" }));
let listCalls = 0;
const failWith = (status: number, code: string): Error => Object.assign(new Error(code), { status, problem: { code, currentVersion: 9 } });
const versions: VersionsGateway = {
  async list(_id, before) {
    listCalls += 1;
    if (mode === "loading") return new Promise(() => undefined);
    if (mode === "error" && listCalls === 1) throw new TypeError("offline");
    if (mode === "empty") return { items: [], nextBefore: null };
    if (mode === "many") return before === undefined ? { items: many.slice(0, 50), nextBefore: 51 } : { items: many.slice(50), nextBefore: null };
    return { items: [...published].reverse(), nextBefore: null };
  },
  async publish(_id, draftVersion, label) {
    if (params.get("publish") === "409") throw failWith(409, "VERSION_CONFLICT");
    if (params.get("publish") === "422") throw failWith(422, "GIFTS_BLOCK_COVERED");
    if (params.get("publish") === "offline") throw new TypeError("offline");
    const next = { version: published.length + 1, label, createdAt: "2026-11-24T12:00:00Z" };
    published = [...published, next];
    history[next.version] = window.__lastDocument ?? document0;
    return { draftVersion, version: next };
  },
  async restore(_id, version, draftVersion) {
    const how = params.get("restore");
    if (how === "slow") await sleep(3000);
    if (how === "409") throw failWith(409, "VERSION_CONFLICT");
    if (how === "422") throw failWith(422, "DESIGN_INVALID");
    if (how === "401") throw Object.assign(new Error("expired"), { status: 401 });
    return { draftVersion: draftVersion + 1, document: history[version] ?? document0 };
  }
};

const newer: EditableDesign = {
  id: "design-1", name: "Ana y Luis", draftVersion: 9,
  document: { ...document0, tokens: { ...document0.tokens, palettes: { ...document0.tokens.palettes, light: { ...document0.tokens.palettes.light, accent: "#1F6F5C" } } } }
};
const onReload = async (): Promise<EditableDesign> => { failing = false; return newer; };

createRoot(window.document.getElementById("root") as HTMLElement).render(
  <EditorShell design={{ id: "design-1", name: "Ana y Luis", draftVersion: 4, document: document0 }} gateway={gateway} t={createTranslator(locale)} onReload={onReload} signInHref="/login?returnTo=%2Fdiseno%3Fc%3Dc-1" versions={versions} timeZone="America/La_Paz" debounceMs={300} />
);
