// Local stack for the live run of the 4-step sign-up: the REAL Identity jar (Postgres, Redis, RabbitMQ) + the REAL Notification consumer
// (outbox -> RabbitMQ -> template -> ResendChannel). Only api.resend.com is replaced by a local HTTP stand-in that keeps the mails.
// There is no Kong here (no Docker): a small proxy plays its two roles that the browser needs, "/identity/*" -> Identity and CORS.
// It also serves GET /__test/mail?to=<address> (the last mail the stand-in received), used ONLY by the test to read the code
// the way a person reads it in their mailbox.
//
//   BACKEND_DIR=<RSVPBackend clone, built: identity jar + notification dist + node_modules> \
//   PG_ADMIN_URL=postgresql://<admin>:<password>@127.0.0.1:5432/postgres IDENTITY_DB_PASSWORD=<password of the identity role> \
//   ALLOW_ORIGIN=http://localhost:18101 PORT=18100 node apps/universal/scripts/live/registro-backend-local.mjs
//
// Prints "READY <api origin>" when the stack accepts requests and stops cleanly on SIGINT/SIGTERM (drops its databases and queues).
// Every secret of the run is generated per run; the Postgres admin URL and the password of Identity's database role come from the environment
// (PG_ADMIN_URL, IDENTITY_DB_PASSWORD) and are never printed or defaulted: the run stops if either is missing.
import { createRequire } from "node:module";
import { createServer, request as httpRequest } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";

const backend = process.env.BACKEND_DIR;
const adminUrl = process.env.PG_ADMIN_URL;
const identityPassword = process.env.IDENTITY_DB_PASSWORD;
if (!backend || !adminUrl || !identityPassword) throw new Error("Set BACKEND_DIR, PG_ADMIN_URL and IDENTITY_DB_PASSWORD");
const port = Number(process.env.PORT ?? 18100);
const identityPort = Number(process.env.IDENTITY_PORT ?? port + 80);
const allowedOrigin = process.env.ALLOW_ORIGIN ?? "http://localhost:18101";
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(allowedOrigin)) throw new Error(`ALLOW_ORIGIN must be a localhost origin, got ${allowedOrigin}`);
const rabbit = process.env.RABBITMQ_URL ?? "amqp://guest:guest@127.0.0.1:5672";
const redis = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
const require = createRequire(`${backend}/apps/notification-service/package.json`);
const pg = require("pg");
const N = `${backend}/apps/notification-service/dist/`;
const { migrate } = await import(N + "infrastructure/persistence/migrations.js");
const { PostgresNotificationStore, createNotificationPool } = await import(N + "infrastructure/persistence/notification-store.js");
const { ContactCipher } = await import(N + "infrastructure/persistence/contact-cipher.js");
const { NotificationBus } = await import(N + "infrastructure/messaging/business-bus.js");
const { ResendChannel } = await import(N + "infrastructure/channel/resend/index.js");
const { loadTemplates } = await import(N + "infrastructure/templates/catalog.js");

const run = randomUUID().replaceAll("-", "").slice(0, 12);
const admin = new pg.Pool({ connectionString: adminUrl });
const noticeName = `notice_fe4_${run}`, identityDb = `identity_fe4_${run}`;
const noticePassword = randomBytes(24).toString("hex");
await admin.query(`CREATE ROLE ${noticeName} LOGIN PASSWORD '${noticePassword}'`);
await admin.query(`CREATE DATABASE ${noticeName} OWNER ${noticeName}`);
// Identity's owner role is the same non-superuser role the backend evidence used (NOSUPERUSER NOCREATEDB NOCREATEROLE).
const identityRole = process.env.IDENTITY_DB_ROLE ?? "identity_owner";
await admin.query(`CREATE DATABASE ${identityDb} OWNER ${identityRole}`);
const noticeUrl = new URL(`postgresql://127.0.0.1:5432/${noticeName}`); noticeUrl.username = noticeName; noticeUrl.password = noticePassword;
const pool = createNotificationPool(noticeUrl.href); await migrate(pool);
const store = new PostgresNotificationStore(pool, new ContactCipher(randomBytes(32).toString("base64")));

const delivered = [];
const resend = createServer((req, res) => {
  let body = ""; req.on("data", (chunk) => { body += chunk; });
  req.on("end", () => { delivered.push({ at: Date.now(), mail: JSON.parse(body) }); res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ id: randomUUID() })); });
});
await new Promise((resolve) => resend.listen(0, "127.0.0.1", resolve));
const resendUrl = `http://127.0.0.1:${resend.address().port}`;
const channel = new ResendChannel({ apiKey: `re_local_${randomBytes(8).toString("hex")}`, from: "RSVP <notificaciones@example.invalid>" }, (url, init) => fetch(url.replace("https://api.resend.com", resendUrl), init));
const queue = `notification-service.registration-email.fe4-${run}`;
const bus = await NotificationBus.connect(rabbit, store, { queue: `${queue}.business`, erasureQueue: `${queue}.erasure`, registrationEmail: { channel, catalog: loadTemplates(), production: false, queue, log: () => undefined } });

const jar = `${backend}/apps/identity-service/build/libs/identity-service.jar`;
const identity = spawn("java", ["-jar", jar], {
  env: { ...process.env, PORT: String(identityPort), IDENTITY_ENVIRONMENT: "local", IDENTITY_DATABASE_URL: `jdbc:postgresql://127.0.0.1:5432/${identityDb}`, IDENTITY_DATABASE_USER: identityRole,
    IDENTITY_DATABASE_PASSWORD: identityPassword, IDENTITY_REDIS_URL: redis, IDENTITY_RABBITMQ_URL: rabbit,
    IDENTITY_PROFILE_ENCRYPTION_KEY: randomBytes(32).toString("base64"), IDENTITY_REGISTRATION_CODE_PEPPER: randomBytes(32).toString("hex"),
    IDENTITY_BCRYPT_STRENGTH: "4", IDENTITY_COOKIE_SECURE: "false", IDENTITY_OUTBOX_POLL_MS: "200", IDENTITY_PUBLIC_APP_URL: allowedOrigin }, stdio: ["ignore", "ignore", "ignore"]
});

const cors = (req) => ({ "access-control-allow-origin": req.headers.origin === allowedOrigin ? allowedOrigin : "null", "access-control-allow-credentials": "true", "access-control-allow-headers": req.headers["access-control-request-headers"] ?? "*", "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS", "access-control-expose-headers": "etag,retry-after,x-correlation-id", vary: "origin" });
const proxy = createServer((req, res) => {
  const headers = cors(req);
  if (req.method === "OPTIONS") { res.writeHead(204, headers); res.end(); return; }
  const url = new URL(req.url ?? "/", "http://x");
  if (url.pathname === "/__test/mail") {
    const to = url.searchParams.get("to") ?? "";
    const last = [...delivered].reverse().find((entry) => entry.mail.to.includes(to));
    res.writeHead(last ? 200 : 404, { ...headers, "content-type": "application/json" }); res.end(JSON.stringify(last ? { subject: last.mail.subject, text: last.mail.text, count: delivered.filter((entry) => entry.mail.to.includes(to)).length } : {})); return;
  }
  if (!url.pathname.startsWith("/identity/")) { res.writeHead(404, headers); res.end(); return; }
  const upstream = httpRequest({ hostname: "127.0.0.1", port: identityPort, path: req.url.replace(/^\/identity/, ""), method: req.method, headers: { ...req.headers, host: `127.0.0.1:${identityPort}` } },
    (answer) => { res.writeHead(answer.statusCode ?? 502, { ...answer.headers, ...headers }); answer.pipe(res); });
  upstream.on("error", () => { res.writeHead(502, headers); res.end(); });
  req.pipe(upstream);
});
await new Promise((resolve) => proxy.listen(port, "127.0.0.1", resolve));

const until = async (check, ms) => { const end = Date.now() + ms; for (;;) { if (await check()) return; if (Date.now() > end) throw new Error("Identity did not start"); await new Promise((resolve) => setTimeout(resolve, 300)); } };
await until(async () => { try { return (await fetch(`http://127.0.0.1:${identityPort}/.well-known/jwks.json`)).ok; } catch { return false; } }, 90000);
console.log(`READY http://127.0.0.1:${port}`);

let stopping = false;
async function stop() {
  if (stopping) return; stopping = true;
  identity.kill("SIGTERM"); proxy.close(); resend.close();
  await bus.close().catch(() => undefined); await pool.end().catch(() => undefined);
  try {
    const amqp = require("amqplib"); const connection = await amqp.connect(rabbit); const ch = await connection.createChannel();
    for (const name of [queue, `${queue}.business`, `${queue}.erasure`]) for (const suffix of ["", ".parking", ".retry.5000", ".retry.30000", ".retry.120000", ".retry.600000"]) await ch.deleteQueue(name + suffix).catch(() => undefined);
    await connection.close();
  } catch { /* the queues are named per run: a leftover is harmless */ }
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await admin.query(`DROP DATABASE IF EXISTS ${identityDb} WITH (FORCE)`).catch(() => undefined);
  await admin.query(`DROP DATABASE IF EXISTS ${noticeName} WITH (FORCE)`).catch(() => undefined);
  await admin.query(`DROP ROLE IF EXISTS ${noticeName}`).catch(() => undefined);
  await admin.end(); process.exit(0);
}
process.on("SIGINT", () => { void stop(); }); process.on("SIGTERM", () => { void stop(); });
