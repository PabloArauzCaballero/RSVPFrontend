// Minimal path-router standing in for Kong (NOT Kong): the same prefixes as infra/kong/kong.yml, CORS for the browser, no auth of its own.
import { createServer, request } from 'node:http';
const T = { gift: [55854, true], provider: [55855, false], stub: [55853, false] };
const route = (p) => p.startsWith('/gifts') ? T.gift : (p.startsWith('/listings') || p.startsWith('/r/') || p.startsWith('/providers') || p.startsWith('/private')) ? T.provider : T.stub;
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type,idempotency-key,x-correlation-id,x-session-id', 'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS', 'access-control-expose-headers': 'retry-after,x-correlation-id,location' };
createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  const [port, strip] = route(req.url);
  const path = strip ? req.url.replace(/^\/gifts/, '') || '/' : req.url;
  const up = request({ host: '127.0.0.1', port, path, method: req.method, headers: { ...req.headers, host: `127.0.0.1:${port}` } }, (r) => { res.writeHead(r.statusCode, { ...r.headers, ...CORS }); r.pipe(res); });
  up.on('error', () => { res.writeHead(502, CORS); res.end(); });
  req.pipe(up);
}).listen(55850, '127.0.0.1');
