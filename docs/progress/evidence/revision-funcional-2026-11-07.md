# Revisión funcional con datos de demostración (2026-11-07)

Estado: **observado** contra el backend real (Kong :28000, servicios en el host) con la familia `dbo` del poblador (`docs/runbooks/datos-demo.md`) y la app web Expo exportada y servida en :8200, abierta con Chrome real a 360, 768 y 1280 px (es-BO, esquema claro). **No** se probó iOS/Android, en-US ni esquema oscuro; `template-media` y el almacenamiento no estaban levantados (media y plantillas dan 502/503), así que galería, portada y plantillas quedan sin ver. Es una revisión de solo lectura: no se tocó ninguna pantalla.

Cómo reproducir: `node apps/universal/scripts/seed/demo.mjs`, exportar la app (`EXPO_PUBLIC_API_URL=http://localhost:28000 npx expo export --platform web`), servirla en :8200 y correr `APP=http://localhost:8200 OUT=<carpeta> CHROMIUM_PATH=... node apps/universal/scripts/seed/review.mjs` (barrido de 34 rutas × 3 anchos: 102 pantallas) y `review-detail.mjs` (capturas puntuales a 360). Las capturas quedan en la carpeta `OUT`; no se versionan.

Resumen del barrido: 102 pantallas cargaron con datos (sin pantallas en blanco, sin errores de página, tiempos de carga de 1,3 a 1,5 s cada una). 23 marcaron algo; tras mirar las capturas, los hallazgos reales están abajo. El detector marca también las filas de pestañas con scroll horizontal, que no cuentan por sí solas.

## (a) Qué datos o estados hace imposible o confuso el backend

1. **No existe el estado "quizá".** Solo `CONFIRMED`, `DECLINED` y sin respuesta (`POST /rsvp/celebrations/{id}/rsvp`). El reporte de la boda queda en 30 / 11 / 22. Si producto quiere "quizá", es backend.
2. **Las solicitudes de acompañante decididas desaparecen.** `GET /celebrations/{id}/companion-requests` solo devuelve las abiertas y no admite filtro de estado; no hay historial de quién fue aprobado o rechazado. Una pantalla "Acompañantes" no puede mostrar "Decididas". Se descubrió porque la re-ejecución del poblador seguía "decidiendo" las que quedaban.
3. **Los errores del backend salen en dos idiomas y con tonos distintos.** `422 OUTSIDE_AVAILABILITY` llega en español ("La fecha u hora queda fuera de la disponibilidad del proveedor."), pero `409 GIFT_NOT_AVAILABLE` ("This gift is no longer available; please choose another one."), `422 INVALID_PARENT` ("A city belongs to an existing region.") y `422 ValidationFailed` ("Idempotency-Key must be 1 to 128 printable ASCII characters") llegan en inglés. Un `detail`/`title` del servidor que llegue a pantalla rompe el tuteo es-BO del brief.
4. **Mensaje engañoso en el registro sin invitación.** `POST /rsvp/celebrations/{id}/unregistered` sin `Idempotency-Key` responde 422 "Idempotency-Key must be 1 to 128 printable ASCII characters" (parece que la clave es inválida, no que falta). Con el modo en `RESTRICTED` responde **403 sin explicación**, aunque `public-settings` ya diga `publicRegistrationEnabled:false`.
5. **La reserva de fecha exige adivinar la hora.** `POST /providers/{id}/bookings` con la hora igual al cierre de una franja (18:00 en 08:00-18:00) da `422 OUTSIDE_AVAILABILITY` sin decir qué horas valen; el fin de la franja es exclusivo. La respuesta no trae las franjas válidas del día.
6. **El plan del proveedor (FEATURED/PREMIUM) solo lo asigna un ADMIN** (`403 PLAN_ADMIN_REQUIRED` al crear). Un alta de proveedor no puede elegir plan; hay que crear y esperar al admin con `PATCH /providers/{id}`.
7. **Una celebración archivada es un callejón sin salida:** `archive` exige `If-Match` (428 sin él) y después `publish` responde `409 INVALID_TRANSITION` "Cannot go from ARCHIVED to PUBLISHED" (texto técnico en inglés). No hay desarchivar (ya figuraba como brecha).
8. **Métricas del proveedor en cero con actividad real.** Tras 4 clics REDIRECT y 4 cotizaciones, `GET /providers/{id}/metrics` devuelve `impressions:0, clicks:0, validLeads:0` y `rows:[]` (ventana 30 días), mientras `/leads` lista los 8 eventos. Las pantallas de métricas de un proveedor con leads se verán vacías hasta que exista el rollup (no se pudo comprobar cuándo llega). **No hay forma HTTP de sembrar métricas de varios días.**
9. **Idioma antes que traducción.** `PATCH /celebrations/{id}` con `translations["en-US"]` responde `422 UNSUPPORTED_LOCALE` hasta que `supportedLocales` incluya `en-US`: son dos escrituras en orden obligatorio, cada una con su `If-Match`.
10. **Las cotizaciones anónimas tienen un tope por IP y hora con `Retry-After` de ~3000 s** (429 "Too many requests"). Detrás de una oficina o una red móvil compartida, un visitante real recibe un 429 sin pista de cuándo reintentar; Kong tampoco expone `Retry-After` por CORS (brecha ya registrada).
11. **Lista de invitados con consistencia eventual visible.** Justo después de crear un invitado, `guest-list` devuelve `items:[]`, `total:0` y `freshness.pendingEvents:1` (ventana declarada de 5 s); `guest-summary` también queda atrás. Una pantalla que cree un invitado y recargue la lista verá la lista vacía unos segundos.
12. **La cola de moderación mezcla basura de pruebas** (46 pendientes, 20 aprobadas, 20 rechazadas) y sus elementos solo traen `title` ("Microsite mw5ek1p5 A"), una URL o id y `submittedBy`: no hay nombre de proveedor ni vista previa para decidir.

## (b) Pasos de más (candidatos a fusionar)

1. **Invitar es un gesto por invitado.** No hay "enviar invitaciones" masivo: cada invitado necesita su propio `POST …/access-token` (60 llamadas para la boda) y el reenvío es `resend:true` por invitado. Candidato: una acción "Generar y enviar enlaces" para el grupo o la lista, y que el alta de invitado devuelva ya el enlace.
2. **Grupo antes que invitado.** Para ubicar a alguien en una familia hay que crear el grupo primero (`POST /groups`) y luego el invitado con `groupId`. En la pantalla, "Grupos" vive en un botón aparte de "Agregar invitado": fusionar con "Agregar invitado → familia nueva o existente".
3. **Reserva de regalo en dos tiempos.** En modo `RESTRICTED` toda reserva queda `PENDING_REVIEW` y el anfitrión debe entrar a Regalos → Reservas a aprobarla una por una. Para listas con muchas reservas hace falta "Aprobar todas" (no existe en el backend; el cliente tendría que iterar).
4. **Regalo externo con handshake.** Según el sembrador original (`live-world.mjs`), el primer `POST` de un regalo externo responde `409 PARTNER_CATALOG_FIRST` y hay que reenviar con `partnerSuggestionsAcknowledged:true`. No se volvió a observar aquí (se envió ya reconocido); es un paso doble por diseño.
5. **Publicar = 3 versiones.** Contenido, ajustes y publicación llevan su propio `If-Match`, y `publish-check` devuelve otra `version`. Un "Guardar y publicar" simple obliga a releer la celebración entre cada paso.
6. **Moderación y verificación: tres botones por fila.** "Abrir", "Aprobar" y "Rechazar" ocupan una fila completa cada uno a 360 px; con 46 pendientes son ~140 botones. Candidato: una fila con dos acciones y detalle expandible.
7. **Rechazo y suspensión de proveedores piden motivo** (obligatorio): bien, pero la verificación de un lote no tiene acción masiva.

## (c) Pantallas donde los datos reales rompen el diseño

Todas con Chrome real; ancho 360 salvo que se diga otro. Capturas en el scratch del agente (`…/agents3/s/review` y `…/detail`).

1. **`/invitados`, filtro por grupo (360 y 768).** Con 15 grupos las fichas ocupan casi toda la primera pantalla: la lista de invitados queda bajo el pliegue incluso a 768 px. A 360 la ficha "Compañeros de la Facultad de Ingeniería, promoción 2012 (grupo grande de la UMSA)" no se ajusta: queda cortada en el borde derecho (se lee "Compañeros de la Facultad de Ingeniería, pr"), sin salto de línea. Datos: nombre de grupo de 82 caracteres, 15 grupos.
2. **`/invitados`, fila de invitado (360).** El nombre compuesto "María de los Ángeles Condori Quispe de Mamani" se trunca con puntos suspensivos a "María de los Ángeles C…" y el invitado queda irreconocible (el apellido paterno ya no se ve); la fila tiene espacio para dos líneas.
3. **Barra de pestañas de Invitados (360).** "Quién viene · Respuestas · Acompañantes": la tercera pestaña queda cortada en el borde ("Acompañante") sin señal de que hay scroll horizontal.
4. **Barra inferior (360, anfitrión).** La etiqueta "Mi invitación" se trunca a "Mi invitaci…" en todas las pantallas del anfitrión.
5. **`/invitados/{id}`, selector de grupo (360).** La lista de grupos vuelve a ser una pila de fichas; el grupo largo se corta en el borde derecho y aparece "(4)" como contador sin contexto.
6. **`/admin/moderacion` y `/admin/verificacion` (360).** Cada elemento ocupa una pantalla casi completa: título (id o slug), línea gris con uuid y fecha en UTC, y tres botones de ancho completo cuyas etiquetas repiten el título ("Aprobar Microsite mw5ek1p5 A"). El detector marca los botones como desbordados (`button[approve-…]` termina fuera del ancho) en `/admin/verificacion`, `/admin/moderacion` y `/admin/usuarios` ("Dar rol ADMIN a f22host.mw5aay69@example.com", correo de 40 caracteres).
7. **`/admin` (360).** Banner rojo "El servidor tuvo un problema. Reintenta en unos minutos." arriba de datos que sí cargaron (tipos de evento 9, proveedores por estado). Causa visible: la tarjeta "Templates" depende de `template-media` (502/503). Un fallo parcial de un servicio opcional se comunica como fallo de toda la pantalla.
8. **`/portal/perfil` y `/portal/destinos` (360).** El detector marca dos contenedores que se salen del ancho (pendiente de mirar con más detalle: pueden ser filas de pestañas).
9. **`/bandeja/regalos` (360).** "Solicitado: Óscar": el anfitrión ve solo el nombre de pila que escribió el invitado; entre 63 invitados (varios "Óscar") no sabe quién es. No muestra grupo ni nombre completo. Los títulos largos de regalos (hasta 200 caracteres) sí se ajustan bien.
10. **Cifras extremas (360).** "Bs 9.876.543,21" y el título de más de 120 caracteres del regalo "Vajilla de cerámica…" y "Pasaje de avión…" caben (ajustan en 2-3 líneas): **no rompen** el diseño. Tampoco rompen las ofertas con títulos de 60+ caracteres (`/portal/servicios`) ni los datos de la agenda.
11. **Pantalla de invitado `/c/{slug}/rsvp/{token}` (360, 768, 1280).** Se ve bien con datos reales, pero ejecuta `POST /identity/auth/refresh` sin sesión y recibe 401 en cada carga (ruido en consola/red, no visible al usuario). Lista de regalos del invitado no se revisó visualmente más allá de que carga.

## (d) Lentitud y consistencia eventual observables

- **Llamadas HTTP:** una lectura típica responde en 3-15 ms (`guest-list` de 60: 15 ms). Ninguna petición de la siembra pasó de 1,5 s. Registrar o iniciar sesión cuesta ~0,5-0,9 s por cuenta (hash de contraseña): crear las 18 cuentas tarda 9-17 s.
- **Primera corrida del poblador:** ~131 s, casi todo espera por el tope de Kong (30/min en `/rsvp`, espaciado a 2,4 s) y por las 5 s de la ventana de consistencia. Re-ejecución: ~33 s.
- **Carga de pantallas:** 1,3 a 1,5 s por ruta (carga completa con `networkidle`) a los tres anchos; sin diferencias entre 360 y 1280. No se midió en dispositivo.
- **Consistencia:** `guest-list`/`guest-summary` quedan atrás hasta 5 s tras una escritura (`freshness`); las respuestas RSVP enviadas aparecen en el resumen tras ese margen (la corrida mostró confirmados 27 tras 5 s de espera). Las métricas del proveedor no reflejaban ningún evento minutos después (ver a.8).
- **Fallos del entorno durante la sesión:** `GET /providers/ready` respondía 500 mientras todo lo demás funcionaba (dependencia opcional de readiness); no afectó a la siembra.
- **Un bloqueo propio por diseño:** el servicio impone `Retry-After` de ~3000 s en cotizaciones anónimas; un cliente que reintente con espera automática se queda colgado casi una hora (el poblador lo evita no esperando más de 90 s).

## Estado de los datos locales

La base local venía con 955 usuarios, 452 celebraciones y 150 proveedores verificados de corridas anteriores, así que las pantallas de admin muestran cifras grandes que no vienen de esta siembra. La familia `dbo` es identificable por el prefijo de correo `dbo.` y de slug `dbo-`. Las familias `demo`, `bo`, `demo1` y la cuenta `probe.s1@example.com` son residuo de desarrollo del poblador.

## No verificado

iOS/Android; en-US y esquema oscuro; galería, portada y plantillas (`template-media` y almacenamiento ausentes); push; el mismo barrido con otras longitudes de nombre en 768/1280 más allá de lo listado; cómo se ven las métricas con datos de varios días (el backend no permite sembrarlos por HTTP).
