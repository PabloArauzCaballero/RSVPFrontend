# Carril F17 · Resumen de RSVP y bandeja de acompañantes

| | |
|---|---|
| **Responsable** | [Miguel](../equipo/miguel.md) |
| **Semana** | [09](../calendario/semana-09.md) · 14 de diciembre al 18 de diciembre de 2026 |
| **Componente** | `apps/universal/app/(host)` |
| **Predecesores** | F16 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Lo que el anfitrión mira todos los días: cuántos vienen, cuántos faltan y qué tiene pendiente de decidir sobre acompañantes extra.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F17-01` | Pantalla C6: portada del panel con el resumen | Confirmados, pendientes, días restantes y solicitudes abiertas |
| `REQ-F17-02` | Pantalla C24: reporte de RSVP exportable | Acompañantes, dietas y mensajes |
| `REQ-F17-03` | Pantalla C26: bandeja de solicitudes de acompañantes | Aprobar o rechazar con un clic |
| `REQ-F17-04` | El resumen indica cuándo se actualizó por última vez | La consistencia eventual se comunica, no se esconde |
| `REQ-F17-05` | Exportación a CSV con los datos del reporte | Para el salón y el catering |
| `REQ-F17-06` | Los números coinciden con el backend | Sin recalcular nada en el cliente |

---

## Qué se construye

- `apps/universal/app/(host)/index.tsx`
- `apps/universal/app/(host)/rsvp/reporte.tsx`
- `apps/universal/app/(host)/bandeja/acompanantes.tsx`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Confirmar un RSVP y ver el conteo en bandeja actualizado sin duplicados.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F17-01, REQ-F17-02, REQ-F17-03, REQ-F17-04, REQ-F17-05, REQ-F17-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 21 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** Impeccable + UI/UX Pro Max + estados + visual. **Animación:** evaluar propósito; si se implementa, motion design + reduced motion.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Portada del panel con el resumen agregado.
2. Reporte detallado con filtros y exportación.
3. Bandeja de acompañantes con acciones.
4. Indicador de frescura de los datos.

---

## Plan de pruebas

- Test de que los totales mostrados son los del backend, sin recálculo local.
- Test de la bandeja con solicitudes pendientes y vacía.
- Test de exportación con caracteres especiales y acentos.
- Snapshots en tres breakpoints.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] El anfitrión entiende de un vistazo qué le falta por decidir.
- [ ] La exportación abre correctamente en Excel con acentos.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F17/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Recalcular totales en el cliente produce discrepancias con el backend que nadie sabe explicar.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F17 completo
```
