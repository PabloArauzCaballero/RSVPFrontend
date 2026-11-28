// Harness of the BE side of the live run: copy it to apps/provider-catalog-service/test/ of the BE at e2ea4cfb (it reuses test/support.mjs), build the service and run
//   PROVIDER_IT_SHARED_POSTGRES_URL=postgresql://postgres@127.0.0.1:55701/postgres node test/r8b-fe-harness.mjs <state.json>
// It starts the REAL provider-catalog service on PostgreSQL 16 with the production migrations, seeds one verified provider with 3 published products
// and writes {baseUrl, admin, owner, providerId, ids}. The JWTs are signed by a throwaway key the service reads through its own JWKS route.
import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { createEnvironment, publishedProduct, token, verifiedProvider } from './support.mjs';
import { startS3StandIn } from './helpers/s3-stand-in.mjs';

const s3 = await startS3StandIn();
const env = await createEnvironment({ env: {
  PROVIDER_DOCS_S3_ENDPOINT: s3.endpoint, PROVIDER_DOCS_PUBLIC_ENDPOINT: s3.endpoint, PROVIDER_DOCS_S3_ACCESS_KEY: s3.accessKey, PROVIDER_DOCS_S3_SECRET_KEY: s3.secretKey,
  PROVIDER_MEDIA_BUCKET: `r8b-fe-${randomUUID().slice(0, 8)}`,
} });
const provider = await verifiedProvider(env, { name: 'Flores Sol' });
const ids = [];
for (const title of ['Ramo de rosas', 'Torta de tres leches', 'Caja de chocolates']) ids.push(await publishedProduct(env, provider, { titles: { 'es-BO': title, 'en-US': title } }));
writeFileSync(process.argv[2], JSON.stringify({ baseUrl: env.runtime.address, admin: token(randomUUID(), ['ADMIN']), owner: provider.owner, providerId: provider.id, ids }));
console.log('READY', env.runtime.address);
setInterval(() => undefined, 1 << 30);
