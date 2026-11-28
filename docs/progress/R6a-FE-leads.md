# R6a FE · `ctx` del miembro en los enlaces `/r/` y superficie PREVIEW (FE #147)

Fuera de carril; sigue §5.9 del plan y la sección «Pendiente FE» de BE #158. Contrato pinneado a BE `b44a5cb3` (provider-catalog 3.8.0, gift-list 1.16.0, celebration 1.6.0; el lock apunta a un merge de rama de BE aún sin fusionar, regenerar con el SHA oficial tras fusionar BE #158). Nivel: **TESTED** (jsdom, red simulada); el recorrido real se hizo sobre una punta anterior (ver abajo). No VERIFIED sobre la punta actual.

## Qué hay y qué no
- Cableado hecho y probado: `ctx` en `partnerRedirectHref`, `PartnerLink` (solo al navegar, nunca en el `href`), `partnerRedirectUrl` (app); renovación del `ctx` en `useGiftList` con `refreshLeadContext` (intervalo 240 s, `refetchOnWindowFocus: "always"` y `AppState` en Expo); `resolveRedirect` filtra un `ctx` de más de 512 caracteres o malformado; la página de error de `/r/` quita `ctx` de la URL visible.
- **En producción ninguna pantalla recibe hoy un `ctx`:** las lecturas son de invitado y Gift devuelve `leadContext: null`. `refreshLeadContext` no tiene llamador hasta que exista la pantalla de miembro (decisión de Pablo 1).
- **`HIDDEN`:** una página oculta por moderación ya no se muestra como «Publicando…»; `publish-checklist.tsx` muestra `host.publish.live.HIDDEN` (existe en es-BO y en-US). Este PR no cambia esa pantalla; queda abierto solo el copy definitivo y la UI de moderación (decisión de Pablo).
- Portal (R6b FE, aparte): I-6 `eventType` en `CONTEXT_KEYS`, `POST /providers/{id}/lead-context` (PROVIDER_OWNER / PREVIEW de 15 min), A35.

## Límites conocidos de `window.open` en `PartnerLink`
Un bloqueo de pop-up no se puede detectar (`noopener` devuelve null); en Safari el clic medio abre el `href` sin `ctx`; un clic antes de la hidratación navega sin `ctx`. Los tres caen a un clic sin contexto de miembro, nunca a una filtración del `ctx`.

## Comandos y resultados (ronda 5, sobre la punta de esta rama, 2026-11-28)
| Comando | Resultado |
|---|---|
| `yarn install --immutable` | exit 0 |
| `yarn typecheck` | exit 0, 19/19 |
| `yarn lint` | exit 0, 19/19 |
| `yarn workspace @rsvp/contracts check:generated` | exit 0, 8 contratos en `b44a5cb35f1a` (provider-catalog 3.8.0, gift-list 1.16.0) |
| `@rsvp/query-hooks` / `@rsvp/ui-web` / `@rsvp/seo-web` `test` | exit 0: 216 (18 archivos) / 22 (1) / 243 (27) |
| `@rsvp/universal` `test` (suite completa) | exit 1: 859 de 861 pasan; fallan por tiempo agotado bajo carga `guest-gifts-mirror.test.tsx` (WhatsApp por el redirector) y `provider-admin-buttons.test.tsx` (renombrar); ejecutados solos, exit 0: 23/23 y 28/28. No se repitió la suite completa |
| `yarn workspace @rsvp/seo-web build` | exit 0 |

## Qué no se corrió en esta ronda
- **gitleaks:** no está instalado en este entorno; el último resultado (`no leaks found`) es de la ronda anterior sobre `fbc73c27` y no cubre los commits posteriores. Lo repite el CI (job de secretos) y debe repetirse antes de fusionar.
- **Recorrido real (Playwright con Chrome contra el backend real):** no se repitió; este entorno no tiene Docker. La única ejecución real fue sobre `fbc73c27` contra BE `d3b4b50e` (provider-catalog 3.7.0). Contra BE `b44a5cb3` (3.8.0) los casos 1, 2, 4 y 5 siguen **sin repetir**. El caso 3 salió `ok: false` en esa ejecución porque la expectativa era errónea: el contrato 3.8.0 registra `surface=PREVIEW` como lead inválido con motivo `PREVIEW` (observado). Se corrigieron los comentarios y la expectativa del guion `recorrido-real.mjs`; `resultados.json` conserva la salida original con la nota de divergencia. Hasta repetirlo, este caso no está verificado con la expectativa nueva.
- Playwright 360/768/1280 en claro/oscuro, `es-BO`/`en-US`, axe y comparación visual; la página de error de `/r` solo se vio en 1280 claro y 360 claro/oscuro, en `es-BO`. iOS y Android reales (la suscripción a `AppState` se prueba con un `AppState` simulado).
- `.gitleaksignore` ignora 2 huellas exactas de `ca4e81b0` (fixture falso con forma de JWT, corregido en `9918fdfd`). Preferible: squash al fusionar y quitar el archivo (pregunta 4 del PR).

## Sin implementar (decisión de Pablo o de otro PR)
- **PREVIEW sin token (M1):** hoy cualquiera puede añadir `surface=PREVIEW` a un enlace y generar clics no cobrados (subcobra). Restringirlo al `ctx` del portal llega con BE R6b (#166); este PR no pinea a #166. Decisión abierta para Pablo: aceptar el riesgo hasta #166 o condicionar la fusión.
- **Sin llamador de `refreshLeadContext` (m1):** ninguna pantalla real lo activa; el objetivo «el clic del miembro no se cobra» no se cumple en producción hasta que exista la pantalla de miembro. Decisión 1 del PR.
- **`useAppStateFocus` global en Expo (m2):** cambia la relectura de toda consulta al volver de segundo plano. Separarlo en su propio PR con prueba de regresión, o activarlo con el llamador, es decisión de Pablo.
- **TTL (m3):** el intervalo de 240 s exige un `GIFT_LEAD_CONTEXT_TTL_SECONDS` de al menos 300 s (documentado en `query-hooks/src/gift/index.ts`). Derivarlo de un `leadContextExpiresAt` requiere un cambio de contrato en BE (decisión 5 del PR).

## Reversión
Revertir el PR. Sin `ctx` los clics de miembros se cobran como antes. Los contratos vuelven por sí solos al lock de la base (`188d08f8`, BE #157); no hace falta ejecutar `generate`.

## Hallazgo del recorrido real contra BE `fc68da23` (2026-11-28)
- La cabecera `Referrer-Policy: no-referrer` que `route.ts` pone en la página de error de `/r/` **no llega al navegador**: la regla global de `next.config.js` (`strict-origin-when-cross-origin`) la reemplaza (observado con `next start` real; el test de la ruta solo miraba la respuesta del handler). No se cambia la regla global porque también afectaría al 302 y con ello lo que ve el proveedor. Corrección: la página lleva `<meta name="referrer" content="no-referrer">` y una prueba lo exige. Con la política servida (origen solo en cruces de sitio) el `ctx` no sale por Referer a otros orígenes, pero la defensa documentada ahora sí existe.
- Corrección de la expectativa del caso 3 con BE de la cadena (#166, R6b): `surface=PREVIEW` sin `ctx` de vista previa ya NO se registra como inválido `PREVIEW`: se ignora y el clic cuenta como de visitante normal; con el `ctx` PREVIEW del dueño sí queda inválido `PREVIEW`; `ctx` PROVIDER_OWNER del dueño queda `PROVIDER_SELF`.
