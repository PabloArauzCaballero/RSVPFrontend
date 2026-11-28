# Proveedores para mi evento (marketplace del invitado): frontend

Rama `feat/req-proveedores-evento-fe`, base `chore/deploy-contabo-coolify` en `b04345d2`. Sesión «requisitos nuevos», nube 4, 2026-11-28. Contraparte: `docs/progress/marketplace-invitado-be.md` de RSVPBackend (rama `feat/req-proveedores-evento-be`).

## Qué hay

- **Ruta** `/c/{slug}/proveedores` (seo-web): `?categoria=&ciudad=&pagina=&lang=`. Servidor, `noindex`, `no-referrer` (meta y cabecera), sin caché, 404 si la celebración no existe. No lee la credencial del invitado ni envía `guestId`, token ni cookie. La ciudad por defecto sale de `content.citySlug|city|venueCity` si coincide con una ciudad del catálogo; si no, «Toda Bolivia» (`ciudad=todas` también la fija).
- **Fila de categorías**: `<nav aria-label>` con enlaces (no `tablist`), «Todas» primero, `aria-current`, nombre siempre visible, scroll horizontal con snap en teléfono (azulejo de 88 px, asoma el siguiente) y cuadrícula desde 52 rem. Solo categorías con proveedores, en el orden del tipo de evento (viene del backend). Las 20 miniaturas 3D (claro y oscuro, 88/176/264 px, WebP) están en `apps/seo-web/public/marketplace/v1` (versionadas por carpeta, caché inmutable); una categoría sin dibujo usa una baldosa con su inicial.
- **Tarjetas** una por proveedor, con foto o monograma, «Verificado», «Destacado» solo cuando `sponsored`, «Desde Bs» y un enlace a la ficha `/p/{slug}`. La página no enlaza a `/r/` ni a ningún destino del proveedor: el lead nace en la ficha.
- **Atribución**: al abrir la pestaña se guarda en `sessionStorage` (solo esa pestaña del navegador, 2 h) el `celebrationId` público; la ficha `/p/{slug}`, que sigue estática, reescribe sus enlaces `/r/` con `surface=CELEBRATION_SITE&celebrationId=`. Sin origen válido no cambia nada. `eventType` no se envía: el backend de esta base no lo guarda en el lead.
- **Entradas** (solo con `GUEST_MARKETPLACE=on` y proveedores en el catálogo): bloque discreto al final de la invitación y línea discreta bajo el enlace de regalos tras responder el RSVP. Ninguna entra al `Dock`, ninguna lleva token ni consulta salvo `lang`. No se tocó `celebration-theme` (`SectionNav`) para no chocar con las plantillas en vuelo.
- **App**: `decideNavigation` deja `/c/{slug}/proveedores` dentro de la vista web (P10: una sola implementación); `/p/...` y `/r/...` siguen saliendo al navegador del sistema.
- **Textos** es-BO y en-US en `directory.guestMarketplace.*`. **DESIGN.md**: excepción provisional E1 a E7 para las miniaturas (pendiente de Pablo).

Nota de rendimiento: las dos variantes (claro y oscuro) de cada miniatura son `loading="lazy"`; el navegador no descarga una imagen perezosa con `display:none`, así que baja solo la del esquema activo. No medido en la red.

## Interruptor y orden de despliegue

`GUEST_MARKETPLACE` (declarada en `docker-compose.coolify.yml`, valor por defecto `off`; ver también `docs/runbooks/releases.md`) es una variable de entorno del contenedor de seo-web, **apagada por defecto**: con ella apagada la ruta es 404 y no hay entradas (Coolify: crear la variable en TEST con valor `on` solo cuando el backend con `provider-catalog 3.15.0+` esté desplegado; sin él la página muestra el estado de error). Orden: backend (migraciones, categorías) → web con la variable apagada → web con la variable encendida en TEST → regla `allow` de la app (ya incluida, se despliega con la app: una app instalada sigue abriendo la ruta en el navegador externo hasta actualizarse, aceptable).
No encender en producción antes de: M34 (clave de cobro IP+UA, R6b), el consumidor de borrado de celebración en marcha, proveedores reales con ofertas publicadas y la decisión de Pablo sobre las miniaturas y sobre el aviso legal («DOne verifica…», texto por validar).

## Pruebas (2026-11-28, UTC)

- Unitarias: `packages/query-hooks` 216, `packages/i18n` 18, `apps/seo-web` 241 (17 nuevas), `apps/universal` 859 (rutas permitidas). `tsc --noEmit` y ESLint (`--max-warnings 0`) limpios en los paquetes tocados; `harness:validate` válido; `next build` de seo-web compila.
- **Recorrido real parcial**: Chrome real (Chrome for Testing 158) contra seo-web (`next dev`) y el provider-catalog real del PR de backend (Nest + marketplace + PostgreSQL 16 sin superusuario, 17 proveedores sembrados por la API), detrás de un enrutador mínimo. **Lo único simulado es la lectura pública de celebration-site** (`/celebrations/public/{slug}`, dos celebraciones de prueba). Resultado: 360/768/1280 px, claro y oscuro, es-BO y en-US: axe (wcag2a, wcag2aa, wcag21aa) sin violaciones críticas ni serias; sin scroll horizontal de la página; rail con scroll horizontal a 360 px y 88 px por azulejo; miniaturas cargadas tras desplazar; ninguna petición con token ni `guestId`; categoría → ciudad → estado vacío → «Ver toda Bolivia» → ficha → clic de WhatsApp reescrito a `surface=CELEBRATION_SITE&celebrationId=` y respondido 302 por el backend real (el lead se registró como `bot` porque Chrome headless lo es: es la regla del backend).
- **No probado**: el gateway Kong y Docker (no hay daemon), celebration-site y Guest/RSVP reales (el recorrido de la invitación y de la página personal del RSVP, solo con pruebas de componente), Playwright de la suite del repositorio y comparación visual contra la línea base (no hay línea base para esta página), WebView nativa de iOS/Android, lector de pantalla real, rendimiento medido (LCP/CLS no medidos), Safari y Firefox, contraste de las miniaturas con herramienta (a ojo en claro y oscuro a 72 px), gitleaks (no instalado: revisión manual del diff sin hallazgos).
- Capturas locales (no se versionan): tamaños 360/768/1280, claro y oscuro.

## Reversión

Revertir el PR, o apagar `GUEST_MARKETPLACE` (efecto inmediato: 404 y sin entradas). Los activos son estáticos y versionados: ninguna migración ni contrato propio.

## Pendiente (declarado)

Pin OSM y mapa en la ficha (lo toma la sesión de mapas), fotos de servicio y portada en el portal (depende de BE-6), contexto de origen también en `/cotizar` y el catálogo de la ficha, `eventType` en el lead (R6b), flecha anterior/siguiente en escritorio y «Ver todas» en móvil, interruptor por celebración para el anfitrión (decisión 3), regeneración de `packages/contracts` con el SHA fusionado, y el botón de «Pedir cotización» condicionado a la señal de cotización anónima.
