# Carril F01 · Turborepo y Expo Router universal

| | |
|---|---|
| **Responsable** | [Pablo](../equipo/pablo.md) |
| **Semana** | [06](../calendario/semana-06.md) · 23 de noviembre al 27 de noviembre de 2026 |
| **Componente** | Raíz de `RSVPFrontend` · Turborepo · Expo Router |
| **Predecesores** | Backend 09 (publicación de `@rsvp/contracts`) |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Montar la base: un Turborepo con una app Expo Router que corre en iOS, Android y web desde un mismo `expo start`, y una app Next.js aparte para lo que Google debe indexar. Sin esto, los otros tres no pueden empezar frontend.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F01-01` | `apps/universal` corre en iOS, Android y web | Un `expo start` y las tres plataformas muestran la misma pantalla |
| `REQ-F01-02` | `apps/seo-web` corre con Next.js App Router | `next dev` sirve una ruta con render en servidor |
| `REQ-F01-03` | Workspaces Yarn 4 con las 2 apps y los 12 packages | `yarn workspaces list` los devuelve todos |
| `REQ-F01-04` | `yarn turbo run build lint test` verde | Desde un clon limpio |
| `REQ-F01-05` | `@rsvp/contracts` instalado desde GitHub Packages | Los tipos del backend compilan en el frontend |
| `REQ-F01-06` | Enrutado por grupos en Expo Router | `(auth)`, `(host)`, `(provider)`, `(admin)` y `(guest)` separados |

---

## Qué se construye

- `package.json`
- `turbo.json`
- `apps/universal/app/_layout.tsx`
- `apps/universal/app.json`
- `apps/seo-web/app/layout.tsx`
- `apps/seo-web/next.config.js`
- `packages/config-ts/`
- `packages/config-eslint/`
- `packages/config-jest/`
- `.npmrc`

---

## Plan por slices

Cada slice es vertical y termina con sus pruebas en verde. No se pasa al siguiente con el anterior rojo.

1. Raíz del workspace, Turborepo y autenticación contra GitHub Packages.
2. App Expo Router con los cinco grupos de rutas y una pantalla por grupo.
3. App Next.js con App Router y una ruta renderizada en servidor.
4. Configuración compartida y verificación en las tres plataformas.

---

## Plan de pruebas

- Smoke test de arranque en web, iOS y Android.
- Build de producción de ambas apps.
- Test de que los tipos de `@rsvp/contracts` compilan.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Un clon limpio llega a las tres plataformas siguiendo solo el README.
- [ ] Las versiones de Node, Expo SDK y Next están fijadas.

Y en todos los casos:

- [ ] Todos los `REQ` en `PASS`, o `BLOCKED-EXTERNAL` con evidencia concreta. `PARTIAL` no cierra.
- [ ] Tests de componente con estados de carga, error y vacío.
- [ ] MSW cubre todas las respuestas del contrato, incluidos 401, 403, 409 y 422.
- [ ] Cobertura ≥ 85 % en `packages/`, ≥ 75 % en pantallas.
- [ ] Cero cadenas fuera de i18n; `es-BO` y `en-US` completos.
- [ ] Fechas y horas en la timezone de la celebración, no la del dispositivo.
- [ ] Snapshots visuales aprobados en 360, 768 y 1280 px.
- [ ] axe sin violaciones críticas; navegable por teclado.
- [ ] La suite del carril corre 3 veces seguidas en CI sin un solo fallo.
- [ ] Evidencia en `docs/progress/evidence/lane-F01/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Hacer que una misma base corra en las tres plataformas suele llevar más tiempo del previsto por configuración de Metro y de transpilación. Reservá el lunes entero.

---

## Cómo se activa

```
/rsvp-master Ejecuta el carril F01 completo
```
