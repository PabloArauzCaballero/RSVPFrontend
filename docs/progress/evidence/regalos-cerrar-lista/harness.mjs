// E2E harness: the REAL gift-list-service (built dist of RSVPBackend, PostgreSQL 16, RLS on, migrations applied) behind a small gateway.
//   /gifts/*          -> the real service (prefix stripped, as Kong does)
//   /listings/{id}    -> answered here for the listings this harness seeded (Provider Catalog is NOT running: declared in the evidence)
//   everything else   -> the contract mock of packages/testing (celebration, guests, identity...: NOT the real services)
// Control endpoints (harness only): POST /__ctl/soldout?listing=&reason=  POST /__ctl/restock?listing=  GET /__ctl/state
const BE = '<scratchpad>/be-agotado/apps/gift-list-service';
const { createDatabase, startService, seedCelebration, assertStatus, token } = await import(`${BE}/test/integration/support.mjs`);
const { PostgresListingAvailabilityStore } = await import(`${BE}/dist/v2/infrastructure/persistence/listing-availability.store.js`);
const { parseListingAvailabilityEvent } = await import(`${BE}/dist/v2/interface/consumer/listing-availability.consumer.js`);
import { createServer, request as httpRequest } from 'node:http';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const CELEBRATION_ID = '5f1c2d3e-4a5b-4c6d-8e7f-a1b2c3d4e5f6'; // MOCK_CELEBRATION_ID of packages/testing
const MOCK_PORT = Number(process.env.MOCK_PORT ?? 28300);
const PORT = Number(process.env.GATEWAY_PORT ?? 8081);
const STATE_FILE = process.env.STATE_FILE ?? '<scratchpad>/e2e/state.json';

const db = await createDatabase('gift_e2e');
const svc = await startService(db, {});
const hostSub = randomUUID();
svc.access.set(`${CELEBRATION_ID}:${hostSub}`, 'MANAGE');
const hostToken = token(hostSub, { roles: ['HOST'], organizationIds: [] });
assertStatus(await svc.call('POST', `/celebrations/${CELEBRATION_ID}/gift-list`, { as: hostToken }), 201);

const key = () => `k-${randomUUID()}`;
const product = (title, minor) => { const id = randomUUID(); svc.listings.set(id, { providerId: randomUUID(), providerStatus: 'VERIFIED', published: true, giftEligible: true, title, priceFrom: { minor, currency: 'BOB' } }); return id; };
const addGift = async (title, minor, idea, quantity = 1) => {
  const listingId = product(title, minor);
  const made = assertStatus(await svc.call('POST', `/celebrations/${CELEBRATION_ID}/items/batch`, { as: hostToken, body: { items: [{ productListingId: listingId, giftIdeaCode: idea, quantity }] }, headers: { 'idempotency-key': key() } }), 201).body.items[0];
  return { id: made.id, listingId, title };
};
const holder = svc.guestLinks.issue(CELEBRATION_ID);
const visitor = svc.guestLinks.issue(CELEBRATION_ID);
const dorada = await addGift('Vajilla dorada', 95000, 'TABLEWARE');
const torta = await addGift('Torta de tres leches', 15000, 'CAKE');
const cafetera = await addGift('Cafetera italiana', 32000, 'KITCHEN_APPLIANCE');
const reserve = async (gift, secret, body = {}) => assertStatus(await svc.call('POST', `/celebrations/${CELEBRATION_ID}/items/${gift.id}/reservations`, { as: secret, body: { guestDisplayName: 'Marta Quispe', showName: true, ...body } }), 201).body;
const reservation = await reserve(dorada, holder.secret);

const clock = { t: Date.parse('2026-11-27T12:00:00.000Z') };
const store = new PostgresListingAvailabilityStore(db.pool, { forIdea: async () => [] }, 3);
const event = (listingId, { available, reason }) => { clock.t += 1000; const occurredAt = new Date(clock.t).toISOString(); return parseListingAvailabilityEvent({
  eventId: randomUUID(), eventType: 'provider.listing.availability-changed.v1', eventVersion: 1, occurredAt, producer: 'provider-catalog-service', correlationId: randomUUID(),
  tenant: { celebrationId: null }, actor: { type: 'USER', id: randomUUID() },
  payload: { listingId, providerId: randomUUID(), available, reason: available ? null : reason, previousAvailable: !available, previousReason: available ? reason : null, unavailableVariants: [], variants: [], revision: clock.t, title: 'Producto', occurredAt } }); };

const listingOf = (id) => [dorada, torta, cafetera].find((g) => g.listingId === id);
let corsOrigin = '*';
const corsHeaders = () => ({ 'access-control-allow-origin': corsOrigin, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'authorization,content-type,idempotency-key,x-correlation-id,accept,accept-language,if-match,x-request-id', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-expose-headers': 'idempotency-replayed,retry-after,x-correlation-id,etag', 'access-control-max-age': '600', vary: 'origin' });
const gateway = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://gw.local');
  corsOrigin = req.headers.origin ?? '*';
  const cors = corsHeaders();
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  const send = (status, body, extra = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...cors, ...extra }); res.end(JSON.stringify(body)); };
  try {
    if (url.pathname === '/__ctl/state') return send(200, { hostSub, dorada, torta, cafetera, reservation: reservation.id });
    if (url.pathname === '/__ctl/soldout' || url.pathname === '/__ctl/restock') {
      const listing = url.searchParams.get('listing') ?? dorada.listingId;
      const out = url.pathname.endsWith('soldout');
      const result = await store.apply(event(listing, { available: !out, reason: url.searchParams.get('reason') ?? 'OUT_OF_STOCK' }));
      return send(200, result);
    }
    const listing = url.pathname.match(/^\/listings\/([0-9a-f-]{36})$/);
    if (req.method === 'GET' && listing && listingOf(listing[1])) return send(200, { id: listing[1], title: listingOf(listing[1]).title, destinationTypes: ['PRODUCT_PAGE', 'WHATSAPP'], imageUrl: null });
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const toGift = url.pathname.startsWith('/gifts/');
    const target = toGift ? new URL(svc.base) : new URL(`http://127.0.0.1:${MOCK_PORT}`);
    const path = (toGift ? url.pathname.slice('/gifts'.length) : url.pathname) + url.search;
    const headers = { ...req.headers, host: target.host }; delete headers['content-length'];
    const upstream = httpRequest({ hostname: target.hostname, port: target.port, path, method: req.method, headers: { ...headers, ...(body.length ? { 'content-length': String(body.length) } : {}) } }, (up) => {
      const out = { ...up.headers, ...cors }; delete out['transfer-encoding'];
      res.writeHead(up.statusCode ?? 502, out); up.pipe(res);
    });
    upstream.on('error', (error) => send(502, { title: String(error) }));
    upstream.end(body);
  } catch (error) { send(500, { title: String(error?.stack ?? error) }); }
});
await new Promise((resolve) => gateway.listen(PORT, '127.0.0.1', resolve));
const state = { gateway: `http://127.0.0.1:${PORT}`, celebrationId: CELEBRATION_ID, hostToken, hostSub, holderSecret: holder.secret, visitorSecret: visitor.secret, dorada, torta, cafetera, reservationId: reservation.id };
writeFileSync(STATE_FILE, JSON.stringify(state, null, 1));
console.log('HARNESS READY', JSON.stringify({ gateway: state.gateway, db: 'PostgreSQL 16 gift_db', service: svc.base }));
const stop = async () => { gateway.close(); await svc.close(); await db.drop(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
