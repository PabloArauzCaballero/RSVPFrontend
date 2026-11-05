// F14 visual proof: serves the exported web app (web-build, built with EXPO_PUBLIC_DEV_ACCESS_TOKEN of an ADMIN
// and EXPO_PUBLIC_API_URL=http://localhost:28000) and captures the seven new admin modules.
//   "real"  = no interception: whatever the live gateway answers (the admin endpoints are not published yet).
//   "datos" = the expected contract answered by Playwright routes with SAMPLE data (not backend data).
//   CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node scripts/f14-capture.mjs
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const app = fileURLToPath(new URL("..", import.meta.url));
const out = fileURLToPath(new URL("../../../docs/progress/evidence/lane-F14/", import.meta.url));
mkdirSync(out, { recursive: true });
const PORT = 8214;
const root = join(app, "web-build");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".json": "application/json", ".ttf": "font/ttf" };
const server = createServer((request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname);
  const file = join(root, path);
  const target = existsSync(file) && extname(file) ? file : join(root, "index.html");
  response.writeHead(200, { "content-type": types[extname(target)] ?? "application/octet-stream" });
  response.end(readFileSync(target));
}).listen(PORT);

const cors = { "access-control-allow-origin": `http://localhost:${PORT}`, "access-control-allow-headers": "authorization, content-type, if-match, accept, accept-language, x-correlation-id, idempotency-key", "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS", "access-control-allow-credentials": "true", "content-type": "application/json" };
const providers = [
  { providerId: "p-1", name: "Foto Altiplano", category: "Fotografía", city: "La Paz", submittedAt: "2026-11-01T15:00:00Z", status: "PENDING" },
  { providerId: "p-2", name: "Catering Sol de Mayo", category: "Catering", city: "Santa Cruz", submittedAt: "2026-11-02T15:00:00Z", status: "PENDING" }
];
const mocks = {
  "/providers/admin/verification-queue": { items: providers },
  "/providers/admin/moderation": { items: [
    { id: "m-1", kind: "MICROSITE", title: "Sitio de Foto Altiplano", url: "https://example.com/foto", submittedBy: "foto@example.com", submittedAt: "2026-11-02T10:00:00Z", status: "PENDING" },
    { id: "g-1", kind: "EXTERNAL_GIFT", title: "Licuadora en tienda externa", submittedBy: "ana@example.com", submittedAt: "2026-11-02T11:00:00Z", status: "PENDING" }] },
  "/providers/admin/categories": { items: [{ code: "FOTOGRAFIA", names: { "es-BO": "Fotografía", "en-US": "Photography" }, active: true }, { code: "CATERING", names: { "es-BO": "Catering" }, active: true }, { code: "MUSICA", names: { "es-BO": "Música en vivo" }, active: false }] },
  "/providers/admin/geography": { items: [{ code: "BO", kind: "COUNTRY", parentCode: null, names: { "es-BO": "Bolivia" }, active: true }, { code: "LA_PAZ", kind: "CITY", parentCode: "BO", names: { "es-BO": "La Paz" }, active: true }] },
  "/providers/admin/metrics/leads": { groupBy: "partner", from: "2026-10-05", to: "2026-11-04", total: 12, items: [{ key: "p-1", label: "Foto Altiplano", leads: 8, quotes: 5, bookings: 2 }, { key: "p-2", label: "Catering Sol de Mayo", leads: 4, quotes: 1, bookings: 0 }] },
  "/identity/admin/users": { items: [{ id: "u-1", email: "ana@example.com", roles: ["HOST"], status: "ACTIVE", createdAt: "2026-10-01T12:00:00Z" }, { id: "u-2", email: "planner@example.com", roles: ["PLANNER"], status: "ACTIVE", createdAt: "2026-10-12T09:30:00Z" }] },
  "/identity/admin/organizations": { items: [{ id: "o-1", name: "Eventos Andinos", ownerUserId: "u-2", members: [{ userId: "u-2", role: "PLANNER" }] }] }
};
const screens = [
  ["E5-categorias", "/admin/categorias", "/providers/admin/categories"], ["E6-geografia", "/admin/geografia", "/providers/admin/geography"],
  ["E7-verificacion", "/admin/verificacion", "/providers/admin/verification-queue"], ["E8-moderacion", "/admin/moderacion", "/providers/admin/moderation"],
  ["E9-usuarios", "/admin/usuarios", "/identity/admin/users"], ["E10-organizaciones", "/admin/organizaciones", "/identity/admin/organizations"],
  ["E11-metricas", "/admin/metricas", "/providers/admin/metrics/leads"]
];
const WIDTHS = [[1280, 900], [768, 1024], [360, 800]];
const executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const axe = [];

async function open(width, height, mock, body = mocks) {
  const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
  if (mock) {
    await page.route(/localhost:28000\/(providers|identity)\/admin\//, async (route) => {
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      const path = new URL(route.request().url()).pathname.replace(/^\/(providers|identity)\/admin/, (m, s) => `/${s}/admin`);
      const data = body[path];
      return data === undefined ? route.fulfill({ status: 404, headers: cors, body: "{}" }) : route.fulfill({ status: 200, headers: cors, body: JSON.stringify(data) });
    });
  }
  return page;
}
async function shot(page, name) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(out, `${name}.png`), fullPage: true });
  console.log("shot", name);
}

for (const [name, path] of screens) {
  for (const [width, height] of WIDTHS) {
    const page = await open(width, height, true);
    await page.goto(`http://localhost:${PORT}${path}`);
    await page.waitForLoadState("networkidle");
    await shot(page, `${name}-datos-${width}`);
    if (width === 1280) {
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      axe.push({ screen: name, violations: result.violations.map((v) => `${v.id} (${v.impact}, ${v.nodes.length})`) });
    }
    await page.close();
  }
  const real = await open(1280, 900, false);
  await real.goto(`http://localhost:${PORT}${path}`);
  await real.waitForLoadState("networkidle");
  await shot(real, `${name}-backend-real-1280`);
  await real.close();
}

// Reject dialog and empty state of the verification queue.
{
  const page = await open(1280, 900, true);
  await page.goto(`http://localhost:${PORT}/admin/verificacion`);
  await page.getByRole("button", { name: "Rechazar a Catering Sol de Mayo" }).click();
  await page.getByRole("button", { name: "Rechazar", exact: true }).click();
  await shot(page, "E7-verificacion-rechazar-sin-motivo-1280");
  await page.getByLabel("Motivo").fill("Falta el documento de identidad");
  await shot(page, "E7-verificacion-rechazar-con-motivo-1280");
  await page.close();
  const empty = await open(1280, 900, true, { ...mocks, "/providers/admin/verification-queue": { items: [] } });
  await empty.goto(`http://localhost:${PORT}/admin/verificacion`);
  await shot(empty, "E7-verificacion-vacio-1280");
  await empty.close();
  const denied = await open(1280, 900, true, mocks);
  await denied.route(/localhost:28000\/providers\/admin\/verification-queue/, (route) => (route.request().method() === "OPTIONS" ? route.fulfill({ status: 204, headers: cors }) : route.fulfill({ status: 403, headers: cors, body: "{}" })));
  await denied.goto(`http://localhost:${PORT}/admin/verificacion`);
  await shot(denied, "E7-verificacion-403-1280");
  await denied.close();
}
console.log("axe", JSON.stringify(axe, null, 1));
await browser.close();
server.close();
