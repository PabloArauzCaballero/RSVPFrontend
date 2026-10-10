# Plan de ejecución · RSVP Frontend

Turborepo · Expo Router universal (iOS + Android + Web) + isla Next.js para SEO · NativeWind

---

## Cómo se lee esta carpeta

| Carpeta | Qué contiene | Cuándo la abrís |
|---|---|---|
| [`00-plan-maestro.md`](00-plan-maestro.md) | El plan completo: arquitectura, inventario de las 86 pantallas, motor de templates, estrategia de pruebas | Una vez al empezar |
| [`calendario/`](calendario/) | Una ficha por semana, del **12-oct-2026** al **15-ene-2027**, con qué hace cada persona día por día | Cada lunes |
| [`equipo/`](equipo/) | Una ficha por programador: sus carriles, su calendario y sus dependencias | Cada mañana |
| [`carriles/`](carriles/) | Una orden de trabajo por carril: REQs falsables, slices, plan de pruebas y Definition of Done | Cuando arrancás un carril |

El backend tiene su carpeta equivalente en `RSVPBackend/docs/plan/`. **El calendario es el mismo**: cada persona alterna entre backend y frontend a lo largo de las 14 semanas.

---

## La arquitectura en una pantalla

El cliente pidió dos cosas que entran en tensión: que todo esté hecho con **React Native**, y que el directorio de proveedores **posicione en Google**. Expo web exporta una SPA, y una SPA no posiciona bien.

La resolución es esta:

```
RSVPFrontend/
├── apps/universal/   ← Expo Router · iOS + Android + Web
│                       dashboard del anfitrión, portal del proveedor,
│                       admin y app del invitado
└── apps/seo-web/     ← Next.js App Router · SSR/ISR
                        solo lo que Google debe leer: sitio público de la
                        celebración, buscador de proveedores, microsites
                        de partner y el redirector /r/
```

Las dos comparten `design-tokens`, `api-client`, `query-hooks`, `forms`, `i18n`, `auth` y `telemetry`. La UI no se comparte: `packages/ui` es React Native y `packages/ui-web` es shadcn/ui.

**Frontera arquitectónica, verificada por test**: `apps/seo-web` nunca importa de `packages/ui`.

---

## El equipo

| Persona | Eje | Carriles frontend | Semanas |
|---|---|---|---|
| **Pablo** | Plataforma front | F01–F07 — Turborepo, tokens, primitivas, cliente de API, sesión, i18n, EAS | 6 a 8 |
| **Leo** | Celebración y contenido | F08–F14, F24 — isla SEO, motor de templates, sitio público, editor, admin, buscador | 7 a 13 |
| **Miguel** | Invitados y avisos | F15–F21, F23 — RSVP público, gestión de invitados, push, app del invitado | 8 a 13 |
| **Fabio** | Negocio | F22, F25–F28 — regalos, microsite, cotización, **redirección y atribución**, portal del partner | 9 a 13 |

**Pablo va primero.** F01–F05 son predecesores de casi todo: nadie puede construir una pantalla sin design system ni cliente de API. Por eso los otros tres no arrancan frontend hasta las semanas 7, 8 y 9.

---

## Las 86 pantallas

| Superficie | Cantidad | Dónde vive |
|---|---|---|
| **A** · Sitio público de la celebración | 21 | `apps/seo-web/app/c/[slug]` |
| **B** · Buscador de proveedores y microsites | 14 | `apps/seo-web/app/proveedores` y `app/p/[slug]` |
| **C** · Dashboard del anfitrión | 32 | `apps/universal/app/(host)` |
| **D** · Portal del proveedor | 15 | `apps/universal/app/(provider)` |
| **E** · Admin de plataforma | 12 | `apps/universal/app/(admin)` |
| **F** · Específico móvil | 6 | `apps/universal` |

El inventario completo, pantalla por pantalla y con su ruta, está en [`00-plan-maestro.md`](00-plan-maestro.md) §20.

---

## Reglas que no se negocian

1. **Ningún enlace a un partner sale directo.** Todos pasan por `/r/{listingId}`. Un test escanea el DOM renderizado y falla si alguno se cuela — es lo que protege el modelo de negocio.
2. **Ninguna cadena de texto escrita a mano.** Todo pasa por i18n, en `es-BO` y `en-US`. Hay una regla de lint que lo verifica.
3. **Las horas se muestran en la timezone de la celebración**, nunca en la del dispositivo.
4. **Ninguna pantalla habla HTTP.** Todo va por `packages/query-hooks` sobre el cliente generado de los contratos.
5. **`apps/seo-web` no importa `packages/ui`.** Un test de imports lo impide.
6. **Responsive es un test, no una opinión.** Snapshots en 360, 768 y 1280 px.
7. **`PARTIAL` no permite `DONE`.** Un requisito queda `PASS` o `BLOCKED-EXTERNAL` con evidencia.

---

## Arranque diario

```bash
cd RSVPFrontend
yarn install

# Contra mocks, sin backend levantado
yarn workspace universal start      # i → iOS · a → Android · w → web
yarn workspace seo-web dev          # http://localhost:3000

# Contra el backend real, entrando por Kong
cd ../RSVPBackend && docker compose up -d && cd ../RSVPFrontend
API_URL=http://localhost:8000 yarn dev
```

Y después, tu carril:

```
/rsvp-master Ejecuta el carril FNN completo
```

---

## El bloqueo externo que hay que resolver pronto

Los enlaces universales de iOS y los app links de Android exigen un **dominio verificado** que sirva `apple-app-site-association` y `assetlinks.json`, más **cuentas de Apple Developer y Google Play**. Sin eso, `F05`, `F19`, `F20` y `F21` no se pueden demostrar.

**Hay que confirmarlo el lunes de la semana 6 (23 de noviembre).** Si no está, se declara `BLOCKED-EXTERNAL` ese día, no en enero.
