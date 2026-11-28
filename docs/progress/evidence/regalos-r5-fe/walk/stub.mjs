// Stand-in for the two peers this walk does not run (Celebration and Guest): same paths and shapes the real clients read (as in the BE walk of R5).
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
const CID = process.env.WALK_CELEBRATION_ID;
const uuidOf = (s) => { const h = createHash('sha256').update(s).digest('hex'); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`; };
const send = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(body === undefined ? '' : JSON.stringify(body)); };
createServer((req, res) => {
  const url = new URL(req.url, 'http://x'); const auth = req.headers.authorization ?? ''; const token = auth.slice(7);
  let m;
  if (url.pathname === '/jwks') return send(res, 200, JSON.parse(process.env.WALK_JWKS));
  if ((m = /^\/celebrations\/public\/([a-z0-9-]+)$/.exec(url.pathname))) return m[1] === 'ana-y-luis' ? send(res, 200, { celebrationId: CID, slug: 'ana-y-luis', timeZone: 'America/La_Paz', enabledSections: ['gifts'], content: { title: 'Boda de Ana y Luis', eventDate: '2026-12-13T02:00:00Z' } }) : send(res, 404);
  if ((m = /^\/celebrations\/([0-9a-f-]{36})$/.exec(url.pathname))) return token.split('.').length === 3 && m[1] === CID ? send(res, 200, { id: CID, access: 'MANAGE' }) : send(res, 401);
  if ((m = /^\/rsvp\/celebrations\/([0-9a-f-]{36})\/guest$/.exec(url.pathname))) return /^wg[A-Za-z0-9_-]{41}$/.test(token) ? send(res, 200, { celebrationId: m[1], guestId: uuidOf(token) }) : send(res, 401);
  if ((m = /^\/rsvp\/celebrations\/([0-9a-f-]{36})\/rsvp$/.exec(url.pathname))) return /^wg[A-Za-z0-9_-]{41}$/.test(token) ? send(res, 200, { celebrationId: m[1], guestId: uuidOf(token), status: 'CONFIRMED', version: 1 }) : send(res, 401);
  send(res, 404);
}).listen(Number(process.env.STUB_PORT ?? 55853), '127.0.0.1');
