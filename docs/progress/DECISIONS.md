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
