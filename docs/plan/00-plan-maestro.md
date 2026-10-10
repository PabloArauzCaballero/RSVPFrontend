> Plan maestro del frontend. Es la referencia estable del producto visible.
> El reparto por persona está en [`equipo/`](equipo/), el calendario en [`calendario/`](calendario/)
> y las órdenes de trabajo en [`carriles/`](carriles/).
> El plan de backend vive en `RSVPBackend/docs/plan/`.

---

# Plan Maestro · Plataforma de Celebraciones (RSVP) · Frontend

Turborepo · Expo Router universal (iOS + Android + Web) + isla Next.js para SEO · NativeWind

---

## 17. Contexto

El cliente exige **web responsive** y **app nativa iOS + Android**, y que el producto esté **desarrollado con Turborepo y React Native**. A la vez, el negocio depende de que el directorio de proveedores y las fichas de partner **posicionen en Google**, porque ahí nace el lead orgánico — y Expo web exporta una SPA, no hace SSR.

La resolución es **una sola base React Native para el producto, más una isla Next.js solo para lo indexable**. Todo el dashboard del anfitrión, el portal del proveedor, el admin y las tres plataformas móviles/web salen de un único código Expo Router. Únicamente el sitio público de la celebración, el buscador de proveedores y los microsites de partner —las cuatro cosas que Google debe leer— se renderizan en servidor con Next.js. Ambas aplicaciones consumen **los mismos packages compartidos**: tokens de diseño, cliente de API, hooks de TanStack Query, schemas Zod e i18n.

Aparece además una superficie que el Event Storming no tenía: el **mini-marketplace**. Un partner sin web propia necesita un destino al que redirigirlo, porque si no hay destino no hay lead y no hay negocio. La plataforma le genera un microsite en `/p/{slug}` con catálogo, cotización y agenda. La logística posterior —traslado, entrega, ir al lugar— es responsabilidad declarada del partner o del cliente; la plataforma la **muestra**, no la opera.

**Esta parte depende del Contract Freeze del backend, pero arranca en paralelo** contra mocks MSW generados desde el OpenAPI.

---

## 18. Decisiones de arquitectura frontend (cerradas)

| # | Decisión | Elección | Consecuencia |
|---|---|---|---|
| F1 | Base del producto | **Expo Router universal** (iOS + Android + Web) | Una sola base RN para dashboard, portal partner, admin y móvil |
| F2 | SEO | **Isla `apps/seo-web` en Next.js** (App Router, SSR/ISR) | Solo sitio público, buscador, microsites y redirector |
| F3 | Estilos | **NativeWind** + package `design-tokens` + Tailwind en Next | Un token cambia y se propaga a las 4 plataformas |
| F4 | Templates de celebración | **Theme-driven**: layouts base + tema por datos | Template nuevo = fila en DB, sin desplegar front |
| F5 | Estado servidor | **TanStack Query** + cliente generado del OpenAPI | Caché, reintentos, invalidación por evento |
| F6 | Formularios | **React Hook Form + Zod**, schemas compartidos con el back | Una sola definición de validación |
| F7 | Contratos | `@rsvp/contracts` **publicado por el CI del backend** a GitHub Packages | Repos independientes, versionado semántico explícito |
| F8 | Mocks | **MSW** con handlers generados del OpenAPI | El front no puede desviarse del contrato sin romper un test |
| F9 | i18n | **i18next universal** (RN + Next), `es-BO` y `en-US` al lanzar | Añadir idioma = cargar un archivo |
| F10 | Distribución móvil | **EAS Build** + TestFlight / Internal Testing + EAS Update | Binarios reales firmados en CI, sin publicar a tienda aún |
| F11 | Carriles | **Mismos 4 ejes que el backend**, en paralelo contra MSW | Propiedad vertical por dominio, cero tiempo muerto |

---

## 19. Estructura del monorepo frontend

```
RSVPFrontend/
├── .claude/                        # mismo harness que el backend (§7), reglas adaptadas a front
│   ├── CLAUDE.md
│   ├── rules/                      # + 50-ui-universal.md · 55-seo.md · 65-a11y.md · 75-mobile.md
│   ├── skills/
│   │   ├── rsvp-front-master/
│   │   ├── rsvp-visual-proof/      # evidencia de responsive y de pantalla real
│   │   └── lane-F01-… lane-F28-…
│   └── hooks/
├── tareas/                         # fichas TAREA-F01-… de especificación
├── docs/progress/evidence/lane-FXX/
├── apps/
│   ├── universal/                  # ★ Expo Router · iOS + Android + Web
│   │   └── app/
│   │       ├── (auth)/             # login, registro, recuperar
│   │       ├── (host)/             # dashboard del anfitrión
│   │       ├── (provider)/         # portal del proveedor
│   │       ├── (admin)/            # admin de plataforma
│   │       ├── (guest)/            # RSVP y regalos para invitado logueado / deep link
│   │       └── _layout.tsx
│   └── seo-web/                    # ★ Next.js App Router · SSR/ISR · solo indexable
│       └── app/
│           ├── c/[slug]/           # sitio público de la celebración
│           ├── proveedores/        # buscador por categoría y ciudad
│           ├── p/[slug]/           # microsite del partner (mini-marketplace)
│           └── r/[listingId]/      # redirector 302 (route handler, sin UI)
├── packages/
│   ├── design-tokens/              # colores, tipografía, espaciado, radios, sombras, temas
│   ├── ui/                         # primitivas universales RN (Button, Input, Card, Sheet, …)
│   ├── ui-web/                     # shadcn/ui para la isla SEO
│   ├── celebration-theme/          # motor theme-driven: layouts + aplicación de tema por datos
│   ├── api-client/                 # cliente generado de @rsvp/contracts + interceptores
│   ├── query-hooks/                # hooks TanStack Query por dominio
│   ├── forms/                      # schemas Zod + resolvers RHF compartidos
│   ├── i18n/                       # i18next, catálogos, formateo Intl
│   ├── auth/                       # sesión, refresh, guards por rol, deep-link del magic link
│   ├── telemetry/                  # OTel web + RN, correlationId hacia el gateway
│   ├── testing/                    # MSW handlers, factories, render helpers, matchers a11y
│   └── config-{eslint,ts,tailwind,jest}/
├── e2e/
│   ├── playwright/                 # E2E web + visual regression por breakpoint
│   └── maestro/                    # flows iOS + Android
├── turbo.json
└── package.json                    # Yarn 4 workspaces
```

**Regla de frontera**: `apps/seo-web` **nunca** importa de `packages/ui` (RN); usa `packages/ui-web`. Ambas comparten `design-tokens`, `api-client`, `query-hooks`, `forms`, `i18n` y `telemetry`. Un test de arquitectura lo verifica, igual que el del dominio hexagonal en el backend.

---

## 20. Inventario de pantallas

86 pantallas en 6 superficies. Cada una es un REQ trazable en su carril.

### A · Sitio público de la celebración — `apps/seo-web` (SSR/ISR, indexable)

| # | Pantalla | Ruta | Notas |
|---|---|---|---|
| A1 | Portada de la celebración | `/c/{slug}` | Hero con template, cuenta regresiva, datos clave, Open Graph para WhatsApp |
| A2 | Nuestra historia | `/c/{slug}/historia` | Bloques de texto e imagen; vocabulario según tipo de evento |
| A3 | Itinerario | `/c/{slug}/itinerario` | Horarios en la tz de la celebración |
| A4 | Lugares y cómo llegar | `/c/{slug}/lugares` | Ceremonia, recepción, mapa, link a navegación |
| A5 | Galería | `/c/{slug}/galeria` | Lightbox, lazy loading, variantes webp |
| A6 | Dress code | `/c/{slug}/dress-code` | Sección opcional por `enabledSections` |
| A7 | FAQ | `/c/{slug}/faq` | Acordeón, indexable |
| A8 | Recomendaciones | `/c/{slug}/recomendaciones` | Hospedaje y transporte; **aquí entran partners** |
| A9 | RSVP por magic link | `/c/{slug}/rsvp/{token}` | Confirmar / rechazar, acompañantes, dieta, mensaje |
| A10 | RSVP — estado confirmado | `/c/{slug}/rsvp/{token}` | Editable hasta el deadline, con contador |
| A11 | RSVP — fuera de plazo | — | Estado `409 RsvpWindowClosed` con mensaje claro |
| A12 | RSVP — token inválido o revocado | — | `401`, sin filtrar información de la celebración |
| A13 | RSVP de no registrado | `/c/{slug}/rsvp` | Solo si `unregisteredRsvpMode = AUTO_ACCEPT` |
| A14 | Lista de regalos | `/c/{slug}/regalos` | Catálogo; **productos de partner primero** |
| A15 | Detalle de regalo | `/c/{slug}/regalos/{id}` | Precio con `Money`, link al partner (vía `/r/`) |
| A16 | Solicitar reserva | — | Modal con identificación del invitado |
| A17 | Reserva — pendiente de aprobación | — | Modo `RESTRICTED` |
| A18 | Reserva — confirmada | — | Modo `AUTO_ACCEPT` |
| A19 | Reserva — regalo ya tomado | — | `409 GiftNotAvailable`, sugiere alternativas |
| A20 | Proveedores de la celebración | `/c/{slug}/proveedores` | Partners sugeridos por geo y categoría |
| A21 | Celebración no publicada / archivada | — | 404 controlado, sin revelar datos |

### B · Buscador público de proveedores y microsites — `apps/seo-web` (el embudo del negocio)

| # | Pantalla | Ruta | Notas |
|---|---|---|---|
| B1 | Home del directorio | `/proveedores` | Categorías, ciudades destacadas, buscador |
| B2 | Listado por categoría | `/proveedores/{categoria}` | SSR + paginación indexable |
| B3 | Listado por categoría y ciudad | `/proveedores/{categoria}/{ciudad}` | **Long tail SEO**: "salón de eventos Santa Cruz" |
| B4 | Resultados con filtros | `/proveedores/buscar` | Geo, precio, verificado, disponibilidad |
| B5 | **Microsite del partner — portada** | `/p/{slug}` | Hero, descripción, galería, zona de cobertura, JSON-LD `LocalBusiness` |
| B6 | Microsite — catálogo | `/p/{slug}/catalogo` | Servicios y productos con precio en su moneda |
| B7 | Microsite — detalle de item | `/p/{slug}/catalogo/{sku}` | **`fulfillment` visible**: quién se responsabiliza, zona, costo de traslado, plazos |
| B8 | Microsite — carrito de intención | `/p/{slug}/cotizar` | Selección de items + fecha + invitados + presupuesto |
| B9 | Microsite — solicitud enviada | — | Confirmación + copia por email; genera lead `FORM` |
| B10 | Microsite — agenda y disponibilidad | `/p/{slug}/agenda` | Calendario con días libres en la tz del partner |
| B11 | Microsite — solicitar fecha | — | `BookingRequest`; `409` si se tomó el último cupo |
| B12 | Microsite — contacto directo | — | Botones a WhatsApp / teléfono / email, **todos vía `/r/`** |
| B13 | Redirector | `/r/{listingId}` | Route handler: registra el `Lead`, inyecta UTM, responde **302** |
| B14 | Partner no verificado / suspendido | — | 404 controlado |

### C · Dashboard del anfitrión — `apps/universal` (web + iOS + Android)

| # | Pantalla | Grupo |
|---|---|---|
| C1 | Login / registro / recuperar contraseña | `(auth)` |
| C2 | Selector de celebración · crear nueva | `(host)` |
| C3 | Onboarding 1 — tipo de evento (boda, quinceaños, bautizo…) | `(host)` |
| C4 | Onboarding 2 — datos básicos, fecha, idioma, timezone, moneda | `(host)` |
| C5 | Onboarding 3 — elegir template con preview en vivo | `(host)` |
| C6 | Home — resumen: confirmados, pendientes, días restantes, solicitudes abiertas | `(host)` |
| C7 | Editor — datos del anfitrión (pareja / quinceañera, según `hostRoles`) | `(host)` |
| C8 | Editor — ceremonia, recepción y ubicaciones con mapa | `(host)` |
| C9 | Editor — historia | `(host)` |
| C10 | Editor — itinerario | `(host)` |
| C11 | Editor — secciones (dress code, recomendaciones, FAQ) | `(host)` |
| C12 | Editor — galería: subida, reordenar, portada | `(host)` |
| C13 | Traducciones del contenido por idioma | `(host)` |
| C14 | Galería de templates + cambiar template | `(host)` |
| C15 | Preview del sitio (desktop / tablet / móvil) | `(host)` |
| C16 | Publicar: checklist de campos mínimos + validación + publicar | `(host)` |
| C17 | Configuración — idiomas, timezone, moneda, deadline de RSVP | `(host)` |
| C18 | Configuración — **los 4 switches AUTO_ACCEPT / RESTRICTED** | `(host)` |
| C19 | Invitados — lista con filtros, búsqueda y estado | `(host)` |
| C20 | Invitados — alta individual | `(host)` |
| C21 | Invitados — importación CSV con reporte de errores por fila | `(host)` |
| C22 | Invitados — grupos familiares / mesas | `(host)` |
| C23 | Invitados — detalle: reenviar, copiar o revocar magic link | `(host)` |
| C24 | RSVP — resumen y reporte (acompañantes, dietas, exportar) | `(host)` |
| C25 | **Bandeja — reservas de regalo pendientes** (aprobar / rechazar) | `(host)` |
| C26 | Bandeja — solicitudes de acompañantes extra | `(host)` |
| C27 | Regalos — armar lista desde el catálogo de partners | `(host)` |
| C28 | Regalos — añadir regalo externo (última opción, con fricción explícita) | `(host)` |
| C29 | Regalos — estado de cada ítem (disponible / pendiente / comprometido) | `(host)` |
| C30 | Descubrir proveedores desde el dashboard | `(host)` |
| C31 | Notificaciones in-app + preferencias por canal | `(host)` |
| C32 | Perfil, organización y equipo (si es planner) | `(host)` |

### D · Portal del proveedor — `apps/universal`

| # | Pantalla |
|---|---|
| D1 | Registro y alta de proveedor |
| D2 | Onboarding — datos legales, ubicación, categorías, documentos |
| D3 | Estado de verificación (pendiente / verificado / suspendido) |
| D4 | **Editor del microsite** — secciones, portada, galería, descripción, i18n |
| D5 | Servicios (`ServiceListing`) — alta, edición, publicación |
| D6 | Productos (`ProductListing`) — alta, SKU, precio, stock hint |
| D7 | **Destinos de redirección y UTM por destino** (≥1 obligatorio) |
| D8 | **Condiciones de fulfillment** — responsable, cobertura, costo de traslado, plazos |
| D9 | Configuración de leads — dedupe, cap mensual, modelo de facturación |
| D10 | Agenda — publicar disponibilidad, reglas recurrentes y bloqueos |
| D11 | Solicitudes de reserva de fecha (confirmar / rechazar) |
| D12 | Solicitudes de cotización recibidas |
| D13 | **Métricas** — impresiones, clics, CTR, leads válidos por día / categoría / destino |
| D14 | Plan y facturación (lectura) |
| D15 | Notificaciones y preferencias de push |

### E · Admin de plataforma — `apps/universal` (web-first)

| # | Pantalla |
|---|---|
| E1 | Login admin |
| E2 | Dashboard global de plataforma |
| E3 | Templates — alta, publicar, archivar, tags por tipo de evento |
| E4 | **Tipos de evento (`EventTypeDefinition`)** — campos mínimos, secciones, roles, traducciones |
| E5 | Categorías de proveedor + traducciones |
| E6 | Geografía — países, departamentos, ciudades (Bolivia sembrada) |
| E7 | Cola de verificación de proveedores |
| E8 | Moderación — microsites y regalos externos propuestos |
| E9 | Usuarios y roles |
| E10 | Organizaciones (wedding planners) |
| E11 | Métricas de leads globales y por partner |
| E12 | Estado operativo — colas, parking, enlace a Grafana |

### F · Específico móvil (iOS + Android)

| # | Pantalla / capacidad |
|---|---|
| F1 | Splash + enrutador de deep links (universal links / app links) |
| F2 | Magic link del invitado abre la app si está instalada, si no el web |
| F3 | Registro de device token (Expo Push) y permisos |
| F4 | **Aprobar o rechazar una reserva desde la notificación push** |
| F5 | Push al partner: lead nuevo, cap alcanzado, solicitud de fecha |
| F6 | Centro de notificaciones nativo |

---

## 21. Motor de templates theme-driven

El Template/Media Service devuelve un JSON por template. El front **no programa un componente por template**:

```ts
type CelebrationTheme = {
  layout: 'classic' | 'minimal' | 'editorial' | 'festive' | 'corporate'
  palette: { bg, surface, primary, accent, text, muted, border }   // light + dark
  typography: { display, body, scale }
  sectionStyle: { cardRadius, dividers, imageTreatment, heroVariant }
  sectionOrder: SectionKey[]
  enabledSections: SectionKey[]
}
```

`packages/celebration-theme` expone `<CelebrationRenderer theme={...} content={...} />`: elige el layout, aplica la paleta como CSS variables (web) o como contexto de NativeWind (RN) y compone las secciones en el orden indicado. **Añadir un template es insertar una fila en `template_db`**, sin tocar ni desplegar el front — igual que `EventTypeDefinition` en el backend.

Los 5 layouts base se construyen una vez, en el carril de Leo, y se prueban con snapshot visual por breakpoint.

---

## 22. Los 28 carriles de frontend

Mismos 4 ejes, misma propiedad vertical. Arrancan **en paralelo al backend** desde el Contract Freeze, contra MSW.

### 🟦 Eje A — **Pablo** · Plataforma frontend (7 carriles)

| Lane | Nombre | Criterio de cierre |
|---|---|---|
| F01 | `turborepo-y-expo-router` | `yarn turbo run build lint test` verde; `apps/universal` corre en iOS, Android y web desde un solo `expo start` |
| F02 | `design-tokens-y-nativewind` | Un token cambia y se refleja en las 4 plataformas; dark mode; test de frontera `seo-web` ⇏ `packages/ui` |
| F03 | `ui-primitivas-universales` | Button, Input, Select, Card, Sheet, Modal, Toast, Table, DatePicker, FileUpload con tests de RTL y estados de carga/error/vacío |
| F04 | `api-client-y-query-hooks` | Cliente generado de `@rsvp/contracts`; interceptor de refresh; `correlationId` propagado; reintentos y caché por dominio |
| F05 | `auth-sesion-y-deep-links` | Login, refresh silencioso, guards por rol, **universal links / app links verificados en un dispositivo real de cada plataforma** |
| F06 | `i18n-formatos-y-timezone` | es-BO y en-US; fechas, números y moneda con `Intl`; **todo se renderiza en la tz de la celebración, no la del dispositivo** |
| F07 | `ci-eas-y-pipelines` | CI con `turbo --affected`; **EAS Build produce binarios firmados de iOS y Android**; TestFlight + Internal Testing; EAS Update configurado |

### 🟩 Eje B — **Leo** · Celebración, templates y sitio público (7 carriles)

| Lane | Nombre | Criterio de cierre |
|---|---|---|
| F08 | `seo-web-bootstrap` | Next.js App Router con SSR/ISR, sitemap, robots, Open Graph, JSON-LD. **Lighthouse SEO ≥ 95** en las rutas indexables |
| F09 | `celebration-theme-engine` | Los 5 layouts + aplicación de tema por datos. **Test: añadir un template solo con una fila de DB cambia el sitio, sin desplegar** |
| F10 | `sitio-publico-celebracion` | A1–A8 y A21. Responsive verificado por snapshot en 3 breakpoints; multi-idioma; itinerario en la tz correcta |
| F11 | `onboarding-y-editor-de-contenido` | C3–C13: tipo de evento, datos, historia, itinerario, secciones, galería con subida a MinIO y traducciones |
| F12 | `templates-preview-y-publicacion` | C5, C14–C16. **Cambiar template no pierde contenido**; el checklist de publicación refleja `requiredFieldsForPublish` del tipo de evento |
| F13 | `configuracion-y-switches` | C17–C18: los 4 switches AUTO/RESTRICTED con explicación de consecuencia y confirmación. Test de que el cambio **no** es retroactivo en la UI |
| F14 | `admin-plataforma` | E1–E12, incluido el editor de `EventTypeDefinition` y la cola de verificación |

### 🟨 Eje C — **Miguel** · Invitados, RSVP, notificaciones y móvil (7 carriles)

| Lane | Nombre | Criterio de cierre |
|---|---|---|
| F15 | `rsvp-publico-magic-link` | A9–A13. Los 4 estados (ok, fuera de plazo, token inválido, no registrado) con pantalla propia y mensaje accionable |
| F16 | `gestion-de-invitados` | C19–C23: lista, alta, CSV con reporte por fila, grupos, reenviar/revocar token |
| F17 | `resumen-y-bandejas-rsvp` | C24, C26: reporte exportable y aprobación de acompañantes extra |
| F18 | `notificaciones-in-app` | C31, F6: centro de notificaciones y preferencias por canal |
| F19 | `push-ios-android` | F3–F5: permisos, registro de device token, recepción en foreground/background/cerrada. **Evidencia de push real en un iPhone y un Android** |
| F20 | `acciones-desde-push` | F4: aprobar o rechazar una reserva **desde la notificación**, con deep link al detalle |
| F21 | `app-movil-del-invitado` | F1–F2: el magic link abre la app si está instalada; RSVP y regalos en móvil; fallback a web |

### 🟥 Eje D — **Fabio** · Regalos, partners y marketplace · **el negocio** (7 carriles)

| Lane | Nombre | Criterio de cierre |
|---|---|---|
| F22 | `lista-de-regalos-publica` | A14–A19. **Productos de partner primero**, verificado en el orden renderizado; los 3 desenlaces de reserva con pantalla propia |
| F23 | `gestion-de-regalos-anfitrion` | C25, C27–C29: bandeja de reservas, armado desde catálogo, regalo externo con fricción explícita |
| F24 | `buscador-publico-de-proveedores` | B1–B4. **Rutas `/{categoria}/{ciudad}` indexables con metadatos y JSON-LD**; Lighthouse SEO ≥ 95 |
| F25 | `microsite-del-partner` | B5–B7, B14. Portada, catálogo, detalle con **`fulfillment` visible y deslinde de la plataforma** |
| F26 | `cotizacion-y-agenda` | B8–B11: carrito de intención, formulario de cotización, calendario de disponibilidad y solicitud de fecha con `409` en el último cupo |
| F27 | `redireccion-y-atribucion` | B12–B13. **Test E2E: el clic sale 302 con UTM y `correlationId`, y el lead aparece en métricas.** Ningún enlace a partner escapa del redirector (test que escanea el DOM) |
| F28 | `portal-del-proveedor` | D1–D15, incluidos destinos+UTM, `leadConfig`, fulfillment, agenda y el **dashboard de métricas de leads** |

### Dependencias

`F02→F01` · `F03→F02` · `F04→F01` · `F05→F04` · `F09→F02` · `F10→F08,F09` · `F12→F09` · `F15→F05` · `F19→F05,F07` · `F20→F19` · `F21→F05,F15` · `F24→F08` · `F25→F24` · `F26→F25` · `F27→F25` · `F28→F25`.

> ⚠️ **Pablo es cuello de botella de las dos primeras semanas**: `F01`–`F05` son predecesoras de casi todo. Debe entregarlas antes que nada; el resto trabaja mientras tanto en MSW + pantallas estáticas sin datos.

---

## 23. Pruebas y Definition of Done del frontend

| Nivel | Herramienta | Qué cubre |
|---|---|---|
| Unitario | **Jest** | Hooks, utilidades, formateo, motor de tema, lógica de permisos |
| Componente | **Testing Library** (`/react-native` y `/react`) | Render, interacción, estados de carga/error/vacío, roles accesibles |
| Contrato | **MSW** con handlers generados del OpenAPI + **Pact consumer** | El front falla si se desvía del contrato; los servicios verifican el Pact |
| E2E web | **Playwright** contra el stack real, entrando por Kong | Los 8 flujos del backend + los propios del front |
| Visual | **Playwright snapshots** por breakpoint (360 / 768 / 1280) | "Responsive" deja de ser opinión y pasa a ser un test |
| E2E móvil | **Maestro** en simulador iOS y emulador Android en CI | RSVP por deep link, aprobar reserva desde push, métricas de partner |
| Accesibilidad | **axe** + `eslint-plugin-jsx-a11y` + `accessibilityLabel` en RN | Contraste, foco, roles, lectores de pantalla |
| SEO | **Lighthouse CI** en las rutas de `seo-web` | Umbral bloqueante SEO ≥ 95, Performance ≥ 85 |

### Flujos E2E obligatorios del frontend

1. **Alta completa**: registrarse → crear celebración de QUINCEAÑOS → configurar → elegir template → publicar → abrir el sitio público.
2. **RSVP por magic link** en web y, por deep link, en la app móvil.
3. **RSVP fuera de plazo** → pantalla de plazo cerrado, sin permitir el envío.
4. **Reserva de regalo en modo RESTRICTED** → el anfitrión la aprueba **desde el push** en móvil → el invitado ve el cambio.
5. **Reserva en modo AUTO_ACCEPT** → confirmación inmediata, sin bandeja.
6. **Regalo ya tomado** → `409` con alternativas sugeridas.
7. **Lead de partner**: buscador → ficha → clic a WhatsApp → **302 con UTM** → el lead aparece en el dashboard del partner.
8. **Microsite sin landing**: cotización con items y fecha → el partner la recibe y responde.
9. **Reserva de fecha**: dos clientes al último cupo → uno confirma, el otro ve `409`.
10. **Multi-idioma y timezone**: la misma celebración en `es-BO` y `en-US`, con el itinerario en la tz del evento desde un dispositivo en otra tz.

### Definition of Done — cada carril de frontend

- [ ] Todos los REQ en `PASS` o `BLOCKED-EXTERNAL` con evidencia. **`PARTIAL` no permite `DONE`.**
- [ ] Tests unitarios y de componente de todas las pantallas del carril, incluidos estados de carga, error y vacío.
- [ ] MSW cubriendo todas las respuestas del contrato, **incluidos los códigos de error** (401, 403, 409, 422).
- [ ] Pact del consumidor publicado y verificado por el servicio proveedor.
- [ ] **Cobertura ≥ 85 % en `packages/` y ≥ 75 % en pantallas.** El build falla por debajo.
- [ ] Playwright verde + **snapshots visuales en los 3 breakpoints** aprobados.
- [ ] Si toca móvil: flow de **Maestro verde en iOS y en Android**, y evidencia en dispositivo real.
- [ ] Si toca rutas indexables: **Lighthouse SEO ≥ 95**, metadatos, Open Graph y JSON-LD verificados.
- [ ] axe sin violaciones críticas; navegable por teclado; `accessibilityLabel` en los controles de RN.
- [ ] Cero cadenas hardcodeadas: todo pasa por i18n, en `es-BO` y `en-US`.
- [ ] Fechas y horas renderizadas en la **timezone de la celebración**, no la del dispositivo.
- [ ] **Ningún enlace a un partner fuera del redirector `/r/`** (test que escanea el DOM renderizado).
- [ ] Cero flakes: la suite del carril corre 3 veces seguidas en CI sin fallar.
- [ ] Evidencia en `docs/progress/evidence/lane-FXX/` con capturas por breakpoint y por plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final declarado con la Claim Ladder: `REGRESSION_VERIFIED` antes de `DONE`.

---

## 24. Verificación extremo a extremo del frontend

```bash
cd RSVPFrontend

# 1. Instalar y construir
yarn install && yarn turbo run build lint test

# 2. Desarrollo contra MSW (sin backend levantado)
yarn workspace universal start          # i → iOS · a → Android · w → web
yarn workspace seo-web dev              # http://localhost:3000

# 3. Desarrollo contra el backend real
cd ../RSVPBackend && docker compose up -d && cd ../RSVPFrontend
API_URL=http://localhost:8000 yarn dev  # todo pasa por Kong

# 4. E2E y visual
yarn e2e:web                            # Playwright + snapshots en 3 breakpoints
yarn e2e:mobile:ios                     # Maestro en simulador
yarn e2e:mobile:android                 # Maestro en emulador

# 5. Calidad
yarn lighthouse                         # SEO ≥ 95 en rutas indexables
yarn a11y                               # axe sin violaciones críticas
yarn pact:publish                       # contratos del consumidor

# 6. Binarios reales
eas build --profile preview --platform all
#   → TestFlight (iOS) e Internal Testing (Android)

# 7. Comprobaciones manuales
#  · Magic link en un iPhone y un Android con la app instalada → abre la app
#  · Push de solicitud de reserva → aprobar desde la notificación
#  · curl -I "localhost:3000/r/{listingId}?destination=WHATSAPP" → 302 con UTM
#  · Misma celebración en es-BO y en-US desde un dispositivo en otra timezone
```

---

## 25. Fuera de alcance del frontend

Publicación en App Store y Google Play (queda todo listo, no se publica), pasarela de pago y checkout real (el marketplace llega hasta cotización y contacto), operación logística de entregas (solo se **declara**, no se opera), PWA instalable con offline, y soporte RTL.

---

## 26. Preguntas abiertas del frontend

- **P-F01 · Accesibilidad WCAG 2.2 AA como umbral bloqueante.** No la marcaste. El plan incluye un baseline (roles, labels, foco, contraste, axe sin críticos), pero **no** la certificación AA completa. Para un cliente internacional suele ser exigencia contractual: si la necesitás, hay que elevarlo a gate y sumar auditoría manual por carril.
- **P-F02 · PWA instalable y offline.** Muy útil el día del evento, donde el salón suele no tener señal (itinerario y ubicación cacheados). Quedó fuera; se puede añadir a `seo-web` con poco costo si lo querés.
- **P-F03 · Identidad visual.** No hay Figma ni marca definida. El plan asume que el equipo define los tokens iniciales. Si el cliente tiene manual de marca, hay que incorporarlo antes del carril `F02`.
- **P-F04 · Dominio y cuentas de tienda.** Los universal links y app links exigen un dominio verificado (`apple-app-site-association` y `assetlinks.json`) y cuentas de Apple Developer y Google Play. Sin eso, el carril `F05` queda `BLOCKED-EXTERNAL`.
- **P-F05 · Cuántos layouts base.** El plan fija 5 (classic, minimal, editorial, festive, corporate). Si el cliente espera más diferenciación visual entre bodas y quinceaños, hay que subir el número y eso alarga el carril `F09`.
