import { describe, expect, it } from "vitest";
import { createTranslator, resources } from "../src/index.js";

type Tree = { readonly [key: string]: string | Tree };
const leaves = (tree: Tree, prefix = ""): string[] =>
  Object.entries(tree).flatMap(([key, value]) => (typeof value === "string" ? [`${prefix}${key}`] : leaves(value, `${prefix}${key}.`)));

describe("translation resources", () => {
  it("es-BO and en-US have exactly the same keys, none empty", () => {
    const es = leaves(resources["es-BO"] as Tree).sort();
    const en = leaves(resources["en-US"] as Tree).sort();
    expect(en).toEqual(es);
    const empty = (tree: Tree): string[] => leaves(tree).filter((path) => !String(path.split(".").reduce<unknown>((node, key) => (node as Tree)[key], tree)).trim());
    expect(empty(resources["es-BO"] as Tree)).toEqual([]);
    expect(empty(resources["en-US"] as Tree)).toEqual([]);
  });

  it("the synchronous translator interpolates and pluralises", () => {
    const es = createTranslator("es-BO");
    expect(es("celebration.hero.countdown", { count: 1 })).toBe("Falta 1 día");
    expect(es("celebration.hero.countdown", { count: 64 })).toBe("Faltan 64 días");
    expect(createTranslator("en-US")("celebration.hero.countdown", { count: 64 })).toBe("64 days to go");
    expect(createTranslator("en-US")("celebration.sections.schedule")).toBe("Schedule");
  });
});

describe("R8a · gifts button on the invitation", () => {
  it("publishes one label per gifts summary status in both languages", () => {
    const es = createTranslator("es-BO");
    const en = createTranslator("en-US");
    expect([es("gifts.guest.cta.open"), es("gifts.guest.cta.empty"), es("gifts.guest.cta.closed")]).toEqual(["Ver regalos", "Lista de regalos (pronto)", "Ver regalos"]);
    expect([en("gifts.guest.cta.open"), en("gifts.guest.cta.empty"), en("gifts.guest.cta.closed")]).toEqual(["View gifts", "Gift list (coming soon)", "View gifts"]);
  });
});

describe("B6 · legal texts", () => {
  it("every section of both documents has a heading and a body in both languages, and both carry the same version", async () => {
    const { LEGAL_DOCUMENTS, legalBlocks } = await import("../src/index.js");
    for (const locale of ["es-BO", "en-US"] as const) {
      const t = createTranslator(locale);
      for (const [document, { sections }] of Object.entries(LEGAL_DOCUMENTS)) {
        for (const section of sections) {
          expect(t(`legal.${document}.sections.${section}.heading`)).not.toContain("legal.");
          expect(legalBlocks(t(`legal.${document}.sections.${section}.body`)).length).toBeGreaterThan(0);
        }
      }
    }
    expect(createTranslator("en-US")("legal.version")).toBe(createTranslator("es-BO")("legal.version"));
  });

  it("the retention section states the D-5 periods: cascade deletion, 12 months after the event, backups 90 days", () => {
    const es = createTranslator("es-BO")("legal.privacy.sections.retention.body");
    expect(es).toMatch(/12 meses después de la fecha del evento/);
    expect(es).toMatch(/90 días/);
    expect(es).toMatch(/en cascada/);
    expect(createTranslator("en-US")("legal.privacy.sections.retention.body")).toMatch(/12 months after the event date[\s\S]*90 days/);
  });

  it("splits a body into paragraphs and lists", async () => {
    const { legalBlocks } = await import("../src/index.js");
    expect(legalBlocks("Intro:\n- uno\n- dos\n\nCierre.")).toEqual([{ kind: "paragraph", text: "Intro:" }, { kind: "list", items: ["uno", "dos"] }, { kind: "paragraph", text: "Cierre." }]);
  });

  it.each(["es-BO", "en-US"] as const)("WCAG 2.5.3 · %s: the accessible name of each media button starts with the text the button shows", (locale) => {
    const t = createTranslator(locale);
    const title = "Vals de los novios";
    const pairs: ReadonlyArray<readonly [string, string]> = [
      ["celebration.media.playShort", "celebration.media.play"], ["celebration.media.pauseShort", "celebration.media.pause"],
      ["celebration.media.openVideo", "celebration.media.playVideo"], ["celebration.media.openMusic", "celebration.media.playMusic"], ["celebration.media.openMap", "celebration.media.showMap"],
      ["celebration.media.retryShort", "celebration.media.retry"]
    ];
    for (const [visible, name] of pairs) expect(t(name, { title }).toLowerCase().startsWith(t(visible).toLowerCase()), `${locale} ${name}`).toBe(true);
    // The MP3 button and the Spotify one do not show the same word: two "Listen" buttons side by side would not say which is which.
    expect(t("celebration.media.playShort")).not.toBe(t("celebration.media.openMusic"));
  });
});

describe("es-BO addresses the reader with tuteo, never voseo", () => {
  type Leaf = { readonly path: string; readonly text: string };
  const collect = (tree: Tree, prefix = ""): Leaf[] =>
    Object.entries(tree).flatMap(([key, value]) => (typeof value === "string" ? [{ path: `${prefix}${key}`, text: value }] : collect(value, `${prefix}${key}.`)));
  // Voseo stresses the last syllable of the verb («volvé», «confirmá», «elegí», «podés», «tenés»). The stems are the verbs the interface uses to talk to people.
  const VOSEO = new RegExp(`(?<![\\p{L}])(?:vos|sos)(?![\\p{L}])|(?<![\\p{L}])(?:volv|confirm|eleg|pod|ten|quer|sab|ven|and|hac|mir|dec|pon|escrib|toc|segu|busc|agreg|guard|revis|cre|compart|invit|sub|ingres|us|prob|llam|abr|cerr|cambi|descarg|carg|entr|sal|ped|resolv|reintent|contact|respond|complet|acept|rechaz|apret|presion|dej|quit|elimin|edit|copi|fij|marc|desmarc|escog|comenz|empez|pens|continu|prefer|compr|reserv|regal|cancel|ayud|sum|resta|mostr|ocult|public|envi|pag|avis|intent|esper|record|mant|recib|pas|encontr|verific|seleccion|escuch|fij|acord|compr)(?:á|é|í|ás|és|ís)(?![\\p{L}])`, "iu");
  // First-person preterites that share the stress («Ya entré», «las que recibí»): they speak of the writer, not to the reader.
  const FIRST_PERSON = new Set(["entré", "revisé", "dejé", "usé", "probé", "pedí", "salí", "subí", "abrí", "creé", "recibí", "compré", "olvidé", "cambié", "guardé", "envié", "pagué", "reservé", "regalé", "publiqué", "compartí", "cancelé", "ayudé"]);
  it("has no voseo form in any text", () => {
    const hits = collect(resources["es-BO"] as Tree).flatMap(({ path, text }) =>
      (text.match(new RegExp(VOSEO.source, "giu")) ?? []).filter((word) => !FIRST_PERSON.has(word.toLowerCase())).map((word) => `${path}: ${word}`));
    expect(hits).toEqual([]);
  });
  it("the detector does catch the forms that once slipped in", () => {
    for (const sample of ["volvé a tu respuesta", "confirmá que asistirás", "elegí un regalo", "si volvés a asistir", "podés cambiarlo", "tenés que elegir", "avisá si cambia", "vos sabés"]) expect(VOSEO.test(sample)).toBe(true);
    for (const sample of ["vuelve a tu respuesta", "confirma que asistirás", "elige un regalo", "podrás cambiarlo", "está aquí", "después"]) expect(VOSEO.test(sample)).toBe(false);
  });
});
