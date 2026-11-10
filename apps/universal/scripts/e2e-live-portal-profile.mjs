// F28 against the REAL backend: "my providers" (GET /providers/mine, no id remembered on the device), microsite editor (PUT with If-Match),
// verification documents (register -> presigned PUT -> complete). Provider from apps/seo-web/scripts/live-world.mjs (WORLD=world.json).
//   WORLD=... APP=http://localhost:8200 CHROMIUM_PATH=... node apps/universal/scripts/e2e-live-portal-profile.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const API = "http://localhost:28000", APP = process.env.APP ?? "http://localhost:8200";
const world = JSON.parse(readFileSync(process.env.WORLD, "utf8"));
const out = fileURLToPath(new URL("../../../docs/progress/evidence/lane-F28/", import.meta.url));
const checks = [], axe = [], api = [];
const check = async (id, text, fn) => { try { const note = await fn(); checks.push({ id, text, status: "PASS", observed: note ?? null }); console.log(`PASS ${id} · ${text}${note ? ` -> ${note}` : ""}`); } catch (e) { const m = String(e.message).split("\n")[0]; checks.push({ id, text, status: "FAIL", observed: m }); console.log(`FAIL ${id} · ${text}: ${m}`); } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-BO" });
const page = await ctx.newPage();
page.on("response", (r) => { if (r.url().startsWith(API) || r.url().includes("amazonaws") || r.url().includes(":9000")) api.push(`${r.request().method()} ${new URL(r.url()).pathname} ${r.status()}`); });
const token = async () => (await (await fetch(`${API}/identity/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: world.provider.email, password: world.password }) })).json()).accessToken;
const shot = async (name, widths = [1280]) => { for (const w of widths) { await page.setViewportSize({ width: w, height: w < 500 ? 800 : 900 }); await page.screenshot({ path: join(out, `live-${name}-${w}.png`), fullPage: true }); } await page.setViewportSize({ width: 1280, height: 900 }); };
const checkAxe = async (name) => { const v = (await new AxeBuilder({ page }).analyze()).violations.filter((x) => ["critical", "serious"].includes(x.impact ?? "")); axe.push({ screen: name, violations: v.map((x) => `${x.id}: ${x.help}`) }); if (v.length) throw new Error(`axe ${name}: ${v.map((x) => x.id)}`); };

await check("login", "provider signs in through the UI", async () => {
  await page.goto(`${APP}/login`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Correo electrónico", { exact: true }).filter({ visible: true }).fill(world.provider.email);
  await page.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(world.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).filter({ visible: true }).click();
  await page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 20000 });
});
await check("mine", "the portal finds the provider with GET /providers/mine (nothing remembered on this device)", async () => {
  await page.goto(`${APP}/portal`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("provider-status").waitFor({ timeout: 25000 });
  if (!api.some((l) => l.startsWith("GET /providers/mine 200"))) throw new Error(`no /providers/mine 200 in ${api.slice(-6)}`);
  await shot("portal-resumen", [1280, 360]);
  await checkAxe("portal-resumen");
  return await page.getByTestId("provider-status").textContent();
});
await check("F28-02", "microsite editor: validation, save with If-Match, version rises, API returns the profile", async () => {
  await page.goto(`${APP}/portal/perfil`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("microsite-save").waitFor({ timeout: 25000 });
  const v0 = await page.getByTestId("microsite-version").textContent();
  await page.getByTestId("microsite-website").fill("http://inseguro.example");
  await page.getByTestId("microsite-save").click();
  await page.getByText("Escribe una dirección completa que empiece por https://.").waitFor();
  await shot("microsite-validacion", [360]);
  await page.getByTestId("microsite-desc-es").fill("Tortas y mesas de dulces hechas a mano en La Paz.");
  await page.getByTestId("microsite-website").fill("https://example.com/dulce-sol");
  await page.getByTestId("microsite-address").fill("Av. Arce 123");
  await page.getByTestId("microsite-days").fill("1,2,3,4,5");
  await page.getByTestId("microsite-opens").fill("09:00");
  await page.getByTestId("microsite-closes").fill("18:00");
  await page.getByTestId("microsite-save").click();
  await page.getByText(/Perfil guardado \(versión \d+\)/).waitFor({ timeout: 15000 });
  await shot("microsite-guardado", [1280, 360]);
  await checkAxe("microsite");
  const live = await (await fetch(`${API}/providers/${world.provider.id}/microsite`, { headers: { authorization: `Bearer ${await token()}` } })).json();
  if (live.descriptions["es-BO"] !== "Tortas y mesas de dulces hechas a mano en La Paz." || live.social.website !== "https://example.com/dulce-sol") throw new Error(JSON.stringify(live).slice(0, 200));
  return `${v0} -> API version ${live.version}; hours ${JSON.stringify(live.hours.weekly)}`;
});
await check("F28-02 conflicto", "a stale version is refused (409) and the UI says so", async () => {
  await page.goto(`${APP}/portal/perfil`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("microsite-save").waitFor({ timeout: 25000 });
  const t = await token();
  const cur = await (await fetch(`${API}/providers/${world.provider.id}/microsite`, { headers: { authorization: `Bearer ${t}` } })).json();
  const put = await fetch(`${API}/providers/${world.provider.id}/microsite`, { method: "PUT", headers: { authorization: `Bearer ${t}`, "content-type": "application/json", "if-match": String(cur.version) }, body: JSON.stringify({ descriptions: { "es-BO": "Cambio externo" }, social: {}, hours: { weekly: [] } }) });
  if (put.status !== 200) throw new Error(`external PUT ${put.status}`);
  await page.getByTestId("microsite-desc-es").fill("Mi cambio local");
  await page.getByTestId("microsite-save").click();
  await page.getByText(/Alguien guardó una versión más reciente/).waitFor({ timeout: 15000 });
  await shot("microsite-conflicto", [1280]);
});
await check("documentos", "verification document: register -> PUT to the presigned URL -> complete; listed as Recibido", async () => {
  await page.goto(`${APP}/portal/documentos`, { waitUntil: "domcontentloaded" });
  await page.getByTestId("document-upload").waitFor({ timeout: 25000 });
  await page.getByTestId("document-upload").click();
  await page.getByText("Elige un archivo primero.").waitFor();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.getByTestId("document-choose").click()]);
  await chooser.setFiles({ name: "nit.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n") });
  await page.getByTestId("document-chosen").waitFor();
  await page.getByRole("radio", { name: "Identificación tributaria" }).click().catch(() => undefined);
  await page.getByTestId("document-upload").click();
  const outcome = await Promise.race([page.getByText("Documento subido.").waitFor({ timeout: 20000 }).then(() => "ok"), page.getByText("No se pudo enviar el archivo. Inténtalo de nuevo.").waitFor({ timeout: 20000 }).then(() => "put-failed")]);
  if (outcome === "put-failed") {
    await shot("documentos-error-subida", [1280, 360]);
    const registered = api.filter((l) => /POST \/providers\/.+\/documents 201/.test(l)).length;
    throw new Error(`BLOCKED by environment: register answered 201 (${registered}x) but the presigned PUT URL points to http://localhost:9000 while MinIO is published on :29000 (host is part of the signature, so it cannot be rewritten); the UI shows the retryable upload error`);
  }
  await shot("documentos-subido", [1280, 360]);
  await checkAxe("documentos");
  const docs = await (await fetch(`${API}/providers/${world.provider.id}/documents`, { headers: { authorization: `Bearer ${await token()}` } })).json();
  const d = docs.items.find((x) => x.fileName === "nit.pdf");
  if (!d || d.status !== "UPLOADED") throw new Error(JSON.stringify(docs).slice(0, 200));
  const sequence = api.filter((l) => /documents|:9000|amazonaws/.test(l)).slice(-5).join(" | ");
  return `status ${d.status}; ${sequence}`;
});
await browser.close();
writeFileSync(join(out, "live-portal-result.json"), JSON.stringify({ date: new Date().toISOString(), surface: `Chrome real; app ${APP}; backend ${API}`, checks, axe, requests: api.slice(-40) }, null, 2));
process.exitCode = checks.every((c) => c.status === "PASS") ? 0 : 1;
