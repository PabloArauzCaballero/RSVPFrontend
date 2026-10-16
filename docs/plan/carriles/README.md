# Carriles · RSVP Frontend

**Orden vigente:** [revisión de slices verticales](../revision-vertical-slice-2026-10-16.md). Cada ficha tiene un primer corte específico; el antiguo plan por componentes es inventario. CodeGraph sustituye Graphify y los gates visuales/motion se aplican donde correspondan.

28 órdenes de trabajo. Cada carril es una unidad de ejecución con dueño, semana, requisitos falsables y Definition of Done propio.

**Ejecución obligatoria:** al trabajar un carril, aplica [`$rsvp-frontend-lane`](../../../.agents/skills/rsvp-frontend-lane/SKILL.md) y las [convenciones de código](../../engineering/convenciones.md). Para pantallas, navegación, estilos o SEO, aplica también [`$rsvp-frontend-visual-proof`](../../../.agents/skills/rsvp-frontend-visual-proof/SKILL.md). `AGENTS.md` fija esta regla para agentes; el cumplimiento humano requiere revisión y checks de CI. Las fichas conservan su alcance específico.

---

## Todos los carriles

| # | Carril | Responsable | Semana | Predecesores |
|---|---|---|---|---|
| `F01` | [Turborepo y Expo Router universal](lane-F01-turborepo-y-expo-router.md) | Pablo | [06](../calendario/semana-06.md) | Backend 09 (publicación de `@rsvp/contracts`) |
| `F02` | [Design tokens y NativeWind](lane-F02-design-tokens-y-nativewind.md) | Pablo | [06](../calendario/semana-06.md) | F01 |
| `F03` | [Primitivas de interfaz universales](lane-F03-ui-primitivas-universales.md) | Pablo | [06](../calendario/semana-06.md) | F02 |
| `F04` | [Cliente de API y hooks de consulta](lane-F04-api-client-y-query-hooks.md) | Pablo | [07](../calendario/semana-07.md) | F01 |
| `F05` | [Sesión, guards y deep links](lane-F05-auth-sesion-y-deep-links.md) | Pablo | [07](../calendario/semana-07.md) | F04 |
| `F06` | [Internacionalización y formatos](lane-F06-i18n-formatos-y-timezone.md) | Pablo | [08](../calendario/semana-08.md) | F02 |
| `F07` | [CI, EAS Build y distribución](lane-F07-ci-eas-y-pipelines.md) | Pablo | [08](../calendario/semana-08.md) | F01 |
| `F08` | [Isla SEO con Next.js](lane-F08-seo-web-bootstrap.md) | Leo | [07](../calendario/semana-07.md) | F02 · F03 |
| `F09` | [Motor de templates theme-driven](lane-F09-celebration-theme-engine.md) | Leo | [08](../calendario/semana-08.md) | F08 |
| `F10` | [Sitio público de la celebración](lane-F10-sitio-publico-celebracion.md) | Leo | [09](../calendario/semana-09.md) | F09 |
| `F11` | [Onboarding y editor de contenido](lane-F11-onboarding-y-editor-de-contenido.md) | Leo | [10](../calendario/semana-10.md) | F09 |
| `F12` | [Templates, vista previa y publicación](lane-F12-templates-preview-y-publicacion.md) | Leo | [11](../calendario/semana-11.md) | F11 |
| `F13` | [Configuración y modos de control](lane-F13-configuracion-y-switches.md) | Leo | [12](../calendario/semana-12.md) | F11 |
| `F14` | [Admin de plataforma](lane-F14-admin-plataforma.md) | Leo | [12](../calendario/semana-12.md) | F03 · F04 |
| `F15` | [RSVP público por magic link](lane-F15-rsvp-publico-magic-link.md) | Miguel | [08](../calendario/semana-08.md) | F05 |
| `F16` | [Gestión de invitados](lane-F16-gestion-de-invitados.md) | Miguel | [08](../calendario/semana-08.md) | F03 · F04 |
| `F17` | [Resumen de RSVP y bandeja de acompañantes](lane-F17-resumen-y-bandejas-rsvp.md) | Miguel | [09](../calendario/semana-09.md) | F16 |
| `F18` | [Notificaciones in-app y preferencias](lane-F18-notificaciones-in-app.md) | Miguel | [09](../calendario/semana-09.md) | F04 |
| `F19` | [Push en la app: permisos y recepción](lane-F19-push-ios-android.md) | Miguel | [10](../calendario/semana-10.md) | F05 · F07 · Backend 24 |
| `F20` | [Acciones desde la notificación](lane-F20-acciones-desde-push.md) | Miguel | [11](../calendario/semana-11.md) | F19 |
| `F21` | [App móvil del invitado](lane-F21-app-movil-del-invitado.md) | Miguel | [12](../calendario/semana-12.md) | F05 · F15 |
| `F22` | [Lista de regalos pública](lane-F22-lista-de-regalos-publica.md) | Fabio | [09](../calendario/semana-09.md) | F10 |
| `F23` | [Gestión de regalos del anfitrión](lane-F23-gestion-de-regalos-anfitrion.md) | Miguel | [13](../calendario/semana-13.md) | F22 |
| `F24` | [Buscador público de proveedores](lane-F24-buscador-publico-de-proveedores.md) | Leo | [13](../calendario/semana-13.md) | F08 |
| `F25` | [Microsite del partner](lane-F25-microsite-del-partner.md) | Fabio | [10](../calendario/semana-10.md) | F24 |
| `F26` | [Cotización y agenda en el microsite](lane-F26-cotizacion-y-agenda.md) | Fabio | [11](../calendario/semana-11.md) | F25 |
| `F27` | [Redirección y atribución en el frontend](lane-F27-redireccion-y-atribucion.md) | Fabio | [12](../calendario/semana-12.md) | F25 |
| `F28` | [Portal del proveedor](lane-F28-portal-del-proveedor.md) | Fabio | [13](../calendario/semana-13.md) | F25 · F26 |

---

## Por responsable

### [Pablo](../equipo/pablo.md) · 7 carriles

- `F01` [Turborepo y Expo Router universal](lane-F01-turborepo-y-expo-router.md) — semana 06
- `F02` [Design tokens y NativeWind](lane-F02-design-tokens-y-nativewind.md) — semana 06
- `F03` [Primitivas de interfaz universales](lane-F03-ui-primitivas-universales.md) — semana 06
- `F04` [Cliente de API y hooks de consulta](lane-F04-api-client-y-query-hooks.md) — semana 07
- `F05` [Sesión, guards y deep links](lane-F05-auth-sesion-y-deep-links.md) — semana 07
- `F06` [Internacionalización y formatos](lane-F06-i18n-formatos-y-timezone.md) — semana 08
- `F07` [CI, EAS Build y distribución](lane-F07-ci-eas-y-pipelines.md) — semana 08

### [Leo](../equipo/leo.md) · 8 carriles

- `F08` [Isla SEO con Next.js](lane-F08-seo-web-bootstrap.md) — semana 07
- `F09` [Motor de templates theme-driven](lane-F09-celebration-theme-engine.md) — semana 08
- `F10` [Sitio público de la celebración](lane-F10-sitio-publico-celebracion.md) — semana 09
- `F11` [Onboarding y editor de contenido](lane-F11-onboarding-y-editor-de-contenido.md) — semana 10
- `F12` [Templates, vista previa y publicación](lane-F12-templates-preview-y-publicacion.md) — semana 11
- `F13` [Configuración y modos de control](lane-F13-configuracion-y-switches.md) — semana 12
- `F14` [Admin de plataforma](lane-F14-admin-plataforma.md) — semana 12
- `F24` [Buscador público de proveedores](lane-F24-buscador-publico-de-proveedores.md) — semana 13

### [Miguel](../equipo/miguel.md) · 8 carriles

- `F15` [RSVP público por magic link](lane-F15-rsvp-publico-magic-link.md) — semana 08
- `F16` [Gestión de invitados](lane-F16-gestion-de-invitados.md) — semana 08
- `F17` [Resumen de RSVP y bandeja de acompañantes](lane-F17-resumen-y-bandejas-rsvp.md) — semana 09
- `F18` [Notificaciones in-app y preferencias](lane-F18-notificaciones-in-app.md) — semana 09
- `F19` [Push en la app: permisos y recepción](lane-F19-push-ios-android.md) — semana 10
- `F20` [Acciones desde la notificación](lane-F20-acciones-desde-push.md) — semana 11
- `F21` [App móvil del invitado](lane-F21-app-movil-del-invitado.md) — semana 12
- `F23` [Gestión de regalos del anfitrión](lane-F23-gestion-de-regalos-anfitrion.md) — semana 13

### [Fabio](../equipo/fabio.md) · 5 carriles

- `F22` [Lista de regalos pública](lane-F22-lista-de-regalos-publica.md) — semana 09
- `F25` [Microsite del partner](lane-F25-microsite-del-partner.md) — semana 10
- `F26` [Cotización y agenda en el microsite](lane-F26-cotizacion-y-agenda.md) — semana 11
- `F27` [Redirección y atribución en el frontend](lane-F27-redireccion-y-atribucion.md) — semana 12
- `F28` [Portal del proveedor](lane-F28-portal-del-proveedor.md) — semana 13

---

## Qué contiene cada ficha

| Sección | Para qué sirve |
|---|---|
| **Objetivo** | Por qué existe este carril y qué cambia cuando está hecho |
| **Requisitos** | Cada `REQ` con su forma de demostrarlo. Falsable: o pasa su prueba, o no pasa |
| **Qué se construye** | Los archivos y módulos que salen de este carril |
| **Plan por slices** | El orden. Cada slice termina con sus pruebas en verde antes del siguiente |
| **Plan de pruebas** | Los casos concretos, incluidos los de concurrencia y los de fuga cross-tenant |
| **Definition of Done** | Lo específico del carril, más el DoD general que aplica a todos |
| **Riesgos** | Las trampas conocidas. Se leen antes de empezar, no después de caer |
| **Preguntas abiertas** | Lo que no se puede resolver sin el propietario. No se inventa |

---

## Estados posibles

`NOT_STARTED` → `IN_PROGRESS` → `IMPLEMENTED` → `TESTED` → `REGRESSION_VERIFIED` → `DONE`

Un requisito queda en `PASS` o en `BLOCKED-EXTERNAL` con evidencia concreta.
**`PARTIAL` no permite cerrar un carril.** O se termina, o se declara bloqueado con una razón que otra persona pueda verificar.
