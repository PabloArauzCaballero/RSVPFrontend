import { readFileSync, writeFileSync } from 'node:fs';
const st = JSON.parse(readFileSync(`${process.env.R6B_DIR ?? '/var/tmp/r6b'}/state.json`, 'utf8'));
const call = async (method, path, { token = st.tokenA, body, headers = {} } = {}) => { const r = await fetch('http://localhost:8000' + path, { method, headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); return { status: r.status, body: t ? JSON.parse(t) : undefined, headers: r.headers }; };
const base = `/providers/${st.A.providerId}/listings/${st.product}`;
let sheet = (await call('GET', base)).body;
const patch = async (body) => { const r = await call('PATCH', base, { body, headers: { 'if-match': `"${sheet.version}"` } }); if (r.status !== 200) throw new Error('patch ' + r.status + JSON.stringify(r.body)); sheet = r.body; };
await patch({ descriptions: { 'es-BO': 'Seis copas de cristal para brindar.' }, giftIdeas: ['GLASSWARE'], priceMinor: 35000, stock: 'AVAILABLE', delivery: { coverageCities: ['la-paz'], leadTimeDays: 3, shippingCostMinor: 0, pickupAvailable: false } });
const bytes = readFileSync(`${process.env.R6B_DIR ?? '/var/tmp/r6b'}/foto.jpg`);
const up = await call(`POST`, `${base}/photos/uploads`, { body: { contentType: 'image/jpeg', bytes: bytes.length } });
if (up.status !== 201) throw new Error('upload ' + JSON.stringify(up.body));
const put = await fetch(up.body.upload.url, { method: up.body.upload.method, headers: up.body.upload.headers, body: bytes });
console.log('PUT', put.status);
console.log('complete', (await call('POST', `${base}/photos/${up.body.id}/complete`)).status);
for (let i = 0; i < 30; i++) { sheet = (await call('GET', base)).body; if (sheet.photos?.[0]?.status === 'READY' || sheet.photos?.[0]?.status === 'REJECTED') break; await new Promise((r) => setTimeout(r, 1000)); }
console.log('photo', sheet.photos?.[0]?.status, sheet.photos?.[0]?.rejectReason, sheet.completeness, JSON.stringify(sheet.missing));
const pub = await call('POST', `${base}/publish`); console.log('publish', pub.status, JSON.stringify(pub.body).slice(0, 200));
