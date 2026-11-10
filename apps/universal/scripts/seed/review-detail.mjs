// Capturas puntuales (elemento que contiene un texto) a 360 px sobre los datos de demostracion. Solo documenta; no corrige.
//   APP=... OUT=... CHROMIUM_PATH=... node apps/universal/scripts/seed/review-detail.mjs
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PASSWORD } from "./data.mjs";
import { account, must } from "./lib.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const run = JSON.parse(readFileSync(join(here, ".last-run.json"), "utf8"));
const APP = process.env.APP ?? "http://localhost:8200", OUT = process.env.OUT ?? join(here, "review-out"); mkdirSync(OUT, { recursive: true });
const WIDTH = Number(process.env.WIDTH ?? 360);
const wed = run.wedding.id;
const host = await account(run.accounts.hostWedding, PASSWORD, "HOST");
const long = (await must("GET", `/guests/celebrations/${wed}/guests?search=Mar%C3%ADa%20de%20los&limit=5`, { token: host.token })).items?.[0];
const targets = [
  ["host", run.accounts.hostWedding, PASSWORD, `/invitados?c=${wed}`, "María de los Ángeles", "lista-nombre-largo"],
  ["host", run.accounts.hostWedding, PASSWORD, `/invitados/${long?.id}?c=${wed}`, "María de los Ángeles", "detalle-nombre-largo"],
  ["host", run.accounts.hostWedding, PASSWORD, `/regalos?c=${wed}`, "Vajilla de cerámica", "regalo-titulo-largo"],
  ["host", run.accounts.hostWedding, PASSWORD, `/regalos?c=${wed}`, "9.876.543", "regalo-precio-extremo"],
  ["host", run.accounts.hostWedding, PASSWORD, `/bandeja/regalos?c=${wed}`, "Reservar", "bandeja-regalos"],
  ["host", run.accounts.hostWedding, PASSWORD, `/rsvp/reporte?c=${wed}`, "Sin gluten", "reporte-dietas"],
  ["provider", run.accounts.providers.salon, PASSWORD, `/portal/servicios`, "paquete de boda completo", "oferta-titulo-largo"],
  ["provider", run.accounts.providers.foto, PASSWORD, `/portal/agenda`, "Vacaciones", "agenda"],
  ["admin", run.accounts.admin, "Correct-horse-9battery", `/admin/verificacion`, "Verificar", "verificacion"],
  ["admin", run.accounts.admin, "Correct-horse-9battery", `/admin`, "problema", "admin-resumen"]
];
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] });
let cur = null, ctx, page;
for (const [role, email, pass, route, needle, name] of targets) {
  if (cur !== email) {
    if (ctx) await ctx.close();
    ctx = await browser.newContext({ viewport: { width: WIDTH, height: 800 }, locale: "es-BO" }); page = await ctx.newPage(); cur = email;
    await page.goto(`${APP}/login`);
    await page.getByLabel("Correo electrónico", { exact: true }).filter({ visible: true }).fill(email);
    await page.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(pass);
    await page.getByRole("button", { name: "Iniciar sesión" }).filter({ visible: true }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 });
  }
  await page.goto(`${APP}${route}`); await page.waitForLoadState("networkidle").catch(() => undefined); await page.waitForTimeout(800);
  const el = page.getByText(needle).filter({ visible: true }).first();
  const found = await el.count();
  if (found) { await el.scrollIntoViewIfNeeded().catch(() => undefined); const box = await el.boundingBox(); const vw = WIDTH;
    console.log(name, "w=" + WIDTH, box ? `x=${Math.round(box.x)} w=${Math.round(box.width)} right=${Math.round(box.x + box.width)} ${box.x + box.width > vw + 1 ? "DESBORDA" : "cabe"}` : "sin caja");
  } else console.log(name, "no se encontro el texto", needle);
  await page.screenshot({ path: join(OUT, `${name}-${WIDTH}.png`) });
}
await browser.close();
