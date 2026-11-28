// Hybrid gateway for the R7 walkthrough: `/gifts/*` goes to the REAL gift-list-service (host JWT swapped in for the app's dev token);
// everything else (celebration, event types, session) is the FE contract mock, which is NOT the real backend.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createContractMock, seedDemo } from "/home/user/RSVPFrontend/packages/testing/src/contract-mock.ts";
import { ALLOWED_HEADERS } from "/home/user/RSVPFrontend/packages/testing/src/contract-server.ts";

const mock = createContractMock({ now: () => new Date("2026-11-27T15:00:00.000Z") });
seedDemo(mock);
const world = () => JSON.parse(readFileSync("/var/tmp/r7-live/world.json", "utf8"));
let blackout: "" | "network" | "503" = "";
const log: string[] = [];
const server = createServer((request, response) => {
  const origin = request.headers.origin ?? "*";
  const cors = { "access-control-allow-origin": origin, "access-control-allow-credentials": "true", "access-control-allow-headers": ALLOWED_HEADERS, "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS" };
  if (request.method === "OPTIONS") { response.writeHead(204, cors).end(); return; }
  const url = new URL(request.url ?? "/", "http://x");
  if (url.pathname === "/__r7/blackout") { blackout = (url.searchParams.get("mode") ?? "") as typeof blackout; response.writeHead(204, cors).end(); return; }
  if (url.pathname === "/__r7/log") { response.writeHead(200, { ...cors, "content-type": "application/json" }).end(JSON.stringify(log)); return; }
  if (url.pathname === "/identity/auth/refresh" || url.pathname === "/identity/auth/login") {
    // Session of the walkthrough: a host whose token carries the claims the app reads. Gift List never sees it: `/gifts/*` swaps in a real signed JWT.
    response.writeHead(200, { ...cors, "content-type": "application/json" }).end(JSON.stringify({ accessToken: readFileSync("/var/tmp/r7-live/devtoken", "utf8").trim(), refreshToken: "", expiresIn: 3600, tokenType: "Bearer" }));
    return;
  }
  const chunks: Buffer[] = [];
  request.on("data", (c: Buffer) => chunks.push(c));
  request.on("end", async () => {
    const text = Buffer.concat(chunks).toString("utf8");
    if (url.pathname.startsWith("/gifts/")) {
      log.push(`${request.method} ${url.pathname}${url.search}`);
      if (blackout === "network" && url.pathname.endsWith("/replacements")) { request.socket.destroy(); return; }
      if (blackout === "503" && url.pathname.endsWith("/replacements")) { response.writeHead(503, { ...cors, "content-type": "application/problem+json" }).end(JSON.stringify({ title: "Unavailable", status: 503, code: "DEPENDENCY_UNAVAILABLE" })); return; }
      const w = world();
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(request.headers)) if (typeof v === "string" && !["host", "origin", "referer", "connection", "content-length"].includes(k)) headers[k] = v;
      if ((headers["authorization"] ?? "").includes("eyJhbGciOiJub25l")) headers["authorization"] = `Bearer ${w.hostToken}`;
      const upstream = await fetch(w.base + url.pathname.slice("/gifts".length) + url.search, { method: request.method, headers, ...(text ? { body: text } : {}) });
      const body = await upstream.text();
      const out: Record<string, string> = { ...cors };
      upstream.headers.forEach((v, k) => { if (!["content-length", "transfer-encoding", "connection", "content-encoding"].includes(k)) out[k] = v; });
      response.writeHead(upstream.status, out).end(body);
      return;
    }
    const reply = mock.handle({ method: request.method ?? "GET", path: request.url ?? "/", headers: Object.fromEntries(Object.entries(request.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v])), body: text ? JSON.parse(text) : undefined });
    response.writeHead(reply.status, { ...cors, ...reply.headers });
    response.end(reply.body === undefined || reply.body === null ? undefined : JSON.stringify(reply.body));
  });
});
server.listen(28300, () => console.log("gateway on 28300"));
