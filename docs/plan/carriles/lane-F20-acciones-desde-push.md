# Carril F20 · Acciones desde la notificación

| | |
|---|---|
| **Responsable** | [Miguel](../equipo/miguel.md) |
| **Semana** | [11](../calendario/semana-11.md) · 28 de diciembre al 1 de enero de 2027 |
| **Componente** | `apps/universal` |
| **Predecesores** | F19 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Que el anfitrión apruebe una reserva de regalo desde la propia notificación, sin abrir la app y buscar. Es el caso de uso que justifica todo el trabajo de push.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F20-01` | Pantalla F4: acciones rápidas en la notificación | Aprobar y rechazar directamente |
| `REQ-F20-02` | La acción se ejecuta sin abrir la app | Confirmación visible en el sistema |
| `REQ-F20-03` | Tocar el cuerpo abre la pantalla de detalle | Deep link a la solicitud concreta |
| `REQ-F20-04` | Una acción sobre algo ya resuelto se maneja con elegancia | Mensaje claro, sin error críptico |
| `REQ-F20-05` | La acción funciona con la app cerrada | Probado en ambas plataformas |
| `REQ-F20-06` | El resultado se refleja al abrir la app | Sin necesidad de recargar |

---

## Qué se construye

- `apps/universal/src/push/actions.ts`
- `apps/universal/src/push/categories.ts`
- `apps/universal/app/(host)/bandeja/[id].tsx`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Abrir una acción desde push y completar el flujo en la pantalla correcta con sesión válida o expirada.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F20-01, REQ-F20-02, REQ-F20-03, REQ-F20-04, REQ-F20-05, REQ-F20-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 24 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** Impeccable + UI/UX Pro Max + estados + visual. **Animación:** evaluar propósito; si se implementa, motion design + reduced motion.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Categorías de notificación con acciones por plataforma.
2. Ejecución de la acción en segundo plano.
3. Deep link al detalle de la solicitud.
4. Manejo del caso ya resuelto y sincronización al abrir.

---

## Plan de pruebas

- Test del manejador de acción con el driver falso.
- Test de acción sobre una solicitud ya resuelta: mensaje claro.
- **Verificación manual: aprobar una reserva desde la notificación en iPhone y Android.**
- Flow de Maestro del recorrido completo.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] La evidencia muestra la reserva aprobada desde la notificación, sin abrir la app.
- [ ] El caso de carrera (dos aprobaciones) está resuelto y probado.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F20/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Las acciones en notificación se configuran distinto en iOS y en Android. Es fácil que funcione en una y no en la otra y no darse cuenta.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F20 completo
```
