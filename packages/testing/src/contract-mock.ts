/**
 * In-memory stand-in for the gateway + guest-rsvp (v1.8.0) + notification (v1.2.0) services, written from the
 * OpenAPI contracts and the service's observable rules (Bearer opaque token, 401/403/404/409/422/429, Idempotency-Key,
 * RsvpWindowClosed problem, unregistered AUTO_ACCEPT/RESTRICTED, read models with freshness). It proves the FRONTEND
 * layer against contract-shaped answers; it is NOT evidence that the real services behave this way.
 */

export interface MockRequest { readonly method: string; readonly path: string; readonly headers: Readonly<Record<string, string | undefined>>; readonly body?: unknown }
export interface MockResponse { readonly status: number; readonly headers?: Readonly<Record<string, string>>; readonly body?: unknown }

export interface MockOptions {
  readonly now?: () => Date;
  /** Instant after which RSVP writes answer 409 RsvpWindowClosed; null = no deadline. */
  readonly deadline?: string | null;
  readonly unregisteredMode?: "AUTO_ACCEPT" | "RESTRICTED";
  readonly timeZone?: string;
  readonly slug?: string;
  readonly celebrationId?: string;
  /** Start answering 429 after this many guest calls (rate limit simulation). */
  readonly rateLimitAfter?: number;
  /** Web origin the backend would put in the canonical invitation `url` when issuing a token. */
  readonly webOrigin?: string;
}

export interface MockGuest { id: string; name: string; email: string | null; phone: string | null; respondedAt: string | null; locale: string; allowedCompanions: number; groupId: string | null; status: "PENDING" | "CONFIRMED" | "DECLINED"; requestedCompanions: number; approvedCompanions: number; dietaryNotes: string | null; message: string | null; version: number; updatedAt: string | null; token: string | null; tokenExpiresAt: string | null }
export interface MockCompanionRequest { id: string; guestId: string; requestedCompanions: number; allowedCompanions: number; status: "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED"; createdAt: string; resolvedAt: string | null }

export const MOCK_CELEBRATION_ID = "5f1c2d3e-4a5b-4c6d-8e7f-a1b2c3d4e5f6";
export const MOCK_SLUG = "ana-y-luis";
export const MOCK_VALID_TOKEN = "Zk3p9Qw1Lm7Xv2Rt5Yb8Nc4Hd6Jf0Gs-_AaBbCcDdEe";
export const MOCK_CONFIRMED_TOKEN = "Cn4o8Rx2Mk6Wy1Qt9Zb3Hd7Jf5Gs0Lp-_VvBbAaTtuU";
export const MOCK_HOST_JWT = "host-jwt";
/** Host calls accept the fixed test JWT or any JWT-shaped bearer (an unsigned dev token injected into the Expo web build). */
const isHostBearer = (header: string | undefined): boolean => header === `Bearer ${MOCK_HOST_JWT}` || /^Bearer [\w-]+\.[\w-]+\.[\w-]*$/.test(header ?? "");

const problem = (status: number, title: string, extra: Record<string, unknown> = {}): MockResponse => ({ status, headers: { "content-type": "application/problem+json" }, body: { type: `https://rsvp.example/problems/${status}`, title, status, ...extra } });
const json = (status: number, body: unknown, headers: Record<string, string> = {}): MockResponse => ({ status, headers: { "content-type": "application/json", ...headers }, body });
const base64Url = (): string => Array.from({ length: 43 }, () => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[Math.floor(Math.random() * 64)]).join("");
const uuid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

export function createContractMock(options: MockOptions = {}) {
  const now = options.now ?? (() => new Date());
  const celebrationId = options.celebrationId ?? MOCK_CELEBRATION_ID;
  const slug = options.slug ?? MOCK_SLUG;
  const timeZone = options.timeZone ?? "America/La_Paz";
  const state = {
    deadline: options.deadline === undefined ? new Date(now().getTime() + 5 * 86_400_000 + 3 * 3_600_000).toISOString() : options.deadline,
    unregisteredMode: options.unregisteredMode ?? "AUTO_ACCEPT",
    guestCalls: 0,
    pendingEvents: 0,
    stale: false,
    guests: new Map<string, MockGuest>(),
    groups: new Map<string, { id: string; name: string; memberIds: string[] }>(),
    requests: new Map<string, MockCompanionRequest>(),
    idempotent: new Map<string, { fingerprint: string; response: MockResponse }>(),
    preferences: { EMAIL: true, SMS: false, WHATSAPP: false, PUSH: true } as Record<string, boolean>,
    eventTypes: {} as Record<string, boolean>,
    quietHours: null as { start: number; end: number } | null,
    recipientSyncs: 0,
    notifications: [] as unknown[],
    devices: [] as unknown[],
    failNext: [] as MockResponse[],
    log: [] as MockRequest[]
  };

  const addGuest = (partial: Partial<MockGuest> & { name: string }): MockGuest => {
    const id = partial.id ?? uuid(state.guests.size + 1);
    const guest: MockGuest = { email: `${partial.name.toLowerCase().replace(/\W+/g, ".")}@example.com`, phone: null, respondedAt: null, locale: "es-BO", allowedCompanions: 1, groupId: null, status: "PENDING", requestedCompanions: 0, approvedCompanions: 0, dietaryNotes: null, message: null, version: 0, updatedAt: null, token: null, tokenExpiresAt: null, ...partial, id };
    state.guests.set(id, guest);
    return guest;
  };
  const guestByToken = (token: string | undefined): MockGuest | undefined => (token ? [...state.guests.values()].find((guest) => guest.token === token) : undefined);
  const dueClosed = (): boolean => state.deadline !== null && now().getTime() > Date.parse(state.deadline);
  const closedProblem = (): MockResponse => problem(409, "El plazo para responder cerró", {
    code: "RsvpWindowClosed", deadline: state.deadline, deadlineLocal: new Intl.DateTimeFormat("es-BO", { dateStyle: "long", timeStyle: "short", timeZone }).format(new Date(state.deadline ?? 0)), timeZone, locale: "es-BO"
  });
  const rsvpState = (guest: MockGuest) => ({
    guestId: guest.id, celebrationId, status: guest.status, dietaryNotes: guest.dietaryNotes, message: guest.message, version: guest.version, updatedAt: guest.updatedAt, deadline: state.deadline, timeZone,
    editable: !dueClosed(), requestedCompanions: guest.requestedCompanions, approvedCompanions: guest.approvedCompanions, respondedAt: guest.respondedAt
  });
  const freshness = () => ({ updatedAt: now().toISOString(), lastEventAt: now().toISOString(), pendingEvents: state.pendingEvents, oldestPendingAt: state.pendingEvents ? new Date(now().getTime() - (state.stale ? 12_000 : 1_000)).toISOString() : null, stale: state.stale, consistencyWindowSeconds: 5 });
  const listItem = (guest: MockGuest) => ({ guestId: guest.id, celebrationId, name: guest.name, email: guest.email, phone: guest.phone, locale: guest.locale, groupId: guest.groupId, status: guest.status, allowedCompanions: guest.allowedCompanions, requestedCompanions: guest.requestedCompanions, approvedCompanions: guest.approvedCompanions });
  const guestBody = (guest: MockGuest) => ({
    id: guest.id, celebrationId, name: guest.name, email: guest.email, phone: guest.phone, locale: guest.locale, allowedCompanions: guest.allowedCompanions, groupId: guest.groupId, consentGivenAt: "2026-10-20T12:00:00.000Z", preferredLocale: null,
    consent: { source: "HOST_RECORDED", channel: "HOST_FORM", recordedBy: "host-1", givenAt: "2026-10-20T12:00:00.000Z" }
  });
  const wellFormedToken = (value: string | undefined): string | undefined => { const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(value ?? ""); return match?.[1]; };

  /** Applies RsvpResponse validation exactly like the contract: status enum, text limits, integer companions. */
  function parseRsvpBody(body: unknown): { ok: true; value: { status: "CONFIRMED" | "DECLINED"; dietaryNotes?: string | null; message?: string | null; requestedCompanions?: number } } | { ok: false; field: string } {
    const input = (body ?? {}) as Record<string, unknown>;
    if (input["status"] !== "CONFIRMED" && input["status"] !== "DECLINED") return { ok: false, field: "status" };
    for (const [field, max] of [["dietaryNotes", 1000], ["message", 2000]] as const) { const v = input[field]; if (v !== undefined && v !== null && (typeof v !== "string" || v.length > max)) return { ok: false, field }; }
    const c = input["requestedCompanions"];
    if (c !== undefined && (!Number.isInteger(c) || (c as number) < 0)) return { ok: false, field: "requestedCompanions" };
    return { ok: true, value: input as never };
  }

  function applyRsvp(guest: MockGuest, value: { status: "CONFIRMED" | "DECLINED"; dietaryNotes?: string | null; message?: string | null; requestedCompanions?: number }): void {
    guest.status = value.status;
    guest.dietaryNotes = value.dietaryNotes ?? null;
    guest.message = value.message ?? null;
    guest.requestedCompanions = value.status === "DECLINED" ? 0 : (value.requestedCompanions ?? 0);
    guest.approvedCompanions = Math.min(guest.requestedCompanions, guest.allowedCompanions);
    guest.version += 1;
    guest.updatedAt = now().toISOString();
    guest.respondedAt ??= guest.updatedAt;
    const over = guest.requestedCompanions > guest.allowedCompanions;
    const open = [...state.requests.values()].find((r) => r.guestId === guest.id && r.status === "PENDING_REVIEW");
    if (open) open.status = "CANCELLED";
    if (over) { const id = uuid(900 + state.requests.size); state.requests.set(id, { id, guestId: guest.id, requestedCompanions: guest.requestedCompanions, allowedCompanions: guest.allowedCompanions, status: "PENDING_REVIEW", createdAt: now().toISOString(), resolvedAt: null }); }
  }

  function csvImport(csv: string): MockResponse {
    const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line, index, all) => line.trim() || index < all.length - 1);
    const header = (lines.shift() ?? "").split(",").map((cell) => cell.trim().toLowerCase());
    const required = ["name", "locale", "allowedcompanions"];
    if (required.some((column) => !header.includes(column)) || !(header.includes("email") || header.includes("phone"))) return json(200, { mode: "partial", totalRows: 0, importedCount: 0, failedCount: 0, imported: [], errors: [{ line: 1, field: "csv", reason: "Header must contain name, locale, allowedCompanions and at least one of email or phone, and optionally groupId" }] });
    const imported: { line: number; guestId: string }[] = [];
    const errors: { line: number; field: string; reason: string }[] = [];
    lines.forEach((row, index) => {
      const line = index + 2;
      const cells = row.split(",").map((cell) => cell.trim());
      const get = (column: string): string => cells[header.indexOf(column)] ?? "";
      if (cells.length !== header.length) { errors.push({ line, field: "csv", reason: `Expected ${header.length} columns` }); return; }
      if (!get("name")) { errors.push({ line, field: "name", reason: "Name is required" }); return; }
      if (!get("email") && !get("phone")) { errors.push({ line, field: "email", reason: "Email or phone is required" }); return; }
      if (get("email") && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(get("email"))) { errors.push({ line, field: "email", reason: "Email is invalid" }); return; }
      if (get("phone") && !/^\+[1-9][0-9]{7,14}$/.test(get("phone"))) { errors.push({ line, field: "phone", reason: "Phone must be E.164" }); return; }
      if (get("allowedcompanions") !== "" && !/^\d+$/.test(get("allowedcompanions"))) { errors.push({ line, field: "allowedCompanions", reason: "Must be a non-negative integer" }); return; }
      const guest = addGuest({ name: get("name"), email: get("email") || null, phone: get("phone") || null, locale: get("locale") || "es-BO", allowedCompanions: Number(get("allowedcompanions") || 0) });
      imported.push({ line, guestId: guest.id });
    });
    return json(200, { mode: "partial", totalRows: lines.length, importedCount: imported.length, failedCount: errors.length, imported, errors });
  }

  function handle(request: MockRequest): MockResponse {
    state.log.push(request);
    const url = new URL(request.path, "http://gateway.test");
    const path = url.pathname;
    const query = url.searchParams;
    const method = request.method.toUpperCase();
    const forced = state.failNext.shift();
    if (forced) return forced;
    const bodyOf = (): Record<string, unknown> => (request.body && typeof request.body === "object" ? request.body as Record<string, unknown> : {});

    // ---- public celebration read (celebration-site-service) ----
    if (method === "GET" && path === `/celebrations/public/${slug}`) {
      return json(200, {
        celebrationId, slug, locale: "es-BO", availableLocales: ["es-BO", "en-US"],
        eventType: { code: "WEDDING", name: "Boda", hostRoles: [{ role: "BRIDE", label: "Novia" }, { role: "GROOM", label: "Novio" }] },
        enabledSections: ["story", "schedule", "rsvp"], timeZone, currency: "BOB", templateId: null,
        content: { title: "Ana y Luis", eventDate: "2026-12-19T23:00:00.000Z", venueName: "Hacienda El Prado", hosts: { BRIDE: "Ana", GROOM: "Luis" }, hostContact: { email: "anayluis@example.com", phone: "+59171234567", consentPublic: true } }, localTimes: {}, rsvpDeadline: state.deadline, publishedAt: "2026-10-17T12:00:00.000Z", version: 5
      });
    }
    if (method === "GET" && path === "/celebrations/public") return json(200, { items: [{ slug, updatedAt: "2026-10-17T12:00:00.000Z", supportedLocales: ["es-BO", "en-US"] }] });
    if (method === "GET" && path.startsWith("/celebrations/public/")) return problem(404, "Not found");
    if (method === "GET" && path === "/celebrations/event-types") return json(200, { items: [{ code: "WEDDING", locale: "es-BO", name: "Boda", description: "Ceremonia", hostRoles: [{ role: "BRIDE", label: "Novia" }, { role: "GROOM", label: "Novio" }], enabledSections: ["story", "schedule", "rsvp"], requiredFieldsForPublish: ["title"], compatibleTemplateTags: ["wedding"] }] });
    if (method === "GET" && (path === `/celebrations/${celebrationId}` || path === "/celebrations")) {
      const celebration = {
        id: celebrationId, slug, ownerId: "u-host", organizationId: null, eventTypeCode: "WEDDING", status: "PUBLISHED", version: 3, defaultLocale: "es-BO", supportedLocales: ["es-BO", "en-US"], timeZone, currency: "BOB",
        content: { title: "Ana y Luis", eventDate: "2026-12-19T23:00:00.000Z", venueName: "Hacienda El Prado", hosts: { BRIDE: "Ana", GROOM: "Luis" } }, translations: {},
        settings: { giftReservationMode: "RESTRICTED", unregisteredRsvpMode: state.unregisteredMode, extraCompanionMode: "RESTRICTED", externalGiftMode: "RESTRICTED", rsvpDeadline: state.deadline, partnerPriorityEnabled: false, settingsVersion: 1, effectiveFrom: "2026-10-17T00:00:00Z" },
        templateId: null, collaborators: [], publishedAt: "2026-10-17T12:00:00.000Z", createdAt: "2026-10-17T00:00:00Z", updatedAt: "2026-10-17T00:00:00Z", access: "MANAGE", localTimes: {}
      };
      return json(200, path === "/celebrations" ? { items: [celebration] } : celebration);
    }

    // ---- guest surface: opaque token as Bearer ----
    if (path === "/rsvp/resolve" && method === "POST") {
      const found = guestByToken(wellFormedToken(request.headers["authorization"]));
      return found ? json(200, { celebrationId, slug }, { "cache-control": "no-store" }) : problem(401, "Unauthorized");
    }
    const settings = /^\/rsvp\/celebrations\/([^/]+)\/public-settings$/.exec(path);
    if (settings && method === "GET") {
      const open = settings[1] === celebrationId && state.unregisteredMode === "AUTO_ACCEPT";
      return json(200, { unregisteredRsvpMode: open ? "AUTO_ACCEPT" : "RESTRICTED", publicRegistrationEnabled: open }, { "cache-control": "no-store" });
    }
    const guestRoute = /^\/rsvp\/celebrations\/([^/]+)\/(guest|rsvp|unregistered)$/.exec(path);
    if (guestRoute) {
      const [, id, kind] = guestRoute;
      state.guestCalls += 1;
      if (options.rateLimitAfter !== undefined && state.guestCalls > options.rateLimitAfter) return { ...problem(429, "Too many requests"), headers: { "content-type": "application/problem+json", "retry-after": "17" } };
      if (kind === "unregistered") {
        if (method !== "POST") return problem(404, "Not found");
        if (state.unregisteredMode !== "AUTO_ACCEPT" || id !== celebrationId) return problem(403, "Public registration is not available");
        const key = request.headers["idempotency-key"];
        if (!key) return problem(422, "Idempotency-Key is required", { field: "Idempotency-Key" });
        const body = bodyOf();
        if (body["consent"] !== true) return problem(422, "Consent is required", { field: "consent" });
        if (typeof body["name"] !== "string" || !body["name"].trim()) return problem(422, "name is required", { field: "name" });
        if (typeof body["email"] !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body["email"])) return problem(422, "email is invalid", { field: "email" });
        const fingerprint = JSON.stringify(body);
        const seen = state.idempotent.get(`reg:${key}`);
        if (seen) return seen.fingerprint === fingerprint ? json(201, { receipt: "ACCEPTED", replayed: true, accessToken: null }) : problem(409, "Idempotency-Key reused with a different body", { code: "IdempotencyConflict" });
        const guest = addGuest({ name: String(body["name"]), email: String(body["email"]), allowedCompanions: 0, token: base64Url(), tokenExpiresAt: new Date(now().getTime() + 7 * 86_400_000).toISOString() });
        applyRsvp(guest, { status: "CONFIRMED", requestedCompanions: Number(body["requestedCompanions"] ?? 0), dietaryNotes: (body["dietaryNotes"] as string | null | undefined) ?? null, message: (body["message"] as string | null | undefined) ?? null });
        const response = json(201, { receipt: "ACCEPTED", replayed: false, accessToken: { token: guest.token, expiresAt: guest.tokenExpiresAt } }, { "cache-control": "no-store", "referrer-policy": "no-referrer" });
        state.idempotent.set(`reg:${key}`, { fingerprint, response });
        return response;
      }
      const token = wellFormedToken(request.headers["authorization"]);
      const guest = guestByToken(token);
      if (!guest) return problem(401, "Unauthorized");
      if (id !== celebrationId) return problem(404, "Not found");
      const noStore = { "cache-control": "no-store", "referrer-policy": "no-referrer" };
      if (kind === "guest") return method === "GET" ? json(200, { guestId: guest.id, celebrationId, allowedCompanions: guest.allowedCompanions, preferredLocale: null }, noStore) : problem(404, "Not found");
      if (method === "GET") return json(200, rsvpState(guest), noStore);
      if (method !== "POST" && method !== "PATCH") return problem(404, "Not found");
      const parsed = parseRsvpBody(request.body);
      if (!parsed.ok) return problem(422, `Invalid ${parsed.field}`, { field: parsed.field });
      if (dueClosed()) return closedProblem();
      if (method === "POST" && guest.status !== "PENDING") {
        const key = request.headers["idempotency-key"];
        const seen = key ? state.idempotent.get(`rsvp:${guest.id}:${key}`) : undefined;
        if (seen && seen.fingerprint === JSON.stringify(request.body)) return json(201, rsvpState(guest), noStore);
        return problem(409, "RSVP already exists", { code: "RsvpAlreadyExists" });
      }
      const before = JSON.stringify([guest.status, guest.dietaryNotes, guest.message, guest.requestedCompanions]);
      applyRsvp(guest, parsed.value);
      if (before === JSON.stringify([guest.status, guest.dietaryNotes, guest.message, guest.requestedCompanions])) guest.version -= 1;
      const key = request.headers["idempotency-key"];
      if (key) state.idempotent.set(`rsvp:${guest.id}:${key}`, { fingerprint: JSON.stringify(request.body), response: json(200, null) });
      state.pendingEvents += 1;
      return json(method === "POST" ? 201 : 200, rsvpState(guest), noStore);
    }

    // ---- host surface (JWT) ----
    const hostMatch = /^\/guests\/celebrations\/([^/]+)\/(.+)$/.exec(path);
    const notifMatch = /^\/notifications\/celebrations\/([^/]+)\/(.+)$/.exec(path);
    if (hostMatch || notifMatch) {
      if (!isHostBearer(request.headers["authorization"])) return problem(401, "Unauthorized");
      const [, id, rest = ""] = (hostMatch ?? notifMatch)!;
      if (id !== celebrationId) return problem(404, "Not found");
      if (notifMatch) {
        const prefsView = () => ({ channels: { ...state.preferences }, eventTypes: { ...state.eventTypes }, quietHours: state.quietHours ? { ...state.quietHours, source: "RECIPIENT" } : { start: 22, end: 8, source: "DEFAULT" } });
        if (rest === "preferences") {
          if (method === "GET") return json(200, prefsView());
          if (method === "PATCH") {
            const body = bodyOf();
            Object.assign(state.preferences, (body["channels"] as Record<string, boolean> | undefined) ?? {});
            Object.assign(state.eventTypes, (body["eventTypes"] as Record<string, boolean> | undefined) ?? {});
            if ("quietHours" in body) state.quietHours = body["quietHours"] as { start: number; end: number } | null;
            return json(200, prefsView());
          }
        }
        if (rest === "notifications" && method === "GET") return json(200, { items: state.notifications });
        const readMatch = /^notifications\/([^/]+)\/read$/.exec(rest);
        if (readMatch && method === "POST") {
          const item = (state.notifications as { id: string; readAt: string | null }[]).find((entry) => entry.id === readMatch[1]);
          if (!item) return problem(404, "Not found");
          item.readAt ??= now().toISOString();
          return json(200, { id: item.id, readAt: item.readAt });
        }
        if (rest === "recipients" && method === "PUT") { state.recipientSyncs += 1; return json(200, { total: state.guests.size, synced: state.guests.size, skipped: 0, rejected: 0 }); }
        if (rest === "devices" && method === "GET") return json(200, { items: state.devices });
        if (rest === "devices" && method === "POST") { const device = { id: uuid(700 + state.devices.length), installationId: bodyOf()["installationId"], projectId: uuid(1), platform: bodyOf()["platform"], version: 1, status: "ACTIVE", createdAt: now().toISOString(), updatedAt: now().toISOString() }; state.devices.push(device); return json(201, device); }
        return problem(404, "Not found");
      }
      if (rest === "guest-summary" && method === "GET") {
        const all = [...state.guests.values()];
        return json(200, { celebrationId, total: all.length, confirmed: all.filter((g) => g.status === "CONFIRMED").length, declined: all.filter((g) => g.status === "DECLINED").length, pending: all.filter((g) => g.status === "PENDING").length, companions: all.reduce((sum, g) => sum + g.approvedCompanions, 0), freshness: freshness(), openCompanionRequests: [...state.requests.values()].filter((r) => r.status === "PENDING_REVIEW").length });
      }
      if (rest === "guest-list" && method === "GET") {
        const status = query.get("status"); const search = (query.get("search") ?? "").toLowerCase(); const group = query.get("groupId");
        const limit = Number(query.get("limit") ?? 50); const offset = Number(query.get("offset") ?? 0);
        if (status && !["PENDING", "CONFIRMED", "DECLINED"].includes(status)) return problem(422, "Invalid status", { field: "status" });
        const all = [...state.guests.values()].filter((g) => (!status || g.status === status) && (!group || g.groupId === group) && (!search || g.name.toLowerCase().includes(search) || (g.email ?? "").toLowerCase().includes(search)));
        return json(200, { items: all.slice(offset, offset + limit).map(listItem), total: all.length, limit, offset, freshness: freshness() });
      }
      if (rest === "rsvps" && method === "GET") {
        const limit = Number(query.get("limit") ?? 50); const offset = Number(query.get("offset") ?? 0);
        const answered = [...state.guests.values()].filter((g) => g.status !== "PENDING");
        return json(200, { items: answered.slice(offset, offset + limit).map((g) => ({ guestId: g.id, celebrationId, status: g.status, dietaryNotes: g.dietaryNotes, message: g.message, version: Math.max(1, g.version), updatedAt: g.updatedAt, requestedCompanions: g.requestedCompanions, approvedCompanions: g.approvedCompanions, respondedAt: g.respondedAt })), limit, offset });
      }
      if (rest === "guests" && method === "POST") {
        const body = bodyOf();
        if (typeof body["name"] !== "string" || !body["name"].trim()) return problem(422, "name is required", { field: "name" });
        const email = typeof body["email"] === "string" && body["email"] ? body["email"] : null;
        const phone = typeof body["phone"] === "string" && body["phone"] ? body["phone"].replace(/[\s.()-]/g, "") : null;
        if (!email && !phone) return problem(422, "email or phone is required", { field: "email" });
        if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return problem(422, "email is invalid", { field: "email" });
        if (phone && !/^\+[1-9][0-9]{7,14}$/.test(phone)) return problem(422, "phone must be E.164", { field: "phone" });
        const guest = addGuest({ name: body["name"], email, phone, allowedCompanions: Number(body["allowedCompanions"] ?? 0), groupId: (body["groupId"] as string | undefined) ?? null });
        if (guest.groupId) state.groups.get(guest.groupId)?.memberIds.push(guest.id);
        return json(201, guestBody(guest));
      }
      if (rest === "guests/import" && method === "POST") return csvImport(String(bodyOf()["csv"] ?? ""));
      const guestRouteMatch = /^guests\/([^/]+)(?:\/(access-token))?$/.exec(rest);
      if (guestRouteMatch) {
        const guest = state.guests.get(guestRouteMatch[1]!);
        if (!guest) return problem(404, "Not found");
        if (guestRouteMatch[2]) {
          if (method === "POST") { guest.token = base64Url(); guest.tokenExpiresAt = new Date(now().getTime() + 7 * 86_400_000).toISOString(); return json(201, { token: guest.token, expiresAt: guest.tokenExpiresAt, url: `${options.webOrigin ?? "http://localhost:3000"}/c/${slug}/rsvp/${guest.token}` }, { "cache-control": "no-store" }); }
          if (method === "DELETE") { guest.token = null; guest.tokenExpiresAt = null; return { status: 204 }; }
        }
        if (method === "GET") return json(200, guestBody(guest));
        if (method === "PATCH") {
          const target = bodyOf()["groupId"] as string | null | undefined;
          if (target !== null && (typeof target !== "string" || !state.groups.has(target))) return problem(404, "Not found");
          if (guest.groupId) { const old = state.groups.get(guest.groupId); if (old) old.memberIds = old.memberIds.filter((m) => m !== guest.id); }
          guest.groupId = target ?? null;
          if (target) state.groups.get(target)?.memberIds.push(guest.id);
          return json(200, guestBody(guest));
        }
      }
      if (rest === "groups" && method === "GET") {
        const items = [...state.groups.values()].sort((a, b) => a.name.localeCompare(b.name)).map((g) => ({ id: g.id, celebrationId, name: g.name, memberCount: g.memberIds.length }));
        return json(200, { items, limit: Number(query.get("limit") ?? 50), offset: Number(query.get("offset") ?? 0) });
      }
      if (rest === "catering-report" && method === "GET") {
        const status = query.get("status") ?? "CONFIRMED"; const notesOnly = query.get("withNotesOnly") !== "false"; const withMessage = query.get("includeMessage") === "true";
        const limit = Number(query.get("limit") ?? 100); const cursor = query.get("cursor");
        const all = [...state.guests.values()].filter((g) => g.status === status && (!notesOnly || g.dietaryNotes || (withMessage && g.message))).sort((a, b) => a.id.localeCompare(b.id));
        const from = cursor ? all.findIndex((g) => g.id > cursor) : 0;
        const page = from < 0 ? [] : all.slice(from, from + limit);
        const more = from >= 0 && from + limit < all.length;
        return json(200, { items: page.map((g) => ({ guestId: g.id, groupId: g.groupId, status: g.status, partySize: g.status === "CONFIRMED" ? 1 + g.approvedCompanions : 0, dietaryNotes: g.dietaryNotes, ...(withMessage ? { message: g.message } : {}) })), limit, nextCursor: more ? page.at(-1)!.id : null });
      }
      if (rest === "groups" && method === "POST") {
        const name = bodyOf()["name"];
        if (typeof name !== "string" || !name.trim()) return problem(422, "name is required", { field: "name" });
        const group = { id: uuid(500 + state.groups.size), name, memberIds: [] as string[] };
        state.groups.set(group.id, group);
        return json(201, { ...group, celebrationId });
      }
      const groupMatch = /^groups\/([^/]+)$/.exec(rest);
      if (groupMatch && method === "GET") { const group = state.groups.get(groupMatch[1]!); return group ? json(200, { ...group, celebrationId }) : problem(404, "Not found"); }
      if (rest === "companion-requests" && method === "GET") {
        const items = [...state.requests.values()].filter((r) => r.status === "PENDING_REVIEW").map((r) => ({ ...r, celebrationId, settingsVersion: 1 }));
        return json(200, { items, limit: Number(query.get("limit") ?? 50), offset: 0 });
      }
      const decision = /^companion-requests\/([^/]+)\/decision$/.exec(rest);
      if (decision && method === "POST") {
        const found = state.requests.get(decision[1]!);
        if (!found) return problem(404, "Not found");
        const wanted = bodyOf()["decision"] === "APPROVED" ? "APPROVED" : bodyOf()["decision"] === "REJECTED" ? "REJECTED" : null;
        if (!wanted) return problem(400, "decision must be APPROVED or REJECTED");
        if (found.status !== "PENDING_REVIEW" && found.status !== wanted) return problem(409, "Request already resolved", { code: "CompanionRequestResolved" });
        found.status = wanted; found.resolvedAt = now().toISOString();
        const guest = state.guests.get(found.guestId);
        if (guest && wanted === "APPROVED") guest.approvedCompanions = found.requestedCompanions;
        return json(200, { ...found, celebrationId, settingsVersion: 1 });
      }
    }
    return problem(404, "Not found");
  }

  const dispatch = (input: RequestInfo | URL, init?: RequestInit): Response => {
    const url = new URL(String(input), "http://gateway.test");
    const headers: Record<string, string | undefined> = {};
    new Headers(init?.headers).forEach((value, key) => { headers[key.toLowerCase()] = value; });
    const raw = typeof init?.body === "string" && init.body ? JSON.parse(init.body) : undefined;
    const reply = handle({ method: init?.method ?? "GET", path: `${url.pathname}${url.search}`, headers, body: raw });
    return new Response(reply.status === 204 || reply.body === undefined || reply.body === null ? null : JSON.stringify(reply.body), { status: reply.status, headers: reply.headers });
  };

  return {
    state, handle, addGuest, listGuests: () => [...state.guests.values()],
    /** A `fetch` that answers from the mock; plug it into createApiClient({ fetchFn }). */
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => dispatch(input, init)) as typeof fetch,
    /** Same, but after a delay and with an optional network cut (`offline`) to exercise retries. */
    slowFetch: (offline: () => boolean, delayMs = 0): typeof fetch => (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (offline()) throw new TypeError("Failed to fetch");
      return dispatch(input, init);
    }) as typeof fetch,
    celebrationId, slug, timeZone
  };
}

export type ContractMock = ReturnType<typeof createContractMock>;

/** A believable celebration for screenshots and browser runs: 60 guests, answers, a group, open companion requests and notices. */
export function seedDemo(mock: ContractMock): void {
  const names = ["Marta Quispe", "Luis Mamani", "Carla Vega", "Beto Ramos", "Ana Choque", "Pedro Flores", "Rosa Condori", "Juan Apaza", "Elena Rojas", "Diego Villca"];
  const group = (() => { const id = uuid(500); mock.state.groups.set(id, { id, name: "Familia Quispe", memberIds: [] }); return id; })();
  names.forEach((name, index) => {
    const answered = index % 3 !== 0;
    const guest = mock.addGuest({ name, id: uuid(10 + index), allowedCompanions: 1 + (index % 3), groupId: index < 3 ? group : null, ...(index === 0 ? { token: MOCK_VALID_TOKEN } : {}), ...(index === 1 ? { token: MOCK_CONFIRMED_TOKEN } : {}) });
    if (answered || index === 1) {
      guest.status = index % 4 === 2 ? "DECLINED" : "CONFIRMED";
      guest.version = 1; guest.updatedAt = "2026-11-03T15:00:00.000Z"; guest.respondedAt = guest.updatedAt;
      if (guest.status === "CONFIRMED") { guest.requestedCompanions = Math.min(2, guest.allowedCompanions); guest.approvedCompanions = guest.requestedCompanions; }
      if (index === 1) guest.dietaryNotes = "Vegetariano";
      if (index === 4) guest.message = "¡Felicidades a los dos!";
    }
    if (group && index < 3) mock.state.groups.get(group)?.memberIds.push(guest.id);
  });
  for (let n = 20; n <= 70; n += 1) mock.addGuest({ name: `Invitado ${String(n).padStart(2, "0")}`, id: uuid(n) });
  mock.state.guests.get(uuid(10))!.status = "PENDING";
  mock.state.guests.get(uuid(10))!.version = 0; mock.state.guests.get(uuid(10))!.respondedAt = null; mock.state.guests.get(uuid(10))!.requestedCompanions = 0; mock.state.guests.get(uuid(10))!.approvedCompanions = 0; mock.state.guests.get(uuid(10))!.updatedAt = null;
  mock.state.requests.set(uuid(901), { id: uuid(901), guestId: uuid(12), requestedCompanions: 4, allowedCompanions: 3, status: "PENDING_REVIEW", createdAt: "2026-11-03T16:00:00.000Z", resolvedAt: null });
  mock.state.requests.set(uuid(902), { id: uuid(902), guestId: uuid(15), requestedCompanions: 3, allowedCompanions: 1, status: "PENDING_REVIEW", createdAt: "2026-11-04T09:00:00.000Z", resolvedAt: null });
  const notice = (n: number, template: string, subject: string, text: string, createdAt: string, channel = "EMAIL") => ({ id: uuid(100 + n), eventId: uuid(200 + n), channel, template, locale: "es-BO", status: "SENT", attempts: 1, availableAt: createdAt, createdAt, subject, text, readAt: null as string | null });
  mock.state.notifications.push(
    notice(1, "rsvp.companion.requested", "Carla Vega pidió más acompañantes", "Pidió 4 y su invitación permite 3. Decide si lo apruebas.", "2026-11-04T09:00:00.000Z"),
    notice(2, "rsvp.confirmed", "Luis Mamani confirmó su asistencia", "Asistirá con 1 acompañante.", "2026-11-03T15:00:00.000Z", "PUSH"),
    notice(3, "digest.weekly", "Resumen semanal de tu celebración", "Esta semana confirmaron 5 invitados.", "2026-11-01T08:00:00.000Z")
  );
  mock.state.pendingEvents = 2;
}
