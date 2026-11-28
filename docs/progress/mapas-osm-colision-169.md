# Mapas OSM: colisión de `feat/req-mapas-osm-fe` con FE #169 (`feat/mapa-invitacion-osm`)

Nota para el dueño del producto. Esta rama no toca #169; la decisión de cuál sigue es del dueño.

## Qué hace cada una
- **#169:** solo la invitación pública. Paquete nuevo `packages/location` (enlaces, ubicación guardada), `celebration-theme/src/location/*` (`venue-map`, `venue-details`, `venue-tools`), ajustes a `content.ts`, `embed.ts`, secciones y render.
- **Esta rama:** modelo `content.locations` + `LocationView` en `celebration-theme/src/{location.ts,map/*}`, y además el anfitrión (alta, editor, sedes, agenda), el selector nativo por WebView, el proxy de búsqueda del backend, proveedores y admin.

## Archivos que chocan (ambas rama modifican)
`apps/seo-web/next.config.js`, `packages/celebration-theme/{package.json,styles.css}`, `src/content.ts`, `src/design/render.tsx`, `src/design/media-render.test.tsx`, `src/map-link.test.tsx`, `src/media/{components.tsx,embed.ts,media.test.tsx}`, `src/renderer.test.tsx`, `src/sections/index.tsx`, `src/__snapshots__/renderer.test.tsx.snap`, `packages/i18n/locales/{en-US,es-BO}/celebration.ts`, `yarn.lock`.
Duplicado conceptual sin choque de archivo: `packages/location/*` (#169) frente a `celebration-theme/src/location.ts` (esta rama).

## Propuesta
1. Fusionar primero esta rama (cubre lo de #169 y el requisito completo: sin enlaces del anfitrión, nativo, proveedores).
2. Descartar `packages/location` y `celebration-theme/src/location/*` de #169, o rebasarlos sobre esta rama solo si aportan algo que aquí falte; revisar en #169 las pruebas `venue-tools.test.tsx` por si conviene portar casos.
3. Alternativa: fusionar #169 antes y rebasar esta rama sobre él, resolviendo `content.ts`, `sections/index.tsx` y `embed.ts` a mano; implica mantener dos modelos de ubicación o migrar `packages/location` al modelo `locations`.

## Decisiones que quedan documentadas
- Google solo se LEE como entrada legada (`MAP_HOSTS`, `pointOf` en `content.ts`) para sacar coordenadas de invitaciones viejas; nunca se emite ni se enlaza.
- `google_maps` sigue en los contratos de Template/Media (`intent=map`, `provider`) por compatibilidad con clientes viejos; el frontend ya no lo usa. Retirarlo del contrato es un cambio incompatible: va en B3 con versión mayor cuando no queden apps viejas.
