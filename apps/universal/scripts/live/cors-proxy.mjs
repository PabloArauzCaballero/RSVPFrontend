// Reverse proxy with CORS for a live run: the browser at localhost:<expo> talks to a backend service that, in production, sits behind Kong
// (which owns CORS). It forwards every request byte for byte to TARGET and only adds the CORS headers. No response is faked.
//   TARGET=http://127.0.0.1:43575 PORT=28010 ALLOW_ORIGIN=http://localhost:8081 node apps/universal/scripts/live/cors-proxy.mjs
import { createServer, request } from "node:http";

const target = new URL(process.env.TARGET ?? "");
const port = Number(process.env.PORT ?? 28010);
/** Only a localhost origin is allowed (the Expo web app of the run); the one origin is named explicitly, never "*" and never a reflected foreign origin. */
const allowedOrigin = process.env.ALLOW_ORIGIN ?? "http://localhost:8081";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(allowedOrigin)) throw new Error(`ALLOW_ORIGIN must be a localhost origin, got ${allowedOrigin}`);
/** The client sends credentials ("include"), so the allowed origin is named and the requested headers are allowed as asked. */
const corsFor = (req) => ({ "access-control-allow-origin": req.headers.origin === allowedOrigin ? allowedOrigin : "null", "access-control-allow-credentials": "true", "access-control-allow-headers": req.headers["access-control-request-headers"] ?? "*", "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "access-control-expose-headers": "etag,retry-after,x-correlation-id", vary: "origin" });
createServer((req, res) => {
  const cors = corsFor(req);
  if (req.method === "OPTIONS") { res.writeHead(204, cors); res.end(); return; }
  const upstream = request({ hostname: target.hostname, port: target.port, path: req.url, method: req.method, headers: { ...req.headers, host: target.host } }, (answer) => { res.writeHead(answer.statusCode ?? 502, { ...answer.headers, ...cors }); answer.pipe(res); });
  upstream.on("error", () => { res.writeHead(502, cors); res.end(); });
  req.pipe(upstream);
}).listen(port, "127.0.0.1", () => console.log(`proxy :${port} -> ${target.origin}`));
