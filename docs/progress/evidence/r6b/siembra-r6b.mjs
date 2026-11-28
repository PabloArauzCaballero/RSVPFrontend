import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const gw = 'http://localhost:8000';
const PW = 'Correct-horse-9battery';
const call = async (method, path, { token, body, headers = {} } = {}) => {
  const r = await fetch(gw + path, { method, redirect: 'manual', headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = t ? JSON.parse(t) : undefined; } catch { j = t; }
  return { status: r.status, body: j, headers: r.headers };
};
const sql = (q) => execFileSync('docker', ['exec', 'rsvpbackend-postgres-1', 'psql', '-U', 'postgres', '-d', 'provider_db', '-tAc', q], { encoding: 'utf8' }).trim();
const account = async (email, role) => {
  let r = await call('POST', '/identity/auth/register', { body: { email, password: PW, role } });
  if (r.status !== 201) r = await call('POST', '/identity/auth/login', { body: { email, password: PW } });
  if (!r.body?.accessToken) throw new Error(`${email} ${r.status} ${JSON.stringify(r.body)}`);
  return (await call('POST', '/identity/auth/login', { body: { email, password: PW } })).body.accessToken;
};
const mk = async (token, name, title) => {
  const p = await call('POST', '/providers', { token, body: { name } });
  if (p.status !== 201) throw new Error(JSON.stringify(p));
  sql(`UPDATE provider SET status='VERIFIED', verified_at=now() WHERE id='${p.body.id}'`);
  const l = await call('POST', `/providers/${p.body.id}/listings`, { token, headers: { 'idempotency-key': crypto.randomUUID() }, body: { type: 'SERVICE', category: 'CATERING', city: 'la-paz', titles: { 'es-BO': title }, destinations: { WHATSAPP: 'https://wa.me/59170000000', OFFICIAL_SITE: 'https://catering.example' }, fulfillment: { responsible: 'PROVIDER', coverageZones: ['la-paz'], leadTimeDays: 2, conditions: { 'es-BO': 'Pedido previo' } } } });
  if (l.status !== 201) throw new Error('listing ' + JSON.stringify(l));
  const pub = await call('POST', `/providers/${p.body.id}/listings/${l.body.id}/publish`, { token });
  if (pub.status !== 200) throw new Error('publish ' + JSON.stringify(pub));
  return { providerId: p.body.id, listingId: l.body.id };
};
const tokenA = await account('r6b-prov-a@example.test', 'PROVIDER');
const tokenB = await account('r6b-prov-b@example.test', 'PROVIDER');
const tokenHost = await account('r6b-host@example.test', 'HOST');
const tokenAdmin = (await call('POST', '/identity/auth/login', { body: { email: 'e2e-admin@example.test', password: PW } })).body.accessToken;
const A = await mk(tokenA, 'Dulce Sol R6b', 'Catering Dulce Sol');
const B = await mk(tokenB, 'Flores Andes R6b', 'Catering Flores Andes');
const UA = (n) => `Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 visitor${n}`;
const click = async (listingId, q, n) => { const r = await call('GET', `/r/${listingId}?${q}`, { headers: { 'user-agent': UA(n), 'x-forwarded-for': `172.20.${n}.${n}` } }); return r.status; };
const out = {};
out.clicks = [];
for (const n of [1, 2, 3]) out.clicks.push(['WHATSAPP valid v' + n, await click(A.listingId, 'destination=WHATSAPP&surface=GIFT_LIST&eventType=WEDDING&city=la-paz', n)]);
out.clicks.push(['WHATSAPP dup v1', await click(A.listingId, 'destination=WHATSAPP&surface=GIFT_LIST&eventType=WEDDING&city=la-paz', 1)]);
out.clicks.push(['OFFICIAL_SITE valid v4', await click(A.listingId, 'destination=OFFICIAL_SITE&surface=GIFT_LIST&eventType=BIRTHDAY&city=la-paz', 4)]);
const owner = await call('POST', `/providers/${A.providerId}/lead-context`, { token: tokenA, body: { relation: 'PROVIDER_OWNER' } });
out.ownerCtx = owner.status;
out.clicks.push(['WHATSAPP owner ctx v5', await click(A.listingId, `destination=WHATSAPP&surface=APP&ctx=${owner.body.ctx}`, 5)]);
const prev = await call('POST', `/providers/${A.providerId}/lead-context`, { token: tokenA, body: { relation: 'PREVIEW', listingId: A.listingId } });
out.previewCtx = prev.status;
out.clicks.push(['WHATSAPP preview ctx v6', await click(A.listingId, `destination=WHATSAPP&surface=PREVIEW&ctx=${prev.body.ctx}`, 6)]);
out.clicks.push(['B WHATSAPP valid v7', await click(B.listingId, 'destination=WHATSAPP&surface=GIFT_LIST&eventType=WEDDING&city=la-paz', 7)]);
out.clicks.push(['B WHATSAPP valid v8', await click(B.listingId, 'destination=WHATSAPP&surface=GIFT_LIST&eventType=WEDDING&city=la-paz', 8)]);
writeFileSync(`${process.env.R6B_DIR ?? '/var/tmp/r6b'}/state.json`, JSON.stringify({ A, B, tokenA, tokenB, tokenHost, tokenAdmin }, null, 1));
console.log(JSON.stringify(out, null, 1));
