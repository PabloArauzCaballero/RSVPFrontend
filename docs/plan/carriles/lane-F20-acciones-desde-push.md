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

## Plan por slices

Cada slice es vertical y termina con sus pruebas en verde. No se pasa al siguiente con el anterior rojo.

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
/rsvp-master Ejecuta el carril F20 completo
```
