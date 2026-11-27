# R6a FE · `ctx` del miembro en los enlaces `/r/` y superficie PREVIEW (FE #147)

Fuera de carril; sigue §5.9 del plan y la sección «Pendiente FE» de BE #158. Contrato pinneado a BE `d3b4b50e` (provider-catalog 3.7.0, gift-list 1.16.0, celebration 1.6.0). Fecha de la evidencia: 2026-11-27. Nivel: **TESTED** (jsdom, red simulada). No VERIFIED.

## Qué hay y qué no
- Cableado hecho y probado: `ctx` en `partnerRedirectHref`, `PartnerLink` (solo al navegar, nunca en el `href`), `partnerRedirectUrl` (app); renovación del `ctx` en `useGiftList` con `refreshLeadContext` (intervalo 240 s, `refetchOnWindowFocus: "always"` y `AppState` en Expo); `resolveRedirect` filtra un `ctx` de más de 512 caracteres o malformado; la página de error de `/r/` quita `ctx` de la URL visible.
- **En producción ninguna pantalla recibe hoy un `ctx`:** las lecturas son de invitado y Gift devuelve `leadContext: null`. `refreshLeadContext` no tiene llamador hasta que exista la pantalla de miembro (decisión de Pablo 1).
- **`HIDDEN` sin texto (deliberado):** una página oculta por moderación ya no se muestra como «Publicando…», pero no hay copy ni UI hasta que Pablo decida el texto.
- Portal (R6b FE, aparte): I-6 `eventType` en `CONTEXT_KEYS`, `POST /providers/{id}/lead-context` (PROVIDER_OWNER / PREVIEW de 15 min), A35.

## Límites conocidos de `window.open` en `PartnerLink`
Un bloqueo de pop-up no se puede detectar (`noopener` devuelve null); en Safari el clic medio abre el `href` sin `ctx`; un clic antes de la hidratación navega sin `ctx`. Los tres caen a un clic sin contexto de miembro, nunca a una filtración del `ctx`.

## Comandos y resultados (sobre la punta de la rama tras esta ronda)
| Comando | Resultado |
|---|---|
| `corepack yarn typecheck` | exit 0, 19/19 |
| `corepack yarn lint` | exit 0, 19/19 |
| `corepack yarn workspace @rsvp/contracts check:generated` | exit 0, 8 contratos en `d3b4b50e3119` |
| query-hooks / ui-web / seo-web / universal `test` | exit 0: 177 (16 archivos) / 22 (1) / 222 (26) / 784 (62) |
| `corepack yarn workspace @rsvp/seo-web build` | exit 0 |
| `gitleaks git --log-opts="origin/chore/deploy-contabo-coolify..HEAD"` v8.28.0 | 44 commits en el rango (36 escaneados: gitleaks omite merges), no leaks found, con `.gitleaksignore` |
| `gitleaks git --log-opts="origin/feat/regalos-r2-ficha..HEAD"` | no leaks found, con `.gitleaksignore` |

`.gitleaksignore` ignora 2 huellas exactas de `ca4e81b0` (fixture de prueba falso con forma de JWT, corregido en `9918fdfd`); no se puede reescribir el historial.

## No probado
Playwright con Chrome real contra el backend real; 360/768/1280, claro/oscuro, axe y comparación visual (sin cambio visual); iOS y Android reales (la suscripción a `AppState` se prueba con un `AppState` simulado); suites completas de design-editor, celebration-theme, ui y auth sobre esta punta. El CI `affected` en rojo viene de los timeouts de design-editor (`versions.test.tsx`, FE #144) y de «Failed to resolve base ref».

## Reversión
Revertir el PR. Sin `ctx` los clics de miembros se cobran como antes. Contratos: `generate --ref c7599ae6542ea7210572e5226fad5a1b227f8a6d`.
