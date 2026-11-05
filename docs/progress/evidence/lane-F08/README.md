## Corrida 2026-11-05 · sitemap, Lighthouse tras el rediseño, /p y /r

Nivel alcanzado: **TESTED** (tests dirigidos) y **RUNS** (build + `next start` local). No es CI ni producción.

| REQ | Cambio | Comando / artefacto | Resultado |
|---|---|---|---|
| REQ-F08-05 | `app/sitemap.ts` añade `/p/{slug}` (proveedores verificados, paginando `GET /providers`); `robots.ts` también excluye `/proveedores/buscar`; `/r/` sigue excluido | `apps/seo-web/tests/partner.test.tsx` (3 tests de sitemap: rutas indexables presentes, sin `/r/`, `/rsvp`, `/buscar`, `/panel`, `/admin`, `/catalogo`; API caída; paginación acotada) y `redirect.test.ts` (robots) | PASS (vitest, 76 tests de seo-web verdes) |
| REQ-F08-04 | `LocalBusiness` ahora se usa en `/p/[slug]` (dirección, horarios, zona de servicio) | `partner.test.tsx` | PASS en test; no validado contra el validador de schema.org |
| REQ-F08-06 | Lighthouse (móvil 360x800, throttling simulado, Chrome local) re-medido en el sitio rediseñado | `audit.mjs`; JSON por ruta `lighthouse-*.json` (este carril: `lighthouse-home.json`, `lighthouse-home-fixture.json`); resumen `audit-live.json`, `audit-fixture.json` | SEO 100 en home, A1, A4 (live) y en home, A1-A8, B1-B3, microsite (fixture). Perf 90-100, a11y 98-100, best-practices 100. Las rutas `noindex` (buscar, partner 404/no disponible) puntúan SEO 63-66 a propósito |

Límites: en modo live el sitemap no lista partners porque `/providers` responde 503 detrás de Kong (el servicio Provider Catalog no tiene capa HTTP). El modo fixture usa `apps/seo-web/scripts/fixture-api.mjs` (no es el backend). La sitemap no incluye las 99 combinaciones categoría×ciudad (falta saber cuáles tienen contenido). REQ-F08-06 sigue PARTIAL: la medición no corre en CI.
