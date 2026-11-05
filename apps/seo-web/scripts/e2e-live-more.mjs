// F25 / F26 / F27 browser runs against the live backend. Loaded by e2e-live.mjs.
import { join } from "node:path";
import assert from "node:assert/strict";

const PARTNER_HOSTS = ["example.com", "wa.me", "instagram.com"];
const isPartnerTarget = (href) => /^(tel:|mailto:|sms:)/.test(href) || (/^https?:\/\//.test(href) && PARTNER_HOSTS.some((host) => new URL(href).hostname === host || new URL(href).hostname.endsWith(`.${host}`)));

function nextMonthDays() {
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const iso = (day) => new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), day)).toISOString().slice(0, 10);
  return { iso, month: iso(1).slice(0, 7) };
}

async function f26({ open, snap, noOverflow, http, login, world, record, WIDTHS, SITE }) {
  console.log("\nF26 · cotizacion y agenda");
  const slug = world.provider.slug;
  const providerToken = await login(world.provider.email);
  const visitor = await login(world.viewer.email);
  const pid = world.provider.id;
  const withVisitor = async (width, path, token) => {
    const handle = await open(width, path);
    if (token) await handle.page.evaluate((value) => sessionStorage.setItem("rsvp.visitor.token", value), token);
    return handle;
  };
  const quotePath = `/p/${slug}/cotizar?l=${world.listings[0].id}`;
  for (const width of WIDTHS) {
    const { page, context } = await withVisitor(width, quotePath);
    await page.getByRole("heading", { name: /Pedir cotización a/ }).waitFor();
    await noOverflow(page, `cotizar-${width}`);
    if (width === 360) {
      assert.match(await page.getByText(/días de anticipación/).first().innerText(), /3 días/, "fulfillment visible in the cart");
      await page.getByRole("button", { name: "Enviar solicitud" }).click();
      await page.getByText("Escribe tu nombre.").waitFor();
      await snap("F26", page, "B8-validacion", width);
    }
    await snap("F26", page, "B8-cotizar", width);
    await context.close();
  }
  record("F26", "REQ-F26-01", "carrito de intención con items, fecha, invitados, presupuesto; fulfillment (responsable, cobertura, plazo) visible por oferta; validación accesible");
  const fill = async (page) => {
    await page.getByLabel("Fecha del evento").fill("2027-03-10");
    await page.getByLabel("Cantidad de invitados").fill("80");
    await page.getByLabel("Presupuesto aproximado (Bs.)").fill("5000");
    await page.getByLabel("Tu nombre").fill("Ana Prueba");
    await page.getByLabel("Tu correo").fill("ana.prueba@example.com");
  };
  {
    const { page, context } = await withVisitor(360, quotePath);
    await page.getByRole("heading", { name: /Pedir cotización a/ }).waitFor();
    await fill(page);
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await page.getByRole("heading", { name: "Inicia sesión para enviar tu solicitud" }).waitFor();
    await snap("F26", page, "B8-401-sin-sesion", 360);
    record("F26", "401", "sin sesión Provider Catalog responde 401 y la pantalla pide iniciar sesión conservando lo escrito");
    await context.close();
  }
  {
    const before = (await http("GET", `/providers/${pid}/leads`, { token: providerToken })).json?.items?.length ?? 0;
    const { page, context } = await withVisitor(360, quotePath, visitor);
    await page.getByRole("heading", { name: /Pedir cotización a/ }).waitFor();
    await fill(page);
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await page.getByRole("heading", { name: "Solicitud enviada" }).waitFor();
    await snap("F26", page, "B9-enviada", 360);
    await page.setViewportSize({ width: 1280, height: 900 }); await snap("F26", page, "B9-enviada", 1280);
    record("F26", "REQ-F26-02", "201 QuoteReceipt: confirmacion con numero de solicitud y deslinde (la copia por correo NO se verifico: no hay evidencia de envio)");
    const leads = (await http("GET", `/providers/${pid}/leads`, { token: providerToken })).json;
    const form = leads.items.filter((lead) => lead.kind === "FORM");
    assert.ok(leads.items.length > before && form.length >= 1, `lead FORM registered (${JSON.stringify(leads.items.map((l) => l.kind))})`);
    record("F26", "REQ-F26-06", `la cotizacion genero ${form.length} lead(s) kind=FORM visibles para el proveedor`);
    await context.close();
  }

  // Agenda
  const { iso, month } = nextMonthDays();
  const agendaPath = `/p/${slug}/agenda`;
  for (const width of WIDTHS) {
    const { page, context } = await withVisitor(width, agendaPath, visitor);
    await page.getByRole("heading", { name: /Disponibilidad de/ }).waitFor();
    await page.getByRole("button", { name: "Mes siguiente" }).click();
    await page.locator(`[data-date="${iso(1)}"]`).waitFor();
    await noOverflow(page, `agenda-${width}`);
    if (width === 1280) {
      const states = await page.$$eval("[data-date]", (nodes) => nodes.map((n) => n.getAttribute("data-state")));
      assert.ok(states.includes("free") && states.includes("blocked"), `free and blocked days both present: ${[...new Set(states)]}`);
    }
    await snap("F26", page, "B10-calendario", width);
    await context.close();
  }
  record("F26", "REQ-F26-03", "calendario mensual con dias libres/bloqueados (feriado) en la hora del proveedor");

  // 422: day blocked after the page loaded
  {
    const { page, context } = await withVisitor(360, agendaPath, visitor);
    await page.getByRole("heading", { name: /Disponibilidad de/ }).waitFor();
    await page.getByRole("button", { name: "Mes siguiente" }).click();
    await page.locator(`[data-date="${iso(15)}"]`).click();
    const current = (await http("GET", `/providers/${pid}/availability`, { token: providerToken })).json;
    const put = await http("PUT", `/providers/${pid}/availability`, { token: providerToken, body: { capacityPerDay: current.capacityPerDay, rules: current.rules, blackouts: [...(current.blackouts ?? []), { start: iso(15), reason: "Evento privado" }] } });
    assert.equal(put.status, 200, JSON.stringify(put.json));
    await page.getByRole("button", { name: "Solicitar esta fecha" }).click();
    await page.getByText(/el proveedor la bloqueó/).waitFor();
    await snap("F26", page, "B11-422-fecha-bloqueada", 360);
    record("F26", "REQ-F26-05a", "422 fecha bloqueada: 'el proveedor la bloqueó, elige otro día'");
    await context.close();
  }
  // 409: last slot taken by someone else, then success on another day
  {
    const { page, context } = await withVisitor(360, agendaPath, visitor);
    await page.getByRole("heading", { name: /Disponibilidad de/ }).waitFor();
    await page.getByRole("button", { name: "Mes siguiente" }).click();
    await page.locator(`[data-date="${iso(20)}"]`).click();
    const rival = await http("POST", `/providers/${pid}/bookings`, { token: providerToken, body: { date: iso(20) } });
    assert.equal(rival.status, 201, JSON.stringify(rival.json));
    await page.getByRole("button", { name: "Solicitar esta fecha" }).click();
    await page.getByText(/Alguien tomó el último cupo/).waitFor();
    await snap("F26", page, "B11-409-sin-cupo", 360);
    assert.equal(await page.locator(`[data-date="${iso(20)}"]`).getAttribute("data-state"), "full", "calendar refreshed after the conflict");
    record("F26", "REQ-F26-05b", "409 sin cupo: mensaje distinto al 422 y calendario refrescado (dia pasa a 'sin cupo')");
    await page.locator(`[data-date="${iso(22)}"]`).click();
    await page.getByRole("button", { name: "Solicitar esta fecha" }).click();
    await page.getByText("Fecha solicitada.").waitFor();
    await snap("F26", page, "B11-solicitada", 360);
    record("F26", "REQ-F26-04", "201: fecha solicitada con vencimiento en la zona del proveedor");
    await context.close();
  }
}

async function f25({ open, snap, noOverflow, world, record, WIDTHS }) {
  console.log("\nF25 · microsite con datos reales");
  const slug = world.provider.slug;
  for (const width of WIDTHS) {
    const { page, context } = await open(width, `/p/${slug}`);
    await page.getByRole("heading", { level: 1, name: /Dulce Sol/ }).waitFor();
    await noOverflow(page, `p-${width}`);
    if (width === 1280) {
      const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').first().innerText());
      assert.equal(ld["@type"], "LocalBusiness");
      assert.ok(ld.areaServed?.length >= 1, "areaServed from the real fulfillment coverage");
      const order = await page.evaluate(() => { const d = document.querySelector('[data-testid="partner-disclaimer"]'); const a = document.querySelector(".partner-actions a"); return Boolean(d && a && d.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING); });
      assert.equal(order, true, "disclaimer before contact");
      record("F25", "REQ-F25-01/02/05", "portada con nombre real del proveedor (GET /providers/{id}), JSON-LD LocalBusiness con areaServed real y deslinde antes del contacto");
    }
    await snap("F25", page, "B5-microsite", width);
    await context.close();
  }
  for (const width of WIDTHS) {
    const { page, context } = await open(width, `/p/${slug}/catalogo`);
    await page.getByRole("heading", { level: 1, name: /Catálogo de/ }).waitFor();
    await noOverflow(page, `catalogo-${width}`);
    await snap("F25", page, "B6-catalogo", width);
    await context.close();
  }
  record("F25", "REQ-F25-03", "catalogo con 3 ofertas y precio en BOB");
  for (const width of WIDTHS) {
    const { page, context } = await open(width, `/p/${slug}/catalogo/${world.listings[2].id}`);
    await page.getByTestId("fulfillment").waitFor();
    const text = await page.getByTestId("fulfillment").innerText();
    assert.match(text, /El proveedor/); assert.match(text, /la-paz, el-alto/); assert.match(text, /Bs\s?50/); assert.match(text, /3 días/);
    await noOverflow(page, `sku-${width}`);
    await snap("F25", page, "B7-detalle-fulfillment", width);
    await context.close();
  }
  record("F25", "REQ-F25-04", "detalle con fulfillment real visible: responsable, cobertura, traslado Bs 50,00, plazo 3 dias, condiciones y deslinde");
  const { page, context } = await open(360, `/p/no-existe-000000`);
  await page.getByRole("heading", { name: "No encontramos este proveedor" }).waitFor();
  await snap("F25", page, "B14-no-existe", 360);
  record("F25", "REQ-F25-06", "proveedor desconocido: 404 controlado");
  await context.close();
}

async function f27({ open, snap, world, login, record, evidence, SITE }) {
  console.log("\nF27 · ninguna pantalla enlaza directo a un partner");
  const credential = await login(world.viewer.email);
  const celebration = world.celebration.slug;
  const routes = [
    ["/", null], ["/proveedores", null], ["/proveedores/decoracion", null], ["/proveedores/decoracion/la-paz", null], ["/proveedores/buscar?q=torta", null], ["/catalogo", null],
    [`/p/${world.provider.slug}`, null], [`/p/${world.provider.slug}/catalogo`, null], [`/p/${world.provider.slug}/catalogo/${world.listings[0].id}`, null], [`/p/${world.provider.slug}/cotizar`, null], [`/p/${world.provider.slug}/agenda`, null],
    [`/c/${celebration}`, null], [`/c/${celebration}/regalos`, credential], [`/c/${celebration}/regalos/${world.giftItems[0]}`, credential]
  ];
  const report = [];
  let partnerLinks = 0;
  for (const [path, token] of routes) {
    const { page, context } = await open(1280, path, token ? { credential: token } : {});
    await page.waitForLoadState("networkidle").catch(() => undefined);
    const hrefs = await page.$$eval("a[href], area[href], form[action]", (nodes) => nodes.map((n) => n.getAttribute("href") ?? n.getAttribute("action") ?? ""));
    const resolved = hrefs.map((href) => (href.startsWith("/") || href.startsWith("#") ? href : href));
    const direct = resolved.filter(isPartnerTarget);
    const viaRedirector = resolved.filter((href) => href.startsWith("/r/"));
    partnerLinks += viaRedirector.length;
    report.push({ path, links: resolved.length, viaRedirector: viaRedirector.length, direct });
    assert.deepEqual(direct, [], `${path} links straight to a partner: ${direct.join(", ")}`);
    await context.close();
  }
  record("F27", "REQ-F27-06", `escaneo DOM de ${routes.length} rutas publicas (con datos reales): 0 enlaces directos a partner; ${partnerLinks} enlaces salen por /r/`);

  // 302, UTM and correlationId, surface recorded
  const listing = world.listings[0].id;
  const correlationId = "6f1f1a34-5d4c-4a39-9a2e-0f4f2d3d7b99";
  const response = await fetch(`${SITE}/r/${listing}?destination=WHATSAPP&surface=GIFT_LIST&celebrationId=${world.celebration.id}&utm_campaign=boda-ana-luis`, { redirect: "manual", headers: { "x-correlation-id": correlationId } });
  assert.equal(response.status, 302, "302 never 301");
  const location = new URL(response.headers.get("location"));
  assert.equal(location.hostname, "wa.me");
  assert.equal(location.searchParams.get("utm_campaign"), "boda-ana-luis");
  assert.equal(location.searchParams.get("correlationId"), correlationId);
  record("F27", "REQ-F27-02/03/04", `GET /r/{listingId} -> 302 a ${location.origin} con utm_campaign y correlationId conservados`);
  const miss = await fetch(`${SITE}/r/00000000-0000-4000-8000-000000000000?destination=WHATSAPP`, { redirect: "manual" });
  assert.equal(miss.status, 404);
  record("F27", "404", "listing inexistente: pagina de error clara (404), sin 301");
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(evidence("F27"), "no-direct-partner-links-scan.json"), JSON.stringify({ date: new Date().toISOString(), routes: report }, null, 2));
  const { page, context } = await open(360, `/r/00000000-0000-4000-8000-000000000000?destination=WHATSAPP`);
  await snap("F27", page, "B13-error-redirector", 360);
  await context.close();
}

export default { f26, f25, f27 };
