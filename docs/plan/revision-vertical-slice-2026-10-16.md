# Replanificación por slices verticales · Frontend · 2026-10-16

Esta revisión cubre los 28 carriles del repositorio y se aplica también a calendario, fichas de equipo y plan maestro. No altera REQs ni afirma que estén cumplidos. Los estados de ejecución y bloqueos se determinan por código y evidencia actual en `docs/progress/`. Las fechas H1–H6 son objetivos históricos: reestimar tras medir los primeros slices y dependencias externas; no adelantar estados por una fecha.

## Orden de trabajo obligatorio

1. Recargar skills en cada prompt. Leer `rsvp-vertical-slice`, `rsvp-code-graph`, skill de carril y evidencia; en interfaz también Impeccable, UI/UX Pro Max, accesibilidad, prueba visual y motion cuando aplique.
2. Verificar predecesores reales, consultar CodeGraph y confirmar flujo/código. Si falta índice, `corepack yarn graph:init`; no usar Graphify.
3. Empezar por el corte indicado abajo o por otro que reduzca un riesgo mayor documentado. Cada corte declara REQs, entrada, resultado, capas/repos, caso negativo y prueba. No construir todas las capas antes de probar.
4. Cuando cruza repos: contrato versionado del backend, consumo en frontend, prueba de compatibilidad e integración real cuando el entorno exista. Las PR y evidencias se vinculan; un mock no acredita backend.
5. Antes de cerrar cada corte, verificar comportamiento, regresión pertinente y evidencia. Para UI: evaluar con Impeccable y UI/UX Pro Max en el diseño vigente, mirar tamaños/plataformas afectados y estados. Para animación: propósito, reduced motion, interrupción y rendimiento. Backend puro marca gates visuales `N/A` justificado.

## Reestimación de hitos

El calendario de 14 semanas y las fechas H1–H6 no incluyen explícitamente tiempo de revisión visual, animación, indexación/discovery y prueba por slice. El primer ciclo debe medir duración de cortes completos, bloqueos de infraestructura y capacidad de los cuatro dueños. Actualizar `calendario/` y `equipo/` con esas medidas antes de comprometer fechas nuevas. La secuencia de dependencias y propiedad de dominio sigue vigente hasta decisión registrada.

## Primer corte por carril

| Carril | Primer resultado verificable | Cruce | Gate adicional |
|---|---|---|---|
| [F01](carriles/lane-F01-turborepo-y-expo-router.md) | Abrir una ruta Expo mínima en web y nativo y comprobar build y navegación real. | 01 backend | interfaz solo si el cambio la toca |
| [F02](carriles/lane-F02-design-tokens-y-nativewind.md) | Aplicar un token semántico a un control real en web y nativo y verificar contraste. | 14 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F03](carriles/lane-F03-ui-primitivas-universales.md) | Usar Button e Input en un formulario real con error, foco, teclado y tamaño táctil verificables. | 05 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F04](carriles/lane-F04-api-client-y-query-hooks.md) | Leer un dato de celebración desde contrato y query hook en una pantalla, con carga y error. | 08 backend | interfaz solo si el cambio la toca |
| [F05](carriles/lane-F05-auth-sesion-y-deep-links.md) | Abrir un deep link autenticado y volver a la pantalla de origen tras renovar sesión. | 07 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F06](carriles/lane-F06-i18n-formatos-y-timezone.md) | Mostrar fecha y monto en es-BO y en-US con zona de la celebración en una ruta real. | 14 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F07](carriles/lane-F07-ci-eas-y-pipelines.md) | Construir una ruta mínima en CI y obtener un artefacto EAS o un bloqueo externo reproducible. | 09 backend | interfaz solo si el cambio la toca |
| [F08](carriles/lane-F08-seo-web-bootstrap.md) | Renderizar una ficha pública mínima por slug en servidor y comprobar HTML indexable. | 15 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F09](carriles/lane-F09-celebration-theme-engine.md) | Cambiar un tema por datos en una pantalla real sin perder contraste ni estados. | 16 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F10](carriles/lane-F10-sitio-publico-celebracion.md) | Abrir portada de una celebración publicada con fecha, lugar y RSVP accesible desde móvil. | 15 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F11](carriles/lane-F11-onboarding-y-editor-de-contenido.md) | Crear una celebración mínima en onboarding y verla en el editor con guardado y error. | 10 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F12](carriles/lane-F12-templates-preview-y-publicacion.md) | Elegir un template, previsualizarlo y publicar un caso mínimo con validación visible. | 13 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F13](carriles/lane-F13-configuracion-y-switches.md) | Cambiar una configuración de celebración y observar el efecto en la pantalla pertinente. | 12 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F14](carriles/lane-F14-admin-plataforma.md) | Buscar una celebración desde admin y ejecutar una acción autorizada con confirmación y error. | 07 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F15](carriles/lane-F15-rsvp-publico-magic-link.md) | Abrir magic link válido, confirmar RSVP y ver el estado; token inválido muestra recuperación. | 19 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F16](carriles/lane-F16-gestion-de-invitados.md) | Crear un invitado y verlo en la lista del anfitrión con búsqueda, vacío y error. | 17 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F17](carriles/lane-F17-resumen-y-bandejas-rsvp.md) | Confirmar un RSVP y ver el conteo en bandeja actualizado sin duplicados. | 21 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F18](carriles/lane-F18-notificaciones-in-app.md) | Recibir una notificación in-app y abrir su destino con estado leído persistido. | 23 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F19](carriles/lane-F19-push-ios-android.md) | Registrar dispositivo y recibir un push real en una plataforma; documentar bloqueo si no hay credenciales. | 24 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F20](carriles/lane-F20-acciones-desde-push.md) | Abrir una acción desde push y completar el flujo en la pantalla correcta con sesión válida o expirada. | 24 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F21](carriles/lane-F21-app-movil-del-invitado.md) | Entrar a la app del invitado, ver celebración y confirmar una acción principal con estados completos. | 19 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F22](carriles/lane-F22-lista-de-regalos-publica.md) | Ver un regalo público, reservarlo y observar indisponibilidad posterior con error de concurrencia. | 26 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F23](carriles/lane-F23-gestion-de-regalos-anfitrion.md) | Crear un regalo desde el anfitrión y verlo en la lista pública con estado de publicación. | 25 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F24](carriles/lane-F24-buscador-publico-de-proveedores.md) | Buscar una categoría y ciudad, abrir un proveedor y mantener filtros en navegación atrás. | 30 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F25](carriles/lane-F25-microsite-del-partner.md) | Abrir un microsite de partner indexable y llegar a cotización desde una ficha real. | 30 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F26](carriles/lane-F26-cotizacion-y-agenda.md) | Seleccionar fecha disponible y enviar cotización o reserva con confirmación y conflicto visibles. | 35 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F27](carriles/lane-F27-redireccion-y-atribucion.md) | Salir por /r/{listingId} desde una tarjeta y observar atribución sin enlace directo. | 31 backend | Impeccable + UI/UX Pro Max + estados + visual |
| [F28](carriles/lane-F28-portal-del-proveedor.md) | Entrar al portal del proveedor y responder una solicitud real con estados y permisos. | 29 backend | Impeccable + UI/UX Pro Max + estados + visual |

## Cierre por REQ

La ficha enumera todos los REQs. Después del primer corte, el dueño descompone los restantes en cortes de comportamiento con prueba propia y registra el mapa `REQ → slice → artefacto → resultado` en la evidencia. Ninguna lista histórica por componente se ejecuta literalmente como un plan por capas.
