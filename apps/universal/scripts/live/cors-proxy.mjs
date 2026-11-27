// Reverse proxy with CORS for a live run: the browser at localhost:<expo> talks to a backend service that, in production, sits behind Kong
// (which owns CORS). It forwards every request byte for byte to TARGET and only adds the CORS headers. No response is faked.
//   TARGET=http://127.0.0.1:43575 PORT=28010 node apps/universal/scripts/live/cors-proxy.mjs
import { createServer, request } from "node:http";

const target = new URL(process.env.TARGET ?? "");
const port = Number(process.env.PORT ?? 28010);
/** Only the app under test may call through it (same value as APP of admin-productos.mjs). */
const allowed = process.env.APP ?? "http://localhost:8320";
/** The client sends credentials ("include"), so the origin is echoed only when it is the allowed app (never "*") and the requested headers are allowed as asked. */
const corsFor = (req) => ({ "access-control-allow-origin": req.headers.origin === allowed ? allowed : "null", "access-control-allow-credentials": "true", "access-control-allow-headers": req.headers["access-control-request-headers"] ?? "*", "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "access-control-expose-headers": "etag,retry-after,x-correlation-id", vary: "origin" });
createServer((req, res) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") { res.writeHead(204, cors); res.end(); return; }
  const upstream = request({ hostname: target.hostname, port: target.port, path: req.url, method: req.method, headers: { ...req.headers, host: target.host } }, (answer) => { res.writeHead(answer.statusCode ?? 502, { ...answer.headers, ...cors }); answer.pipe(res); });
  upstream.on("error", () => { res.writeHead(502, cors); res.end(); });
  req.pipe(upstream);
}).listen(port, "127.0.0.1", () => console.log(`proxy :${port} -> ${target.origin}`));
