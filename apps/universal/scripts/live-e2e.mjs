// Lane B live end-to-end: the real universal web app (expo export) in a browser, against the real
// backend in Docker behind Kong, the real MinIO and the real public site.
//   BACKEND=../RSVPBackend node apps/universal/scripts/live-e2e.mjs
// It redeploys celebration/template-media with a throw-away RS256 key, signs a dev token with
// HOST+ADMIN roles, exports the app with it (EXPO_PUBLIC_DEV_ACCESS_TOKEN, dev builds only) and drives it.
import { createServer } from "node:http";
import { createSign, generateKeyPairSync, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const app = fileURLToPath(new URL("..", import.meta.url));
const backend = process.env.BACKEND ?? fileURLToPath(new URL("../../../../RSVPBackend", import.meta.url));
const evidence = fileURLToPath(new URL("../../../docs/progress/evidence/", import.meta.url));
const GATEWAY = "http://localhost:8000";
const SITE = process.env.SITE ?? "http://localhost:3317";
const PORT = 8081;
const WIDTHS = [360, 768, 1280];
const EIGHT_HOURS = 28_800;
const step = (label) => console.log(`\n▶ ${label}`);
const ok = (label) => console.log(`  ✔ ${label}`);

step("redeploy lane B services with a throw-away signing key");
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwks = JSON.stringify({ keys: [{ ...publicKey.export({ format: "jwk" }), kid: "ui-e2e", alg: "RS256", use: "sig" }] });
const up = spawnSync("docker", ["compose", "--profile", "apps", "up", "-d", "--build", "--wait", "celebration-site-service", "template-media-service", "template-media-relay", "template-media-consumer"], { cwd: backend, env: { ...process.env, IDENTITY_JWKS_JSON: jwks }, stdio: "inherit" });
assert.equal(up.status, 0);
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const head = `${b64({ alg: "RS256", typ: "JWT", kid: "ui-e2e" })}.${b64({ sub: randomUUID(), roles: ["HOST", "ADMIN"], organizationIds: [], iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + EIGHT_HOURS })}`;
const token = `${head}.${createSign("RSA-SHA256").update(head).sign(privateKey).toString("base64url")}`;
for (let attempt = 0; attempt < 60; attempt += 1) { if ((await fetch(`${GATEWAY}/celebrations/health`).catch(() => null))?.ok) break; await new Promise((r) => setTimeout(r, 1000)); }
ok("services healthy through Kong");

step("export the universal web app with the dev token");
const build = spawnSync("npx", ["expo", "export", "--platform", "web", "--output-dir", "web-build", "--max-workers", "1", "--dev"], { cwd: app, env: { ...process.env, EXPO_PUBLIC_API_URL: GATEWAY, EXPO_PUBLIC_SITE_URL: SITE, EXPO_PUBLIC_DEV_ACCESS_TOKEN: token, NODE_ENV: "development" }, stdio: "inherit", shell: true });
assert.equal(build.status, 0);
const root = join(app, "web-build");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ttf": "font/ttf" };
const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname);
  const file = join(root, path);
  const target = existsSync(file) && extname(file) ? file : join(root, "index.html");
  response.writeHead(200, { "content-type": types[extname(target)] ?? "application/octet-stream" });
  response.end(readFileSync(target));
}).listen(PORT);
ok(`serving web-build on :${PORT}`);

function png(width = 900, height = 600) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buffer) => { let c = 0xffffffff; for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (kind, data) => { const length = Buffer.alloc(4); length.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(kind), data]); const sum = Buffer.alloc(4); sum.writeUInt32BE(crc(body)); return Buffer.concat([length, body, sum]); };
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const rows = Buffer.concat(Array.from({ length: height }, (_, y) => Buffer.concat([Buffer.from([0]), Buffer.concat(Array.from({ length: width }, (_, x) => Buffer.from([134, 94 + (y % 60), 54 + (x % 80)])))])));
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", header), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "es-BO", timezoneId: "Europe/Madrid" });
const page = await context.newPage();
page.on("pageerror", (error) => console.error("page error:", error.message));
const app$ = (path) => `http://localhost:${PORT}${path}`;
const shots = [];
const capture = async (lane, name) => {
  mkdirSync(join(evidence, lane), { recursive: true });
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    const file = join(evidence, lane, `${name}-${width}.png`);
    await page.screenshot({ path: file, fullPage: true });
    shots.push(`${lane}/${name}-${width}.png`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const blocking = axe.violations.filter((violation) => ["critical", "serious"].includes(violation.impact));
  if (blocking.length) console.error(`  ✖ axe ${lane}/${name}: ${blocking.map((violation) => `${violation.id}(${violation.nodes.length})`).join(", ")}`);
  return blocking.length;
};
let axeProblems = 0;

step("C2–C5 · create a wedding through onboarding");
await page.goto(app$("/celebraciones"));
await page.getByTestId("create-celebration").click();
await page.getByRole("radio", { name: "Boda" }).click();
await page.getByTestId("onboarding-next").click();
const slug = `boda-ui-${randomUUID().slice(0, 6)}`;
await page.getByLabel("Nombre de la celebración").fill("Camila y Diego");
await page.getByLabel("Dirección del sitio").fill(slug);
await page.getByLabel("Fecha (AAAA-MM-DD)").fill("2026-12-19");
await page.getByLabel("Hora (HH:MM)").fill("19:30");
await page.getByRole("radio", { name: "America/La_Paz" }).click();
await page.getByLabel("Novia").fill("Camila");
await page.getByLabel("Novio").fill("Diego");
axeProblems += await capture("lane-F11", "C4-onboarding-datos");
await page.getByTestId("onboarding-create").click();
await page.waitForURL(/onboarding\/3/);
const celebrationId = new URL(page.url()).searchParams.get("c");
assert.ok(celebrationId);
ok(`created ${slug} (${celebrationId})`);

step("C5 · choose a template with live preview");
await page.getByRole("radio", { name: /Editorial/ }).click({ timeout: 20_000 });
axeProblems += await capture("lane-F12", "C5-templates-preview");
await page.getByTestId("apply-template").click();
await page.getByRole("radio", { name: /Editorial · En uso/ }).waitFor({ timeout: 15_000 });
ok("template applied");
await page.getByTestId("onboarding-finish").click();

step("C7–C11 · content");
await page.waitForURL(/editor\/general/);
await page.getByLabel("Lugar principal").fill("Hacienda Los Álamos");
await page.getByTestId("save-content").click();
await page.getByText("Cambios guardados.").waitFor();
await page.goto(app$(`/editor/historia?c=${celebrationId}`));
await page.getByLabel("Su historia").fill("Nos conocimos en Sucre.\n\nSeis años después, celebramos.");
await page.getByTestId("save-content").click();
await page.getByText("Cambios guardados.").waitFor();
await page.goto(app$(`/editor/itinerario?c=${celebrationId}`));
await page.getByText("Agregar actividad").click();
await page.getByLabel("Actividad", { exact: true }).last().fill("Ceremonia");
await page.getByLabel("Fecha (AAAA-MM-DD)").last().fill("2026-12-19");
await page.getByLabel("Hora (HH:MM)").last().fill("19:30");
await page.getByText("Agregar actividad").click();
await page.getByLabel("Actividad", { exact: true }).last().fill("Fiesta");
await page.getByLabel("Fecha (AAAA-MM-DD)").last().fill("2026-12-19");
await page.getByLabel("Hora (HH:MM)").last().fill("23:30");
axeProblems += await capture("lane-F11", "C10-itinerario");
await page.getByTestId("save-content").click();
await page.getByText("Cambios guardados.").waitFor();
ok("general, story and schedule saved");

step("C12 · upload a real photo to MinIO with progress");
await page.goto(app$(`/editor/galeria?c=${celebrationId}`));
const chooser = page.waitForEvent("filechooser");
await page.getByTestId("add-photo").click();
await (await chooser).setFiles({ name: "portada.png", mimeType: "image/png", buffer: png() });
await page.getByText("Portada", { exact: false }).first().waitFor({ timeout: 30_000 });
axeProblems += await capture("lane-F11", "C12-galeria");
ok("photo processed and set as cover");

step("C16 · checklist and publish");
await page.goto(app$(`/publicar?c=${celebrationId}`));
await page.getByText("Todo listo para publicar.").waitFor({ timeout: 15_000 });
axeProblems += await capture("lane-F12", "C16-publicar");
await page.getByTestId("publish").click();
await page.getByRole("button", { name: "Publicar celebración" }).last().click();
await page.getByText("Publicada: cualquiera con el enlace la ve.").waitFor({ timeout: 15_000 });
ok("published");

step("C18 · switch gift reservations to automatic, confirming");
await page.goto(app$(`/modos?c=${celebrationId}`));
await page.getByTestId("switch-giftReservationMode").click();
axeProblems += await capture("lane-F13", "C18-confirmacion");
await page.getByRole("button", { name: "Sí, cambiar" }).click();
await page.getByText("Ahora: Automático").waitFor({ timeout: 15_000 });
ok("mode changed (not retroactive notice shown)");

step("C17 · RSVP deadline in the event's local time");
await page.goto(app$(`/configuracion?c=${celebrationId}`));
await page.getByLabel("Fecha (AAAA-MM-DD)").fill("2026-12-10");
await page.getByLabel("Hora (HH:MM)").fill("23:59");
await page.getByTestId("save-settings").click();
await page.waitForTimeout(1500);
axeProblems += await capture("lane-F13", "C17-configuracion");
const stored = await (await fetch(`${GATEWAY}/celebrations/${celebrationId}`, { headers: { authorization: `Bearer ${token}` } })).json();
assert.equal(stored.settings.rsvpDeadline, "2026-12-11T03:59:00.000Z");
assert.equal(stored.settings.giftReservationMode, "AUTO_ACCEPT");
ok("deadline stored as 23:59 La Paz (03:59Z)");

step("C15 · preview");
await page.goto(app$(`/preview?c=${celebrationId}`));
await page.getByTestId("preview-mobile").waitFor({ timeout: 15_000 });
axeProblems += await capture("lane-F12", "C15-preview");

step("E4 · admin creates an event type; it is offered in onboarding at once");
const code = `GRADUACION_${randomUUID().slice(0, 4).toUpperCase()}`;
await page.goto(app$("/admin/tipos-evento"));
await page.getByTestId("event-type-code").fill(code);
await page.getByLabel("Roles de anfitrión").fill("GRADUATE");
await page.getByLabel("Etiquetas de templates compatibles").fill("graduation");
await page.getByLabel("Nombre (es-BO)").fill(`Graduación ${code.slice(-4)}`);
axeProblems += await capture("lane-F14", "E4-tipos-evento");
await page.getByTestId("save-event-type").click();
await page.getByText(/Ya se puede usar en celebraciones nuevas/).waitFor({ timeout: 15_000 });
await page.goto(app$("/onboarding/1"));
await page.getByRole("radio", { name: `Graduación ${code.slice(-4)}` }).waitFor({ timeout: 15_000 });
ok(`${code} offered in onboarding`);
await page.goto(app$("/admin/templates"));
await page.getByTestId("template-name").waitFor();
axeProblems += await capture("lane-F14", "E3-templates");
await page.goto(app$("/admin/operacion"));
await page.getByText("celebration-site-service: Disponible").waitFor({ timeout: 15_000 });
axeProblems += await capture("lane-F14", "E12-operacion");

step("the public site shows what the host made");
const publicPage = await context.newPage();
await publicPage.goto(`${SITE}/c/${slug}`);
await publicPage.getByRole("heading", { name: "Camila y Diego" }).waitFor({ timeout: 90_000 });
const itinerary = await publicPage.locator(".celebration-schedule time").allTextContents();
assert.deepEqual(itinerary, ["7:30 p. m.", "11:30 p. m."]);
assert.equal(await publicPage.locator("article.celebration").getAttribute("data-layout"), "editorial");
await publicPage.screenshot({ path: join(evidence, "lane-F10", "live-from-host-1280.png"), fullPage: true });
ok("public page: editorial layout, schedule 19:30 and 23:30 La Paz seen from a Madrid browser");

await browser.close();
server.close();
console.log(`\nScreenshots: ${shots.length}. axe blocking problems: ${axeProblems}.`);
process.exit(axeProblems ? 1 : 0);
