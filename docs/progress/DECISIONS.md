# Decisiones (frontend)

## Eje B (Leo) · 2026-10-17

- **Un renderer, cinco layouts como datos.** `@rsvp/celebration-theme` traduce la fila del template (paleta, tipografías, estilo, orden de secciones) a variables CSS en web y a contexto en React Native. Los layouts son especificaciones (`src/layouts`), no componentes. Modo oscuro derivado: superficies oscuras neutras con el acento del template.
- **Secciones vacías no se renderizan**, y una sección que el template no ubica queda oculta, nunca borrada.
- **Ningún cálculo de zona horaria en el cliente.** La API devuelve `localTimes` y acepta hora de pared (`YYYY-MM-DDTHH:mm`) que interpreta en la zona de la celebración; las pantallas solo formatean con `Intl` y `timeZone`.
- **`@rsvp/i18n/server`**: entrada sin React para componentes de servidor de Next (react-i18next crea un contexto al cargarse y rompe en RSC). Los textos de Leo viven en `locales/*/{celebration,directory,host,admin}.ts`; un tipo obliga a que `en-US` tenga las mismas claves que `es-BO` y una prueba lo verifica.
- **Sin regla de lint para textos fijos (no existe en el repo): son pruebas** que escanean el JSX de las pantallas de Leo en seo-web y universal.
- **Metadatos en `<head>` para cualquier user agent** (`htmlLimitedBots: /.*/`). Next 15 transmite los metadatos de páginas dinámicas en el `<body>` a quien no reconoce como bot; WhatsApp y Lighthouse se quedaban sin tarjeta ni descripción.
- **Fotos públicas con URL estable** (`/media/public/assets/{id}/{variante}` → 302 a una URL firmada fresca). Las URLs firmadas vencen y no pueden vivir en HTML cacheado ni en tarjetas de Open Graph.
- **Admin bajo `/admin/...`** (`app/(admin)/admin/*`): `(admin)/templates.tsx` del plan chocaría con `/templates` del anfitrión, porque los grupos no forman parte de la URL.
- **Navegación de pantallas como callback** (`onNavigate`) y celebración en `?c=`: las pantallas no importan expo-router y se prueban con Testing Library sobre react-native-web.
- **Sesión web**: la producción mantiene el diseño de F05 (cookies httpOnly, sin token en JS). Mientras Identity no emita esas cookies, el desarrollo local inyecta un token con `EXPO_PUBLIC_DEV_ACCESS_TOKEN`, ignorado en builds de producción.
- **Metro y Next resuelven `./x.js` → `x.ts`** en los paquetes del workspace (estilo NodeNext); sin eso, ni el build web de Expo ni el de Next compilaban.
- **Directorio de proveedores sin datos inventados**: si el catálogo no responde, la página lo dice. Categorías y ciudades son la referencia del catálogo, con slugs en español para SEO.

## Rediseño visual · 2026-11-03
- Mundo visual: **aguayo boliviano**. Vino profundo `#3A0D2B` como región comprometida, magenta `#8C1D5A` primario, azafrán `#F2A900` acento, turquesa y bermellón de apoyo; lienzo rosa frío `#FBF8FB`, nunca crema.
- Tipografía web: Bricolage Grotesque (display) y Figtree (texto) vía `next/font`. Nativo conserva la fuente del sistema hasta empaquetarlas con `expo-font`.
- Corrección: la regla `no-literal-strings` sí existe en `config-eslint` (no habilitada).

## Eje A (Pablo) · plataforma frontend · 2026-11-03
- **Fuente única de tokens:** `packages/design-tokens/src/*.ts` genera `generated/tokens.json|css` y los presets; se eliminaron los hex duplicados.
- **Cliente tipado local** `packages/contracts` (openapi-typescript desde los 8 specs) mientras el paquete publicado no exista; romper el contrato rompe `tsc`.
- **`darkMode` por clase no se usa en el preset** (genera `@cssInterop` que NativeWind nativo no parsea).
- **Sesión web en memoria** hasta que Identity emita cookie httpOnly; recargar la página cierra la sesión.
- **Regla `no-literal-strings` habilitada**, con una lista temporal `LEGACY_LITERAL_FILES` (ui, ui-web, components/rsvp) fuera de la regla.
- **Lighthouse CI** usa `configPath` con `.lighthouserc.json` (el `budgetPath` anterior no aplicaba el umbral) y mide 4 rutas.

## Rediseño con el DOne Brand Kit v3 · 2026-11-06
- **Marcos, no pantallas sueltas.** Las pantallas autenticadas pasan por un único `Screen` (`apps/universal/src/host/shell.tsx`): menú lateral noche con secciones (≥ 960 px) o barra superior + pestañas + «Más» (móvil). Invitado: `GuestFrame`; ingreso: `AuthLayout`. Cambiar el marco cambia todas las pantallas a la vez. Reglas y prohibiciones en `DESIGN.md`.
- **`Logo` es el SVG real** (`packages/ui/src/logo*.tsx`); nativo usa `react-native-svg`. Prohibido texto o glifos como logo o icono.
- **Tipografía nativa empaquetada** (`expo-font` + `@expo-google-fonts/plus-jakarta-sans`). React Native elige archivo por familia, no por `fontWeight`: `src/platform/fonts.native.ts` asigna la familia según el peso del estilo una sola vez, para que ninguna pantalla nombre una familia.
- **Token `fieldBorder`** (3:1, WCAG 1.4.11) para contornos de campos; `border` queda para divisores.
- **Causa raíz de campos sin estilo:** `Input` dejaba que un `style` recibido (p. ej. de `Field`) pisara todo su estilo base. Ahora lo combina.
- **Compuerta visual de la app Expo** (`apps/universal/e2e`, `yarn workspace @rsvp/universal test:visual`): 51 rutas × 390/768/1440 px contra el servidor de contrato (`scripts/visual-mock.ts` + `visual-fixtures.ts`). Antes no existía ninguna prueba visual de host, admin, portal ni invitado. Al agregar una pantalla, se agrega a `e2e/screens.ts`.
- **Área segura:** la aplica solo `SafeFrame` en la raíz (PR #7); el marco nuevo no suma insets.

## Botones, errores y CRUD por pantalla · 2026-11-06
- **Solo se ofrece lo que el backend soporta.** Cada botón de CRUD se contrastó con los contratos OpenAPI: si hay operación y faltaba el botón, se creó; si no hay operación (editar/borrar regalo, oferta, grupo, usuario…), no hay botón y queda como brecha de backend en `docs/progress/evidence/botones-crud-2026-11-06.md`. No se simula lo que el servidor no hace.
- **Un solo módulo contra el doble envío** (`apps/universal/src/platform/single-flight.ts`): `isPending` cambia un render tarde, así que un doble clic llega dos veces al manejador. Tres guardas con nombre propio: `useSingleFlight` (callback con `release`), `useSingleFlightGate` (`begin`/`end`) y `useSingleMutation` (envuelve una mutación). Se rechazó bloquear dentro de `ActionButton`: no puede saber si una pulsación inicia una escritura y rompía 19 pruebas de pantallas con pasos intermedios.
- **Errores por código, no por estado.** `errorMessage`/`ErrorNotice` distinguen 429 (con `Retry-After`), 5xx, red caída y los 409 por `problem.code` (`SLUG_TAKEN`, `CELEBRATION_ARCHIVED`, `INVALID_TRANSITION`…): un 409 ya no significa siempre «alguien guardó cambios».
- **Límites en cliente iguales o más estrictos que el servidor**, porque el backend acepta, por ejemplo, un título de 20 000 caracteres.
- **El refresh de sesión sigue corriendo en rutas de invitado**: con cookie httpOnly no se sabe si hay sesión, y omitirlo dejaría sin sesión a un anfitrión que abre un enlace de invitado. El 401 anónimo en consola es esperado.
- **Plurales:** el i18n no tiene plurales; los textos con contador se redactan sin depender del número («Acompañantes permitidos: N»).
