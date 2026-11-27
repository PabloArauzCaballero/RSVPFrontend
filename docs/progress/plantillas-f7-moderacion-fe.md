# Plantillas F7 · moderación en el frontend

Corrige: PL-142-R4 (parte FE, decisiones de Pablo del 2026-11-26 en BE #143). Rama `feat/plantillas-f7-moderacion-fe`, contra `chore/deploy-contabo-coolify`. Pareja de BE #167 (READY) y de BE #143 (borrador, aviso por correo).

## Qué entra

- **Contratos provisionales.** `packages/contracts` vendorizado desde la cabeza de BE #167 (`bf93c097441c0626cd5c52de4548fb73825669da`) con el generador del repo (`RSVP_BACKEND_REPO=… yarn workspace @rsvp/contracts generate --ref bf93c097…`): Celebration **1.8.0** y Template/Media **1.9.0**. Son versiones provisionales: el lock exige versiones crecientes en el orden de fusión y BE #167 puede renumerarse a 1.7.0 de Template/Media si se fusiona antes que #164. Al fusionar el backend hay que volver a vendorizar desde la rama oficial (`generate --ref <sha oficial>`); mientras tanto `check:source` pasa contra ese commit y el candado apunta a él.
- **Denuncia pública** (`apps/seo-web/components/report-invitation.tsx`): pie discreto «Denunciar esta invitación» y, solo si la página reproduce el MP3 propio, «Denunciar la música» (envía `element: { kind: "SECTION", id: "music" }`; solo se revisa la música). Diálogo nativo `<dialog>` (foco atrapado, Escape, foco de vuelta al botón), motivo de la lista cerrada, comentario opcional salvo `OTHER`, contador, errores 422/404/429 (con minutos de `Retry-After`)/red sin perder el texto. Sin sesión ni datos personales; ni IP ni correo.
- **Estado oculto en la invitación** (`packages/celebration-theme`): `hiddenElements` de la vista pública. Sin música propia no hay reproductor ni caja vacía; el botón de regalos `/c/{slug}/regalos`, «Confirmar asistencia», la portada y las fotos siguen. Un fondo o foto que responde 404 (oculto, borrado o enlace viejo en HTML cacheado) deja su caja sin cámara dibujada detrás del texto si es decorativo. La música de YouTube o Spotify no es un archivo del servicio de medios y no se juzga aquí (pregunta abierta).
- **Vista previa del administrador** (`apps/universal/src/admin/reports.tsx`, ruta `/admin/denuncias`, pestaña «Denuncias» del grupo Revisión): cola por estado, detalle de una denuncia (el comentario de un extraño se pinta como texto, nunca como marcado), decisiones, historial y archivos ocultos de esa celebración (`GET /media/celebrations/{id}/assets`, `hidden: true`; el ADMIN gestiona todas). «Ver archivo oculto» pide `POST /media/admin/assets/{id}/preview-links`; el enlace (un solo uso, 5 min) vive solo en el estado del componente (`gcTime: 0`, nunca una consulta con caché), se muestra como `<img>`/`<audio>` y cada nueva petición es otro enlace. Si el navegador no logra abrirlo (usado, vencido) lo dice y ofrece pedir otro. 409 `ASSET_NOT_QUARANTINED`/`ASSET_NOT_HIDDEN`, 403, 404 y red tienen su texto.
- **Mock de contrato:** `PublicPageStatus` ya trae `moderation` (anulable) en 1.8.0; el mock de `@rsvp/testing` y su prueba lo reflejan (la prueba `visual-mock` fallaba en la rama sin ese campo).
- **i18n:** `moderation.*` en es-BO y en-US (tuteo), más `admin.nav.reports`.

## Lo que NO entra (preguntas para Pablo en el PR)

- Pantalla «Moderación» del anfitrión (qué se ocultó, motivo, guía y apelación única): el correo de BE #143 la menciona; no se construyó. Los contratos ya la permiten (`GET /celebrations/{id}/moderation`, `POST …/takedowns/{id}/appeal`).
- Resolver, descartar, restaurar y decidir apelaciones desde la pantalla del administrador (`/resolution`, `/restoration`, `/appeal-decision`): hoy solo se leen y se mira lo oculto.
- Historial de `GET /media/admin/assets/{id}/preview-audit`: el hook no se usa todavía; el detalle de la denuncia sí muestra la auditoría de Celebration.

## Evidencia (Linux, Chrome real, 2026-11-27)

Ver el cuerpo del PR para comandos y salidas. Capturas en `docs/progress/evidence/plantillas-f7/` (Chromium de Linux contra el fixture del sitio y contra respuestas de prueba; nunca línea base). **Nivel: `TESTED`**, no `VERIFIED`: no hubo backend real, ni TEST (inalcanzable desde el sandbox), ni iOS/Android.

## Límites declarados

- El POST de la denuncia, las respuestas de moderación de Celebration y el enlace de vista previa los responde la prueba, no el backend real de BE #167: no se probó el corte inmediato contra el gateway con este FE.
- El navegador solo entrega `Retry-After` a la página si el gateway lo expone entre orígenes (`Access-Control-Expose-Headers`). Si no lo expone, el invitado ve «inténtalo más tarde» en lugar de los minutos. A confirmar con backend.
- La app nativa muestra la imagen con `Image` y la música con un botón que abre el enlace (consume el enlace de un solo uso en el navegador); no se ejecutó en iOS ni Android. En web son `<img>` y `<audio>` reales.
- CSP/`img-src` de la app universal en producción no se revisó para el origen público de medios y el redireccionamiento de 30 s al almacenamiento.
- gitleaks no está instalado en el sandbox: el escaneo de secretos queda como bloqueo externo.
- Líneas base Playwright (macOS) intactas: ninguna cambia ni se regeneró; `screens.ts` del universal no incluye la pantalla nueva.
