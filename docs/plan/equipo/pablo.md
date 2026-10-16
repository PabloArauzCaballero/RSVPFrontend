> **Replanificación vigente (16-oct-2026):** [slices verticales y gates de CodeGraph, UX/UI y animación](../revision-vertical-slice-2026-10-16.md). Las fechas y tareas de esta ficha son objetivos históricos sujetos a reestimación con evidencia de slices completos.

# Pablo · Plataforma de frontend

> Sos el primero otra vez. `F01`–`F05` son predecesores de casi todas las pantallas del producto: nadie puede construir una vista sin design system, sin primitivas y sin cliente de API. Leo te espera el lunes de la semana 7, Miguel el de la 8 y Fabio el de la 9.

---

## Lo que te pertenece

| | |
|---|---|
| **Apps** | La estructura de `apps/universal` y de `apps/seo-web` |
| **Packages** | `design-tokens`, `ui`, `ui-web`, `api-client`, `query-hooks`, `forms`, `auth`, `i18n`, `telemetry`, `testing`, `config-*` |
| **Transversal** | CI de frontend, EAS Build, distribución a TestFlight e Internal Testing, Lighthouse CI |

Nadie más toca estos packages. Si alguien necesita una primitiva nueva, te la pide y vos la construís: así el vocabulario visual no se fragmenta.

---

## Tu calendario

| Semana | Fechas | Carriles | Foco |
|---|---|---|---|
| 06 | 23–27 nov | [F01](../carriles/lane-F01-turborepo-y-expo-router.md) · [F02](../carriles/lane-F02-design-tokens-y-nativewind.md) · [F03](../carriles/lane-F03-ui-primitivas-universales.md) | Turborepo, tokens y las once primitivas |
| 07 | 30 nov – 4 dic | [F04](../carriles/lane-F04-api-client-y-query-hooks.md) · [F05](../carriles/lane-F05-auth-sesion-y-deep-links.md) | Cliente de API, sesión y deep links |
| 08 | 7–11 dic | [F06](../carriles/lane-F06-i18n-formatos-y-timezone.md) · [F07](../carriles/lane-F07-ci-eas-y-pipelines.md) | i18n, formatos y EAS Build |
| 09 | 14–18 dic | — | **Colchón.** Integración y destrabar a los otros tres |
| 10 🎄 | 21–25 dic | — | Refuerzo |
| 11 🎄 | 28 dic – 1 ene | — | Refuerzo |
| 12 | 4–8 ene | — | E2E web globales con Playwright, entrando por Kong |
| 13 | 11–15 ene | — | E2E móvil con Maestro, builds EAS firmados, cierre |

Antes de la semana 6 estás en backend: carriles 01 a 09. Tu calendario completo está en [`RSVPBackend/docs/plan/equipo/pablo.md`](../../../../RSVPBackend/docs/plan/equipo/pablo.md).

---

## Tus carriles

| # | Carril | Entregable que lo cierra |
|---|---|---|
| [F01](../carriles/lane-F01-turborepo-y-expo-router.md) | Turborepo y Expo Router | Un `expo start` muestra la misma pantalla en iOS, Android y web |
| [F02](../carriles/lane-F02-design-tokens-y-nativewind.md) | Design tokens | Un token cambia y se refleja en las cuatro plataformas |
| [F03](../carriles/lane-F03-ui-primitivas-universales.md) | Primitivas de UI | Once primitivas con sus cuatro estados y catálogo navegable |
| [F04](../carriles/lane-F04-api-client-y-query-hooks.md) | Cliente de API | Ninguna pantalla importa `fetch`; refresh silencioso probado |
| [F05](../carriles/lane-F05-auth-sesion-y-deep-links.md) | Sesión y deep links | **El magic link abre la app en un iPhone y un Android reales** |
| [F06](../carriles/lane-F06-i18n-formatos-y-timezone.md) | i18n y formatos | Cero cadenas a mano; horas en la zona de la celebración |
| [F07](../carriles/lane-F07-ci-eas-y-pipelines.md) | CI y EAS | Binarios firmados de iOS y Android generados desde CI |

---

## Lo que los demás esperan de vos, y cuándo

| Quién | Qué necesita | Para cuándo |
|---|---|---|
| Leo | F01, F02 y F03 utilizables | fin semana 06 — arranca F08 el lunes 30 de noviembre |
| Miguel | F04 y F05 | fin semana 07 — arranca F15 el lunes 7 de diciembre |
| Fabio | F04 y F05 | fin semana 07 — arranca F22 el lunes 14 de diciembre |
| Miguel | F05 con deep links verificados en dispositivo | fin semana 07 — le bloquea F19, F20 y F21 |
| Todos | CI corriendo sus tests en cada pull request | fin semana 08 |

Si alguna de estas fechas se te va a pasar, avisá **el lunes anterior**.

---

## Riesgos de tu eje

- **Hacer que una sola base corra en iOS, Android y web lleva más tiempo del que parece.** La configuración de Metro y de transpilación de paquetes es donde se va el tiempo. Reservá el lunes de la semana 6 entero para eso.
- **El bloqueo externo del dominio y las cuentas de tienda es tuyo de confirmar.** Sin `apple-app-site-association` y `assetlinks.json` servidos desde un dominio verificado, F05 no cierra y arrastra tres carriles de Miguel. Preguntalo el lunes 23 de noviembre.
- **Una primitiva sin estado de error obliga a cada pantalla a inventarse el suyo.** Los cuatro estados —carga, error, vacío y deshabilitado— no son opcionales.
- **Tus semanas 9 a 13 están vacías a propósito.** No es holgura: es el seguro del proyecto. Cuando alguien se trabe, vas vos.
