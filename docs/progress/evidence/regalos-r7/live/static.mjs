import { createServer, request as httpRequest } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
const ROOT = "/var/tmp/r7-live/web-build";
const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".woff2": "font/woff2", ".ico": "image/x-icon", ".map": "application/json" };
// Same-origin like the web image's nginx: /api/* goes to the walkthrough gateway (which fronts the REAL gift-list-service for /gifts/*).
createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  if (u.pathname.startsWith("/api/")) {
    const proxied = httpRequest({ host: "127.0.0.1", port: 28300, path: u.pathname.slice(4) + u.search, method: req.method, headers: { ...req.headers, host: "127.0.0.1:28300" } }, (up) => { res.writeHead(up.statusCode, up.headers); up.pipe(res); });
    proxied.on("error", () => { res.destroy(); });
    req.pipe(proxied);
    return;
  }
  const path = decodeURIComponent(u.pathname);
  let file = join(ROOT, path);
  if (!existsSync(file) || statSync(file).isDirectory()) { const html = join(ROOT, path.replace(/\/$/, "") + ".html"); file = existsSync(html) ? html : join(ROOT, "index.html"); }
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
}).listen(8310, () => console.log("static on 8310"));
