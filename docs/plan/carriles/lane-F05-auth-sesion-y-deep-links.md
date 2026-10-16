# Carril F05 · Sesión, guards y deep links

| | |
|---|---|
| **Responsable** | [Pablo](../equipo/pablo.md) |
| **Semana** | [07](../calendario/semana-07.md) · 30 de noviembre al 4 de diciembre de 2026 |
| **Componente** | `packages/auth` |
| **Predecesores** | F04 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Login, sesión persistente, guards por rol y —lo más delicado— los enlaces universales que hacen que el magic link del invitado abra la app si está instalada. Es predecesor de la app móvil del invitado de Miguel.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F05-01` | Login, registro y recuperación contra Identity | Los tres flujos funcionan en web y en móvil |
| `REQ-F05-02` | Sesión persistida de forma segura por plataforma | `SecureStore` en móvil, cookie httpOnly en web |
| `REQ-F05-03` | Guards por rol en los grupos de rutas | Un `PROVIDER` no entra a `(admin)` |
| `REQ-F05-04` | **Universal links en iOS y app links en Android** | El magic link abre la app si está instalada |
| `REQ-F05-05` | Repliegue a web si la app no está instalada | El mismo enlace funciona en ambos casos |
| `REQ-F05-06` | Cierre de sesión limpio | Se borra el token local y se revoca el refresh |

---

## Qué se construye

- `packages/auth/src/session/`
- `packages/auth/src/guards/`
- `packages/auth/src/deep-links/`
- `apps/universal/app/(auth)/`
- `apps/seo-web/public/.well-known/apple-app-site-association`
- `apps/seo-web/public/.well-known/assetlinks.json`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Abrir un deep link autenticado y volver a la pantalla de origen tras renovar sesión.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F05-01, REQ-F05-02, REQ-F05-03, REQ-F05-04, REQ-F05-05, REQ-F05-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 07 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** Impeccable + UI/UX Pro Max + estados + visual. **Animación:** evaluar propósito; si se implementa, motion design + reduced motion.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Login, registro y recuperación con React Hook Form y Zod.
2. Persistencia de sesión segura por plataforma.
3. Guards por rol en los cinco grupos de rutas.
4. Enlaces universales, archivos de verificación y prueba en dispositivo.

---

## Plan de pruebas

- Guard por rol: cada uno de los cuatro roles contra los cinco grupos.
- Sesión persistida tras reiniciar la app.
- **Verificación manual del deep link en un iPhone y un Android físicos.**
- Repliegue a web cuando la app no está instalada.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Los archivos `.well-known` se sirven desde el dominio verificado.
- [ ] La evidencia de deep link en dispositivo real está en el pull request.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F05/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- **Bloqueo externo**: sin dominio verificado ni cuentas de Apple Developer y Google Play, los enlaces universales no se pueden probar. Confirmalo en la semana 6.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F05 completo
```
