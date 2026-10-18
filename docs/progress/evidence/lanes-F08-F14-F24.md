# Evidencia · Eje B (Leo) · frontend F08–F14 y F24

Fecha: 2026-10-17. Todo se verificó contra el backend real (Celebration y Template/Media en Docker detrás de Kong, Postgres, RabbitMQ y MinIO).

| Carril | Estado | Lo que lo demuestra |
|---|---|---|
| F08 · seo-web | `REGRESSION_VERIFIED` (falta revisión de otro eje) | Lighthouse SEO **100** y accesibilidad **100** en todas las rutas indexables ([audit.json](lane-F08/audit.json)); sitemap dinámico desde `GET /celebrations/public`; JSON-LD `Event` con el offset de la celebración; Open Graph con URL de foto estable |
| F09 · motor de temas | `REGRESSION_VERIFIED` | 28 pruebas, 100 % de líneas; los 5 layouts con snapshot en claro y oscuro (web y nativo); un template nuevo cambia el sitio sin código; [THEMES.md](../../../packages/celebration-theme/THEMES.md) |
| F10 · sitio público | `REGRESSION_VERIFIED` | A1–A8 y A21 con capturas en 360/768/1280; escaneo del DOM: ningún enlace a partner fuera de `/r/`; itinerario en hora de La Paz visto desde un navegador en Madrid |
| F11 · alta y editor | `REGRESSION_VERIFIED` | Pruebas de pantalla (campos por tipo de evento, 409 sin perder lo escrito, archivo inválido) y recorrido en vivo con subida real a MinIO |
| F12 · templates, vista previa, publicación | `REGRESSION_VERIFIED` | Solo templates compatibles; cambiar no envía contenido; checklist desde el 422 del backend; vista previa en 3 tamaños; publicado en vivo |
| F13 · configuración y modos | `REGRESSION_VERIFIED` | Confirmación con consecuencia y aviso de no-retroactividad; fecha límite pasada avisa; guardada en vivo como 23:59 de La Paz |
| F14 · admin | E3, E4, E12 `REGRESSION_VERIFIED`; E5, E6, E8–E11 `BLOCKED-EXTERNAL` | Tipo de evento creado en el admin y ofrecido al instante en el alta (prueba de pantalla y en vivo); solo ADMIN entra. Los módulos de proveedores, identidad y regalos esperan las APIs de otros ejes |
| F24 · buscador de proveedores | Rutas, metadatos y JSON-LD `REGRESSION_VERIFIED`; datos `BLOCKED-EXTERNAL` | B1–B4 renderizadas en servidor, 99 rutas categoría-ciudad, Lighthouse SEO 100; el catálogo de Fabio aún no expone HTTP, así que las páginas muestran un estado vacío en lugar de datos inventados. Contrato de búsqueda que consumen: `apps/seo-web/lib/providers.ts` |

## Cómo reproducirlo

```bash
yarn workspace @rsvp/celebration-theme test        # 28
yarn workspace @rsvp/i18n test                     # mismas claves en es-BO y en-US
yarn workspace @rsvp/query-hooks test              # 9
yarn workspace @rsvp/seo-web test                  # 19, incluido el escaneo de textos fijos
yarn workspace @rsvp/universal test                # 26, incluido el escaneo de textos fijos
# Con RSVPBackend levantado (docker compose up -d) y seo-web en :3317:
BASE=http://localhost:3317 node apps/seo-web/scripts/audit.mjs   # capturas, axe, Lighthouse
node apps/universal/scripts/live-e2e.mjs                         # la app real en el navegador contra el backend real
```

Capturas: `lane-F08/`, `lane-F10/`, `lane-F11/`, `lane-F12/`, `lane-F13/`, `lane-F14/` (cada pantalla en 360, 768 y 1280 px). axe: cero violaciones críticas o serias en todas.

Las capturas de iOS y Android no se tomaron: requieren simuladores o dispositivos y las builds de EAS del carril F07 (bloqueado por cuentas de Apple y Google).
