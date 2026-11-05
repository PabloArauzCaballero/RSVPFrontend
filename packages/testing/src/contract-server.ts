import { createServer, type Server } from "node:http";
import type { ContractMock } from "./contract-mock.js";

/**
 * Serves a ContractMock over HTTP with CORS (what Kong's cors plugin allows), so a browser test can run a real
 * page against contract-shaped answers. `POST /__mock/offline?on=1` cuts the network (answers 503 with no CORS
 * headers like a dead gateway) and `/__mock/reset-offline` restores it.
 */
export function serveContractMock(mock: ContractMock, port: number): Promise<{ server: Server; url: string; setOffline: (value: boolean) => void }> {
  let offline = false;
  const server = createServer((request, response) => {
    const origin = request.headers.origin ?? "*";
    const cors = { "access-control-allow-origin": origin, "access-control-allow-credentials": "true", "access-control-allow-headers": "authorization,content-type,x-correlation-id,idempotency-key,accept-language,if-match", "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "access-control-expose-headers": "x-correlation-id,retry-after" };
    if (request.method === "OPTIONS") { response.writeHead(204, cors).end(); return; }
    if (request.url?.startsWith("/__mock/offline")) { offline = new URL(request.url, "http://x").searchParams.get("on") === "1"; response.writeHead(204, cors).end(); return; }
    if (offline) { request.destroy(); return; }
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      const headers: Record<string, string | undefined> = {};
      for (const [key, value] of Object.entries(request.headers)) headers[key] = Array.isArray(value) ? value.join(",") : value;
      const reply = mock.handle({ method: request.method ?? "GET", path: request.url ?? "/", headers, body: text ? JSON.parse(text) : undefined });
      response.writeHead(reply.status, { ...cors, ...reply.headers });
      response.end(reply.body === undefined || reply.body === null ? undefined : JSON.stringify(reply.body));
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve({ server, url: `http://localhost:${port}`, setOffline: (value) => { offline = value; } })));
}
