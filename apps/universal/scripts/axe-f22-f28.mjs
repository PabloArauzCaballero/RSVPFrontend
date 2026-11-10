// axe-core on the F21-F28 screens (web and Expo web) at 360/768/1280, light and dark, against the real backend.
//   WORLD=world.json CHROMIUM_PATH=... node apps/universal/scripts/axe-f22-f28.mjs   -> docs/progress/evidence/axe-f22-f28.json
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const APP = "http://localhost:8081", SITE = "http://localhost:3000";
const world = JSON.parse(readFileSync(process.env.WORLD, "utf8"));
const cid = world.celebration.id, slug = world.celebration.slug, token = world.guest.issued.token, c = `?c=${cid}`;
const WIDTHS = (process.env.WIDTHS ?? "360,768,1280").split(",").map(Number), SCHEMES = (process.env.SCHEMES ?? "light,dark").split(",");
const DETAIL = process.env.DETAIL === "1";
const web = [
  [`/c/${slug}/regalos#t=${token}`, "Regalos del invitado (web)"], [`/p/${world.provider.slug}`, "Microsite del partner"], [`/p/${world.provider.slug}/cotizar?l=${world.listings[0].id}`, "Cotizar sin cuenta"],
  [`/p/${world.provider.slug}/agenda`, "Agenda"], ["/proveedores/buscar?categoria=catering", "Directorio"]
];
const host = [[`/regalos${c}`, "Host regalos + visibilidad"], [`/regalos/catalogo${c}`, "Host catalogo"], [`/regalos/externo${c}`, "Host externo"], [`/regalos/proveedores${c}`, "Host descubrir proveedores"], [`/bandeja/regalos${c}`, "Host bandeja de reservas"]];
const portal = ["", "/alta", "/productos", "/servicios", "/entrega", "/perfil", "/documentos", "/destinos", "/agenda", "/leads", "/metricas"].map((p) => [`/portal${p}`, `Portal ${p || "resumen"}`]);
const guest = [[`/c/${slug}/regalos/${token}`, "Regalos del invitado (app)"]];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const out = [];
async function scan(page, path, label, base, width, scheme) {
  await page.goto(`${base}${path}`);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(1200);
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]).analyze();
  const serious = result.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  out.push({ label, path: path.split("#")[0], width, scheme, critical: result.violations.filter((v) => v.impact === "critical").length, serious: result.violations.filter((v) => v.impact === "serious").length, moderateOrMinor: result.violations.length - serious.length, violations: result.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, target: v.nodes[0]?.target?.join(" ") })) });
  if (DETAIL) for (const v of result.violations) console.log(`  [${label} ${width} ${scheme}] ${v.id} (${v.impact}) ${v.nodes.slice(0, 2).map((n) => `${n.target.join(" ")} :: ${n.html.slice(0, 160)}`).join(" || ")}`);
  if (serious.length) console.log(`  ${label} ${width} ${scheme}: ${serious.map((v) => `${v.id}(${v.nodes.length}) ${v.nodes[0]?.target?.join(" ")}`).join("; ")}`);
}
async function login(page, email) {
  await page.goto(`${APP}/login`);
  await page.getByLabel(/^(Correo electrónico|Correo)$/).filter({ visible: true }).fill(email);
  await page.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(world.password);
  await page.getByRole("button", { name: /^(Iniciar sesión|Entrar)$/ }).filter({ visible: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 });
}
for (const scheme of SCHEMES) for (const width of WIDTHS) {
  const open = async () => { const context = await browser.newContext({ viewport: { width, height: 900 }, locale: "es-BO", colorScheme: scheme }); context.setDefaultTimeout(20000); return { context, page: await context.newPage() }; };
  let { context, page } = await open();
  for (const [p, l] of web) await scan(page, p, l, SITE, width, scheme);
  for (const [p, l] of guest) await scan(page, p, l, APP, width, scheme);
  await context.close();
  ({ context, page } = await open()); await login(page, world.host.email);
  for (const [p, l] of host) await scan(page, p, l, APP, width, scheme);
  await context.close();
  ({ context, page } = await open()); await login(page, world.provider.email);
  for (const [p, l] of portal) await scan(page, p, l, APP, width, scheme);
  await context.close();
}
await browser.close();
const totals = { pages: out.length, critical: out.reduce((n, r) => n + r.critical, 0), serious: out.reduce((n, r) => n + r.serious, 0), moderateOrMinor: out.reduce((n, r) => n + r.moderateOrMinor, 0) };
if (process.env.DRY !== "1") writeFileSync(fileURLToPath(new URL("../../../docs/progress/evidence/axe-f22-f28.json", import.meta.url)), JSON.stringify({ date: new Date().toISOString(), totals, results: out }, null, 2));
console.log(JSON.stringify(totals));
