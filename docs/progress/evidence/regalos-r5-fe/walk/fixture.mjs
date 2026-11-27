// Fixture through the gateway stand-in: a VERIFIED provider with one PUBLISHED product (store page + WhatsApp), and in the celebration's gift list a plain gift
// of 12 units and a coordinated gift. Same calls as the BE walk of R5 (walk.mjs); here only to give the browser walk something real to open.
import { createSign, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const GW = 'http://127.0.0.1:55850';
const CID = readFileSync('cid.txt', 'utf8').trim();
const privateKey = readFileSync('private.pem', 'utf8');
const token = (roles, sub = randomUUID()) => {
  const h = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'walk-1', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const p = Buffer.from(JSON.stringify({ sub, roles, iss: 'walk-issuer', iat: now, exp: now + 3000 })).toString('base64url');
  return `${h}.${p}.${createSign('RSA-SHA256').update(`${h}.${p}`).sign(privateKey).toString('base64url')}`;
};
const psql = (db, q) => execFileSync('docker', ['exec', '-e', 'PGPASSWORD=local-postgres-password', 'fe-r5-pg', 'psql', '-U', 'postgres', '-d', db, '-Atc', q], { encoding: 'utf8' }).trim();
async function call(method, path, { auth, body, expect, headers = {} } = {}) {
  const r = await fetch(GW + path, { method, headers: { 'user-agent': 'Mozilla/5.0 Chrome/130', ...(auth ? { authorization: `Bearer ${auth}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); const json = text ? JSON.parse(text) : undefined;
  if (expect && !(Array.isArray(expect) ? expect : [expect]).includes(r.status)) throw new Error(`${method} ${path} -> ${r.status} ${text.slice(0, 300)}`);
  return json;
}
const admin = token(['ADMIN']), owner = token(['PROVIDER']), host = token(['USER']);
const prov = await call('POST', '/providers', { auth: owner, body: { name: 'Tortas Walk ' + Date.now(), timeZone: 'America/La_Paz' }, expect: 201 });
await call('POST', `/providers/${prov.id}/submit`, { auth: owner, expect: 200 });
await call('POST', `/providers/${prov.id}/verify`, { auth: admin, expect: 200 });
const created = await call('POST', `/providers/${prov.id}/listings`, { auth: owner, expect: 201, headers: { 'idempotency-key': randomUUID() }, body: {
  type: 'PRODUCT', category: 'TABLEWARE', city: 'cochabamba', titles: { 'es-BO': 'Vajilla Walk R5', 'en-US': 'Walk R5 dinner set' },
  descriptions: { 'es-BO': 'Juego de vajilla de porcelana blanca para seis personas, 24 piezas.', 'en-US': 'White porcelain dinner set for six, 24 pieces.' }, destinations: { PRODUCT_PAGE: 'https://partner.example/vajilla', WHATSAPP: 'https://wa.me/59170000000' },
  priceMinor: 45000, stock: 'AVAILABLE', giftIdeas: ['DINNERWARE_SET'], delivery: { coverageCities: ['cochabamba'], leadTimeDays: 3, shippingCostMinor: 0 } } });
const listingId = created.id, photo = randomUUID();
const rend = (s, w) => `{"key":"public/providers/${prov.id}/listings/${listingId}/${photo}/${s}.webp","width":${w},"height":${Math.round(w * 2 / 3)},"bytes":1000}`;
psql('provider_db', `SELECT set_config('app.scope','system',false); INSERT INTO listing_photo (id, listing_id, provider_id, status, content_type, declared_bytes, storage_key, variants, stored_bytes, position, uploaded_at, processed_at) VALUES ('${photo}','${listingId}','${prov.id}','READY','image/jpeg',4000,'uploads/providers/${prov.id}/listings/${listingId}/${photo}','{"thumb":${rend('thumb', 160)},"card":${rend('card', 480)},"full":${rend('full', 1280)}}',3000,0,now(),now())`);
await call('POST', `/providers/${prov.id}/listings/${listingId}/publish`, { auth: owner, expect: 200 });
const G = `/gifts/celebrations/${CID}`;
await call('POST', `${G}/gift-list`, { auth: host, expect: [201, 409] });
const add = (title) => call('POST', `${G}/items`, { auth: host, expect: 201, body: { source: 'CATALOGED', title, price: { amountMinor: 45000, currency: 'BOB' }, productListingId: listingId } });
const plain = await add('Vajilla Walk R5');
const plain12 = await call('PATCH', `${G}/items/${plain.id}`, { auth: host, expect: 200, body: { version: plain.version, quantity: 12 } });
const group = await add('Vajilla Walk R5');
const group1 = await call('PATCH', `${G}/items/${group.id}`, { auth: host, expect: 200, body: { version: group.version, groupGiftEnabled: true } });
const gt = (name) => 'wg' + Buffer.from(name.padEnd(32, 'x')).toString('base64url').slice(0, 41).padEnd(41, 'A');
writeFileSync('fixture.json', JSON.stringify({ cid: CID, listingId, plainId: plain12.id, groupId: group1.id, quantity: plain12.quantity, group: group1.groupGiftEnabled, guests: { ana: gt('ana'), beto: gt('beto'), carla: gt('carla') } }, null, 1));
console.log(JSON.stringify({ listingId, plain: [plain12.id, plain12.quantity], group: [group1.id, group1.groupGiftEnabled] }));
