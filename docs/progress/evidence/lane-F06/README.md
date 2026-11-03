# F06 · i18n y formatos: evidencia (2026-11-03)

| REQ | Estado | Comando / artefacto | Resultado |
|---|---|---|---|
| REQ-F06-01 i18next en RN y Next | PASS (web y SSR; nativo no ejecutado) | `yarn workspace @rsvp/i18n test`; `yarn workspace @rsvp/seo-web build`; `expo export --platform web` | Mismo catálogo en `apps/universal` (react-i18next) y `apps/seo-web` (`@rsvp/i18n/server`); `/rsvp/[token]` renderiza en es-BO y en-US |
| REQ-F06-02 es-BO y en-US completos | PASS (catálogos) | `yarn workspace @rsvp/i18n test` (mismas claves, ninguna vacía) | Añadidos `auth.*`, `language`, `invitation`, `stubs`; los textos de `packages/ui`, `packages/ui-web` y `components/rsvp` siguen fuera del catálogo (deuda declarada en `LEGACY_LITERAL_FILES`) |
| REQ-F06-03 Intl | PASS | `packages/i18n/test/format.test.ts` | BOB/USD y números en ambos locales con valores exactos |
| REQ-F06-04 zona de la celebración | PASS | `tz-matrix.txt`: suite bajo `TZ=UTC`, `Europe/Madrid`, `Asia/Tokyo`, `America/Los_Angeles` | 8/8 en las cuatro zonas: 23:00Z = 07:00 p. m. en La Paz siempre; cambiar la zona de la celebración cambia la hora |
| REQ-F06-05 preferencia explícita | PASS (web; nativo con SecureStore simulado) | `apps/universal/test/auth.test.tsx`; `auth-e2e.log` ("language switch") | Selector Español/English en las pantallas de acceso; aplica en caliente y se recuerda (localStorage en web, SecureStore en nativo); la elección gana sobre el idioma del dispositivo. seo-web sigue con `?lang=` sin persistencia |
| REQ-F06-06 detección de cadenas | PASS | `yarn workspace @rsvp/config-eslint test` (6/6); `node node_modules/eslint/bin/eslint.js --no-warn-ignored apps packages` (exit 0) | La regla `rsvp/no-literal-strings` (ampliada: hijos literales, label/title/placeholder/alt/aria) está habilitada para pantallas; un texto a mano hace salir ESLint con código 1 (test CLI). `packages/config-eslint/base.js` fue integrado por el otro agente (F01) con `codeQuality` |

No cubierto: textos fijos de `packages/ui`, `packages/ui-web`, `seo-web/components/rsvp` y `app/c/[slug]/rsvp/[token]` (excluidos de la regla por lista explícita); "añadir pt-BR = una carpeta" no se probó (hay que registrar el locale en `server.ts`); ejecución en iOS/Android.
