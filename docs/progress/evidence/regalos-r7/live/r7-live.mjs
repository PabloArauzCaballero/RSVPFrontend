// R7 live world: the REAL gift-list-service v2 (dist) on a REAL PostgreSQL (non-superuser owner, RLS), seeded and then marked UNAVAILABLE through the
// REAL consumer path (PostgresListingAvailabilityStore.apply). Provider Catalog, Celebration and Guest are the in-process doubles of test/integration/support.mjs.
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createDatabase, startService, token, assertStatus } from './test/integration/support.mjs';
import { PostgresListingAvailabilityStore } from './dist/v2/infrastructure/persistence/listing-availability.store.js';
import { parseListingAvailabilityEvent } from './dist/v2/interface/consumer/listing-availability.consumer.js';

const CELEBRATION = '5f1c2d3e-4a5b-4c6d-8e7f-a1b2c3d4e5f6';
const catalogue = [
  { listingId: randomUUID(), title: 'Vajilla de gres', priceMinor: 45000 },
  { listingId: randomUUID(), title: 'Juego de platos', priceMinor: 38050 },
  { listingId: randomUUID(), title: 'Set de mesa', priceMinor: 120000 },
  { listingId: randomUUID(), title: 'Vajilla azul', priceMinor: 52000 },
  { listingId: randomUUID(), title: 'Vajilla artesanal', priceMinor: 61000 },
  { listingId: randomUUID(), title: 'Vajilla de ceramica', priceMinor: 70000 },
];
const listings = new Map();
for (const entry of catalogue) listings.set(entry.listingId, { providerId: randomUUID(), providerStatus: 'VERIFIED', published: true, giftEligible: true, title: entry.title, priceFrom: { minor: entry.priceMinor, currency: 'BOB' } });
const forIdea = async (idea) => (idea === 'TABLEWARE' ? catalogue.map((c) => ({ ...c, currency: 'BOB' })) : []);
const catalog = { find: async (id) => { const l = listings.get(id); return l && { productListingId: id, type: 'PRODUCT', giftEligible: true, ...l }; }, suggest: async () => [], forIdea };

const db = await createDatabase('gift_r7_live');
const svc = await startService(db, { deps: { catalog } });
const hostSub = randomUUID();
svc.access.set(`${CELEBRATION}:${hostSub}`, 'MANAGE');
const host = token(hostSub);
const call = (m, p, o) => svc.call(m, `/celebrations/${CELEBRATION}${p}`, { as: host, ...o });
assertStatus(await call('POST', '/gift-list'), 201);
const add = async (listingId, idea, quantity, groupGiftEnabled = false) =>
  assertStatus(await call('POST', '/items/batch', { body: { items: [{ productListingId: listingId, giftIdeaCode: idea, quantity, groupGiftEnabled }] }, headers: { 'idempotency-key': `k-${randomUUID()}` } }), 201).body.items[0];
const a = await add(catalogue[1].listingId, 'TABLEWARE', 2, true);   // will go UNAVAILABLE (OUT_OF_STOCK)
const b = await add(catalogue[2].listingId, 'KITCHEN_APPLIANCE', 1); // stays available
const c = await add(catalogue[4].listingId, 'COOKWARE', 1);          // will go UNAVAILABLE (UNPUBLISHED) with an empty idea catalogue
const source = { forIdea };
const store = new PostgresListingAvailabilityStore(db.pool, source, 3);
const event = (listingId, reason) => parseListingAvailabilityEvent({
  eventId: randomUUID(), eventType: 'provider.listing.availability-changed.v1', eventVersion: 1, occurredAt: new Date().toISOString(), producer: 'provider-catalog-service', correlationId: randomUUID(),
  tenant: { celebrationId: null }, actor: { type: 'USER', id: randomUUID() },
  payload: { listingId, providerId: randomUUID(), available: false, reason, previousAvailable: true, unavailableVariants: [], title: 'Producto', occurredAt: new Date().toISOString() },
});
const r1 = await store.apply(event(catalogue[1].listingId, 'OUT_OF_STOCK'));
const r2 = await store.apply(event(catalogue[4].listingId, 'UNPUBLISHED'));
const guest = svc.guestLinks.issue(CELEBRATION);
const world = { base: svc.base, celebrationId: CELEBRATION, hostToken: host, guestSecret: guest.secret, items: { dead: a.id, alive: b.id, deadNoReplacements: c.id }, catalogue, applied: [r1, r2] };
writeFileSync('/var/tmp/r7-live/world.json', JSON.stringify(world, null, 1));
console.log('READY', JSON.stringify({ base: svc.base, applied: [r1, r2] }));
process.on('SIGTERM', async () => { await svc.close(); await db.drop(); process.exit(0); });
// The test JWT lives 15 minutes: a fresh one is written every 4 minutes for the gateway to read.
setInterval(() => { world.hostToken = token(hostSub); writeFileSync('/var/tmp/r7-live/world.json', JSON.stringify(world, null, 1)); }, 240_000);
