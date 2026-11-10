// Barrido visual de las pantallas clave con los datos de demostracion (Chrome real). Solo mide y captura; no corrige nada.
//   APP=http://localhost:8200 OUT=<carpeta> CHROMIUM_PATH=".../Google Chrome" node apps/universal/scripts/seed/review.mjs
// Lee .last-run.json (ids) y las cuentas del poblador. Informe: <OUT>/review.json y capturas <OUT>/<rol>-<ruta>-<ancho>.png
import { chromium } from "playwright";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PASSWORD } from "./data.mjs";
import { account, must } from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const run = JSON.parse(readFileSync(join(here, ".last-run.json"), "utf8"));
const APP = process.env.APP ?? "http://localhost:8200";
const OUT = process.env.OUT ?? join(here, "review-out");
const WIDTHS = (process.env.WIDTHS ?? "360,768,1280").split(",").map(Number);
mkdirSync(OUT, { recursive: true });

const wed = run.wedding.id;
const hostAcc = await account(run.accounts.hostWedding, PASSWORD, "HOST");
const guestsPage = await must("GET", `/guests/celebrations/${wed}/guests?limit=12`, { token: hostAcc.token });
const sample = guestsPage.items.find((g) => g.name.startsWith("María de los")) ?? guestsPage.items[0];
const cred = (await must("POST", `/guests/celebrations/${wed}/guests/${sample.id}/access-token`, { token: hostAcc.token, body: {} })).token;
const ROUTES = {
  host: [`/inicio`, `/invitados`, `/invitados/grupos`, `/invitados/${sample.id}`, `/bandeja/acompanantes`, `/bandeja/regalos`, `/regalos`, `/regalos/proveedores`, `/rsvp/reporte`, `/notificaciones`, `/preferencias`, `/configuracion`, `/celebraciones`, `/editor/story`, `/publicar`],
  provider: [`/portal`, `/portal/servicios`, `/portal/productos`, `/portal/agenda`, `/portal/leads`, `/portal/metricas`, `/portal/perfil`, `/portal/entrega`, `/portal/destinos`],
  admin: [`/admin`, `/admin/verificacion`, `/admin/moderacion`, `/admin/categorias`, `/admin/geografia`, `/admin/tipos-evento`, `/admin/usuarios`, `/admin/metricas`],
  guest: [`/c/${run.wedding.slug}/rsvp/${cred}`, `/c/${run.wedding.slug}/regalos/${cred}`]
};
const WHO = { host: [run.accounts.hostWedding, PASSWORD], provider: [run.accounts.providers.salon, PASSWORD], admin: [run.accounts.admin, process.env.E2E_ADMIN_PASSWORD ?? "Correct-horse-9battery"] };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
const findings = [];

async function measure(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const clipped = [], wide = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden") continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const text = (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) ? el.textContent.trim() : "";
      if (r.right > vw + 1 && r.left < vw) wide.push(`${el.tagName.toLowerCase()}[${el.getAttribute("data-testid") ?? ""}] ${text.slice(0, 50)}`);
      if (text && el.scrollWidth > el.clientWidth + 2 && ["hidden", "clip"].includes(cs.overflowX) && cs.textOverflow !== "ellipsis") clipped.push(`${el.tagName.toLowerCase()} "${text.slice(0, 60)}"`);
      if (text && el.scrollHeight > el.clientHeight + 2 && ["hidden", "clip"].includes(cs.overflowY)) clipped.push(`(alto) ${el.tagName.toLowerCase()} "${text.slice(0, 60)}"`);
    }
    return { scrollW: document.documentElement.scrollWidth, vw, wide: wide.slice(0, 5), clipped: clipped.slice(0, 5), chars: document.body.innerText.trim().length, head: document.body.innerText.trim().slice(0, 120).replace(/\n+/g, " | ") };
  });
}

for (const width of WIDTHS) {
  for (const role of Object.keys(ROUTES)) {
    const context = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, locale: "es-BO", timezoneId: "America/La_Paz" });
    context.setDefaultTimeout(15000);
    const page = await context.newPage();
    const errors = [], failed = [];
    page.on("pageerror", (e) => errors.push(e.message.slice(0, 120)));
    page.on("response", (r) => { if (r.status() >= 400 && !/\/(media|templates)|devices|push-deliveries/.test(r.url())) failed.push(`${r.status()} ${new URL(r.url()).pathname.replace(/[0-9a-f-]{36}/g, ":id")}`); });
    if (role !== "guest") {
      await page.goto(`${APP}/login`);
      await page.getByLabel("Correo electrónico", { exact: true }).filter({ visible: true }).fill(WHO[role][0]);
      await page.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(WHO[role][1]);
      await page.getByRole("button", { name: "Iniciar sesión" }).filter({ visible: true }).click();
      await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20000 }).catch(() => findings.push({ role, width, route: "/login", problem: "no salio del login" }));
    }
    for (const route of ROUTES[role]) {
      errors.length = 0; failed.length = 0;
      const t0 = Date.now();
      const sep = route.includes("?") ? "&" : "?";
      await page.goto(`${APP}${route}${role === "host" ? `${sep}c=${wed}` : ""}`).catch(() => undefined);
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
      await page.waitForTimeout(600);
      const ms = Date.now() - t0;
      const m = await measure(page);
      const shot = `${role}${route.replace(/[^a-z0-9]+/gi, "-").replace(/[A-Za-z0-9_-]{30,}/g, "x").slice(0, 60)}-${width}.png`;
      await page.screenshot({ path: join(OUT, shot), fullPage: true }).catch(() => undefined);
      const problems = [];
      if (m.scrollW > m.vw + 1) problems.push(`scroll horizontal ${m.scrollW}>${m.vw}`);
      if (m.wide.length) problems.push(`desborda: ${m.wide.join("; ")}`);
      if (m.clipped.length) problems.push(`recortado: ${m.clipped.join("; ")}`);
      if (errors.length) problems.push(`pageerror: ${errors.join("; ")}`);
      if (failed.length) problems.push(`http: ${[...new Set(failed)].join(", ")}`);
      if (m.chars < 40) problems.push("pantalla casi vacia");
      findings.push({ role, width, route: route.replace(/[A-Za-z0-9_-]{30,}/g, ":token"), ms, shot, head: m.head, problems });
      console.log(`${problems.length ? "!!" : "ok"} ${role} ${width} ${route.replace(/[A-Za-z0-9_-]{30,}/g, ":token")} ${ms}ms ${problems.join(" / ").slice(0, 200)}`);
    }
    await context.close();
  }
}
await browser.close();
writeFileSync(join(OUT, "review.json"), JSON.stringify(findings, null, 2));
console.log(`\n${findings.filter((f) => f.problems.length).length}/${findings.length} pantallas con hallazgos -> ${join(OUT, "review.json")}`);
