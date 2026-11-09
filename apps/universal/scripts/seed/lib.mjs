// Cliente HTTP del poblador: solo habla con el gateway (Kong). Nunca imprime tokens ni credenciales de invitado.
import { randomUUID } from "node:crypto";

export const API = process.env.API_URL ?? "http://localhost:28000";
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Kong limita /rsvp a 30/min: se deja una holgura (una llamada cada ~2,4 s) para no tocar el limite.
const RSVP_GAP_MS = Number(process.env.SEED_RSVP_GAP_MS ?? 2400);
let lastRsvp = 0;
const stats = { calls: 0, retries: 0, slow: [] };
export const callStats = stats;

const redact = (text) => String(text).replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "<jwt>").replace(/\b[A-Za-z0-9_-]{43,}\b/g, "<token>");

/** Llamada JSON. Devuelve { status, body, headers }. No lanza salvo por red; usa `must` para exigir 2xx. */
export async function call(method, path, { token, body, headers = {}, redirect, retries = 4 } = {}) {
  if (path.startsWith("/rsvp")) {
    const wait = lastRsvp + RSVP_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastRsvp = Date.now();
  }
  for (let attempt = 0; ; attempt += 1) {
    const started = Date.now();
    let response;
    try {
      response = await fetch(`${API}${path}`, {
        method,
        redirect: redirect ?? "follow",
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (error) {
      if (attempt < retries) { stats.retries += 1; await sleep(1500 * (attempt + 1)); continue; }
      throw new Error(`${method} ${path} -> red: ${error.message}`);
    }
    stats.calls += 1;
    const elapsed = Date.now() - started;
    if (elapsed > 1500) stats.slow.push({ method, path: path.replace(/[0-9a-f-]{36}/g, ":id"), ms: elapsed });
    const text = await response.text();
    let parsed;
    try { parsed = text ? JSON.parse(text) : undefined; } catch { parsed = text; }
    if ((response.status === 429 || response.status === 502 || response.status === 503) && attempt < retries) {
      if (path.startsWith("/media") || path.startsWith("/templates")) return { status: response.status, body: parsed, headers: response.headers };
      const wait = Number(response.headers.get("retry-after")) * 1000 || 4000 * (attempt + 1);
      if (wait > 90_000) { stats.limited = (stats.limited ?? 0) + 1; return { status: response.status, body: parsed, headers: response.headers }; } // limite por hora (p. ej. cotizacion anonima): no se espera
      stats.retries += 1;
      await sleep(wait);
      continue;
    }
    return { status: response.status, body: parsed, headers: response.headers };
  }
}

export async function must(method, path, options = {}) {
  const result = await call(method, path, options);
  if (result.status >= 300) throw new Error(`${method} ${path.replace(/[0-9a-f-]{36}/g, ":id")} -> ${result.status} ${redact(JSON.stringify(result.body)).slice(0, 300)}`);
  return result.body;
}

export const idem = () => ({ "idempotency-key": randomUUID() });
export const claims = (jwt) => JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());

/** Registra la cuenta o, si ya existe (409), inicia sesion. Devuelve { email, token, userId, roles }. */
export async function account(email, password, role) {
  let result = await call("POST", "/identity/auth/register", { body: { email, password, role } });
  if (result.status === 409) result = await call("POST", "/identity/auth/login", { body: { email, password } });
  if (result.status >= 300) throw new Error(`cuenta ${email}: ${result.status} ${redact(JSON.stringify(result.body)).slice(0, 200)}`);
  const token = result.body.accessToken;
  const c = claims(token);
  return { email, token, userId: c.sub, roles: c.roles ?? [], role };
}

export const log = (...parts) => console.log(...parts);
export const dayOffset = (days, hour = 18) => {
  const d = new Date(); d.setUTCDate(d.getUTCDate() + days);
  return `${d.toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}:00`;
};
export const dateOffset = (days) => dayOffset(days).slice(0, 10);

/** Pagina listados con `items` + cursor/offset si los hay; devuelve todos los items. */
export async function listAll(path, token, limit = 100) {
  const items = [];
  for (let offset = 0; offset < 5000; offset += limit) {
    const sep = path.includes("?") ? "&" : "?";
    const page = await must("GET", `${path}${sep}limit=${limit}&offset=${offset}`, { token });
    const got = page.items ?? [];
    items.push(...got);
    if (got.length < limit) break;
  }
  return items;
}
