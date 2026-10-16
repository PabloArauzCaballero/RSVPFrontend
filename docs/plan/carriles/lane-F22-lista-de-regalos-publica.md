# Carril F22 · Lista de regalos pública

| | |
|---|---|
| **Responsable** | [Fabio](../equipo/fabio.md) |
| **Semana** | [09](../calendario/semana-09.md) · 14 de diciembre al 18 de diciembre de 2026 |
| **Componente** | `apps/seo-web/app/c/[slug]/regalos` |
| **Predecesores** | F10 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Donde el invitado elige qué regalar. Seis pantallas, incluidos los tres desenlaces posibles de una solicitud de reserva. Y la regla comercial: los productos de partners van primero.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F22-01` | Pantalla A14: catálogo con filtros | Por precio, categoría y disponibilidad |
| `REQ-F22-02` | **Los productos de partner aparecen antes que los externos** | Verificado en el orden renderizado, no en la interfaz |
| `REQ-F22-03` | Pantalla A15: detalle del regalo | Precio con su moneda y enlace al partner vía el redirector |
| `REQ-F22-04` | Pantalla A16: solicitar reserva | Con identificación del invitado |
| `REQ-F22-05` | Pantallas A17 y A18: pendiente de aprobación y confirmada | Según el modo de la celebración |
| `REQ-F22-06` | Pantalla A19: regalo ya tomado | 409 con alternativas sugeridas, no un error seco |

---

## Qué se construye

- `apps/seo-web/app/c/[slug]/regalos/page.tsx`
- `apps/seo-web/app/c/[slug]/regalos/[id]/page.tsx`
- `apps/seo-web/components/gift/reserve-dialog.tsx`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Ver un regalo público, reservarlo y observar indisponibilidad posterior con error de concurrencia.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F22-01, REQ-F22-02, REQ-F22-03, REQ-F22-04, REQ-F22-05, REQ-F22-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 26 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** Impeccable + UI/UX Pro Max + estados + visual. **Animación:** evaluar propósito; si se implementa, motion design + reduced motion.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Catálogo con filtros y orden con prioridad de partners.
2. Detalle del regalo con enlace al partner por el redirector.
3. Diálogo de reserva con identificación.
4. Los tres desenlaces: pendiente, confirmada y ya tomado.

---

## Plan de pruebas

- **Test del orden: catalogados antes que externos, verificado programáticamente.**
- Los tres desenlaces con MSW, incluido el 409.
- Test de que el 409 ofrece alternativas reales.
- **Test que escanea el DOM: ningún enlace a partner fuera del redirector.**

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Las seis pantallas tienen snapshot aprobado en tres breakpoints.
- [ ] El caso de regalo ya tomado deja al invitado con algo que hacer, no en un callejón.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F22/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Confiar el orden de partners al frontend significa perderlo en cualquier otro consumidor. El orden viene del backend y acá solo se respeta.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F22 completo
```
