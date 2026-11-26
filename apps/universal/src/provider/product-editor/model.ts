import {
  DESCRIPTION_MAX, DESCRIPTION_MIN, LEAD_TIME_MAX, PRICE_CAP_MINOR, MAX_GIFT_IDEAS, MAX_VARIANTS, TEMPLATE_MAX, TITLE_MAX, TITLE_MIN, unknownTemplateVariables,
  type CreateProductInput, type MissingCode, type PatchListingInput, type ProductSheet, type ProductStock, type ProductVariantInput
} from "@rsvp/query-hooks";
import { parseMinor } from "../../host/gifts/money";

/**
 * R2 · the product sheet as the portal edits it: six steps plus the summary (§5.1). Pure, so the step rules, the mapping of
 * `missing[]` to steps and the bodies sent to the catalog are tested without rendering.
 */
export const STEPS = ["basic", "ideas", "photos", "price", "delivery", "contact"] as const;
export type StepKey = (typeof STEPS)[number];
export type EditorStep = StepKey | "summary";
/** Spanish path segment of each step (`/portal/productos/{id}?paso=fotos`), so a shared link opens the same step. */
export const STEP_SLUG: Readonly<Record<EditorStep, string>> = { basic: "basico", ideas: "ideas", photos: "fotos", price: "precio", delivery: "entrega", contact: "contacto", summary: "resumen" };
export function stepFromSlug(slug: string | undefined, fallback: EditorStep): EditorStep {
  const found = (Object.entries(STEP_SLUG) as [EditorStep, string][]).find(([, value]) => value === slug);
  return found ? found[0] : fallback;
}

/** Each missing code opens the step where it is fixed. */
export const MISSING_STEP: Readonly<Record<MissingCode, StepKey>> = {
  TITLE: "basic", DESCRIPTION: "basic", CATEGORY: "basic", GIFT_IDEA: "ideas", PHOTO: "photos", PRICE: "price", STOCK: "price", COVERAGE: "delivery", DELIVERY: "delivery", DESTINATION: "contact"
};
export const stepsMissing = (missing: readonly MissingCode[] | undefined): ReadonlySet<StepKey> => new Set((missing ?? []).map((code) => MISSING_STEP[code]));
export const nextStep = (step: EditorStep): EditorStep => (step === "summary" ? "summary" : STEPS[STEPS.indexOf(step) + 1] ?? "summary");
export const previousStep = (step: EditorStep): EditorStep | null => (step === "summary" ? "contact" : STEPS[STEPS.indexOf(step) - 1] ?? null);

export interface VariantDraft { readonly id: string | null; readonly label: string; readonly price: string; readonly stock: ProductStock; readonly isDefault: boolean }
/** What the person types: text as typed (prices in Bs, days as text) until a step is saved. */
export interface SheetDraft {
  readonly title: string; readonly description: string; readonly category: string; readonly city: string;
  readonly dimensions: string; readonly weight: string; readonly care: string; readonly warranty: string; readonly personalizable: boolean; readonly personalizationNote: string;
  readonly giftIdeas: readonly string[];
  readonly hasVariants: boolean; readonly price: string; readonly stock: ProductStock | null; readonly variants: readonly VariantDraft[];
  readonly coverage: readonly string[]; readonly leadDays: string; readonly shipping: string; readonly pickup: boolean; readonly conditions: string;
  readonly whatsapp: string; readonly productPage: string; readonly ownTemplate: boolean; readonly template: string;
}
export const DEFAULT_CITY = "la-paz";
export const EMPTY_DRAFT: SheetDraft = {
  title: "", description: "", category: "", city: DEFAULT_CITY, dimensions: "", weight: "", care: "", warranty: "", personalizable: false, personalizationNote: "",
  giftIdeas: [], hasVariants: false, price: "", stock: null, variants: [], coverage: [], leadDays: "", shipping: "", pickup: false, conditions: "",
  whatsapp: "", productPage: "", ownTemplate: false, template: ""
};

const BS = 100;
/** Minor units back to what a person types (35050 → "350.50", 35000 → "350"). */
export const minorText = (minor: number | null | undefined): string => {
  if (typeof minor !== "number") return "";
  return minor % BS === 0 ? String(minor / BS) : (minor / BS).toFixed(2);
};
const WA = /^https:\/\/wa\.me\/(\d{6,15})$/;
/** `https://wa.me/59170012345` ↔ `+59170012345`: people type a number, the catalog stores the link without text (§5.1). */
export const waNumber = (url: string | undefined): string => { const digits = url ? WA.exec(url)?.[1] : undefined; return digits ? `+${digits}` : ""; };
export function waLink(number: string): string | null {
  const digits = number.replace(/[\s().-]/g, "").replace(/^\+/, "");
  return /^\d{6,15}$/.test(digits) ? `https://wa.me/${digits}` : null;
}
const HTTPS_URL = /^https:\/\/[^\s/$.?#][^\s]*$/i;
export const isHttpsUrl = (value: string): boolean => {
  if (!HTTPS_URL.test(value) || value.length > 500) return false;
  try { const url = new URL(value); return Boolean(url.hostname) && !url.username && !url.password; } catch { return false; }
};

/** The editable values of a sheet loaded from the catalog. Destinations are not in the sheet body (only their types), so they keep what was typed. */
export function draftFromSheet(sheet: ProductSheet, locale: string, keep: Pick<SheetDraft, "whatsapp" | "productPage"> = { whatsapp: "", productPage: "" }): SheetDraft {
  const text = (map: unknown): string => { const record = (map ?? {}) as Record<string, string>; return record["es-BO"] ?? record[locale] ?? ""; };
  const variants = (sheet.variants ?? []).map((variant): VariantDraft => ({ id: variant.id, label: variant.label, price: minorText(variant.priceMinor), stock: variant.stock, isDefault: variant.isDefault }));
  const template = text(sheet.whatsappTemplate);
  return {
    title: text(sheet.titles) || sheet.title, description: text(sheet.descriptions), category: sheet.category, city: sheet.city,
    dimensions: sheet.details?.dimensions ?? "", weight: sheet.details?.weight ?? "", care: sheet.details?.care ?? "", warranty: sheet.details?.warranty ?? "",
    personalizable: sheet.details?.personalizable ?? false, personalizationNote: sheet.details?.personalizationNote ?? "",
    giftIdeas: sheet.giftIdeas ?? [],
    hasVariants: variants.length > 0, price: minorText(sheet.priceMinor), stock: sheet.stock ?? null, variants,
    coverage: sheet.delivery?.coverageCities ?? [], leadDays: sheet.delivery?.leadTimeDays === null || sheet.delivery?.leadTimeDays === undefined ? "" : String(sheet.delivery.leadTimeDays),
    shipping: minorText(sheet.delivery?.shippingCostMinor), pickup: sheet.delivery?.pickupAvailable ?? false, conditions: text(sheet.delivery?.conditions),
    whatsapp: keep.whatsapp, productPage: keep.productPage, ownTemplate: Boolean(template), template
  };
}

/** Local problems of a step, as i18n keys under `portal.product.errors.local`. The catalog stays the judge (CONTACT_IN_TEXT, prices, cities). */
export type LocalProblem =
  | "title" | "description" | "category" | "ideas" | "ideasMax" | "price" | "stock" | "variantLabel" | "variantPrice" | "variantsMax"
  | "coverage" | "lead" | "shipping" | "conditions" | "whatsapp" | "productPage" | "destination" | "template" | "templateLong" | "templateVariables";

export function stepProblems(step: StepKey, draft: SheetDraft, options: { readonly creating?: boolean; readonly hasDestination?: boolean } = {}): readonly LocalProblem[] {
  const found: LocalProblem[] = [];
  const title = draft.title.trim();
  const description = draft.description.trim();
  switch (step) {
    case "basic":
      if (title.length < TITLE_MIN || title.length > TITLE_MAX) found.push("title");
      if (!draft.category) found.push("category");
      // A new draft may be created without description; the summary will list it as missing.
      if (description && (description.length < DESCRIPTION_MIN || description.length > DESCRIPTION_MAX)) found.push("description");
      if (options.creating && !waLink(draft.whatsapp)) found.push("whatsapp");
      break;
    case "ideas":
      if (draft.giftIdeas.length === 0) found.push("ideas");
      if (draft.giftIdeas.length > MAX_GIFT_IDEAS) found.push("ideasMax");
      break;
    case "photos":
      break;
    case "price":
      if (!draft.hasVariants) {
        const price = parseMinor(draft.price);
        if (price === null || price < 1 || price >= PRICE_CAP_MINOR) found.push("price");
        if (!draft.stock) found.push("stock");
      } else {
        if (draft.variants.length === 0) found.push("variantLabel");
        if (draft.variants.length > MAX_VARIANTS) found.push("variantsMax");
        if (draft.variants.some((variant) => !variant.label.trim() || variant.label.trim().length > 60)) found.push("variantLabel");
        if (draft.variants.some((variant) => { const price = parseMinor(variant.price); return price === null || price < 1 || price >= PRICE_CAP_MINOR; })) found.push("variantPrice");
      }
      break;
    case "delivery": {
      const lead = Number(draft.leadDays);
      const shipping = parseMinor(draft.shipping);
      if (draft.coverage.length === 0) found.push("coverage");
      if (draft.leadDays.trim() === "" || !Number.isInteger(lead) || lead < 0 || lead > LEAD_TIME_MAX) found.push("lead");
      if (draft.shipping.trim() === "" || shipping === null) found.push("shipping");
      if (draft.conditions.trim().length > 500) found.push("conditions");
      break;
    }
    case "contact":
      if (draft.whatsapp.trim() && !waLink(draft.whatsapp)) found.push("whatsapp");
      if (draft.productPage.trim() && !isHttpsUrl(draft.productPage.trim())) found.push("productPage");
      // The sheet only says which destinations exist (never their URLs): with one already saved, empty fields keep it.
      if (!draft.whatsapp.trim() && !draft.productPage.trim() && !options.hasDestination) found.push("destination");
      if (draft.ownTemplate) {
        if (!draft.template.trim()) found.push("template");
        else if (draft.template.length > TEMPLATE_MAX) found.push("templateLong");
        else if (unknownTemplateVariables(draft.template).length) found.push("templateVariables");
      }
      break;
  }
  return found;
}

/** The body of POST for a new draft (Básico): a PRODUCT needs a destination to exist, the rest is completed in later steps. */
export function createBody(draft: SheetDraft): CreateProductInput {
  const description = draft.description.trim();
  return {
    type: "PRODUCT", category: draft.category, city: draft.city, titles: { "es-BO": draft.title.trim() },
    ...(description ? { descriptions: { "es-BO": description } } : {}),
    destinations: { WHATSAPP: waLink(draft.whatsapp) ?? "" },
    ...(detailsOf(draft) ? { details: detailsOf(draft) } : {})
  };
}

function detailsOf(draft: SheetDraft): PatchListingInput["details"] | undefined {
  const pick = (value: string): string | undefined => value.trim() || undefined;
  const entries = { dimensions: pick(draft.dimensions), weight: pick(draft.weight), care: pick(draft.care), warranty: pick(draft.warranty) };
  const details = Object.fromEntries(Object.entries(entries).filter(([, value]) => value !== undefined)) as Record<string, string>;
  if (draft.personalizable) return { ...details, personalizable: true, ...(pick(draft.personalizationNote) ? { personalizationNote: draft.personalizationNote.trim() } : {}) };
  return Object.keys(details).length ? details : undefined;
}

/** The texts a sheet already holds in languages other than es-BO (en-US): the portal edits es-BO only and must not erase the rest. */
const otherLocales = (map: unknown): Record<string, string> => Object.fromEntries(Object.entries((map ?? {}) as Record<string, string>).filter(([locale]) => locale !== "es-BO"));

/**
 * The PATCH of one step: only that step's fields, so a stale field of another step is never sent back. `variants[]` replaces the
 * list (kept ids keep their photos) and `priceMinor` follows the default variant, as §5.1 requires.
 */
export function patchBody(step: StepKey, draft: SheetDraft, loaded?: Pick<ProductSheet, "titles" | "descriptions" | "delivery">): PatchListingInput | null {
  switch (step) {
    case "basic": {
      const description = draft.description.trim();
      const others = otherLocales;
      // PATCH replaces each text map whole: the other languages the sheet already holds (en-US) go back as they came, and an empty
      // description is sent as a map without es-BO (the catalog then lists DESCRIPTION as missing) instead of being left out, which
      // would keep the old text.
      return {
        titles: { ...others(loaded?.titles), "es-BO": draft.title.trim() }, category: draft.category, city: draft.city,
        descriptions: { ...others(loaded?.descriptions), ...(description ? { "es-BO": description } : {}) },
        details: detailsOf(draft) ?? null
      };
    }
    case "ideas":
      return { giftIdeas: [...draft.giftIdeas] };
    case "photos":
      return null;
    case "price": {
      if (!draft.hasVariants) return { priceMinor: parseMinor(draft.price) ?? 0, ...(draft.stock ? { stock: draft.stock } : {}), variants: [] };
      const marked = draft.variants.findIndex((variant) => variant.isDefault);
      const defaultIndex = marked >= 0 ? marked : 0;
      const variants: ProductVariantInput[] = draft.variants.map((variant, index) => ({
        ...(variant.id ? { id: variant.id } : {}), label: variant.label.trim(), priceMinor: parseMinor(variant.price) ?? 0, stock: variant.stock, isDefault: index === defaultIndex
      }));
      const chosen = variants[defaultIndex];
      return { variants, priceMinor: chosen?.priceMinor ?? 0, stock: chosen?.stock ?? "AVAILABLE" };
    }
    case "delivery": {
      const conditions = draft.conditions.trim();
      return {
        delivery: {
          coverageCities: [...draft.coverage], leadTimeDays: Number(draft.leadDays), shippingCostMinor: parseMinor(draft.shipping) ?? 0, pickupAvailable: draft.pickup,
          conditions: { ...otherLocales(loaded?.delivery?.conditions), ...(conditions ? { "es-BO": conditions } : {}) }
        }
      };
    }
    case "contact": {
      // PATCH replaces the whole destinations map and GET never returns the URLs: they are sent only when the person typed one,
      // and then the typed ones are the product's contacts (the screen says so next to the fields).
      const destinations: Record<string, string> = {};
      const whatsapp = waLink(draft.whatsapp);
      if (whatsapp) destinations["WHATSAPP"] = whatsapp;
      if (draft.productPage.trim()) destinations["PRODUCT_PAGE"] = draft.productPage.trim();
      const template = draft.ownTemplate && draft.template.trim() ? { "es-BO": draft.template.trim() } : null;
      return Object.keys(destinations).length ? { destinations, whatsappTemplate: template } : { whatsappTemplate: template };
    }
  }
}

/** The draft fields each step owns: after a reload (409 VERSION_CONFLICT) the open step keeps what was typed, the rest follows the server. */
export const STEP_FIELDS: Readonly<Record<StepKey, readonly (keyof SheetDraft)[]>> = {
  basic: ["title", "description", "category", "city", "dimensions", "weight", "care", "warranty", "personalizable", "personalizationNote"],
  ideas: ["giftIdeas"],
  photos: [],
  price: ["hasVariants", "price", "stock", "variants"],
  delivery: ["coverage", "leadDays", "shipping", "pickup", "conditions"],
  contact: ["whatsapp", "productPage", "ownTemplate", "template"]
};
export function keepStep(step: EditorStep, fresh: SheetDraft, typed: SheetDraft): SheetDraft {
  return keepSteps([step], fresh, typed);
}
/** Like `keepStep` for every step with unsaved edits: jumping between steps from the list must not drop what was typed in the one left. */
export function keepSteps(steps: readonly EditorStep[], fresh: SheetDraft, typed: SheetDraft): SheetDraft {
  const fields = steps.flatMap((step) => (step === "summary" ? [] : STEP_FIELDS[step]));
  const kept = Object.fromEntries(fields.map((field) => [field, typed[field]]));
  return { ...fresh, whatsapp: typed.whatsapp, productPage: typed.productPage, ...kept };
}
