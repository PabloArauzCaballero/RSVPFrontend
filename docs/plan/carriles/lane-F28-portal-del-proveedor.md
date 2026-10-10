# Carril F28 · Portal del proveedor

| | |
|---|---|
| **Responsable** | [Fabio](../equipo/fabio.md) |
| **Semana** | [13](../calendario/semana-13.md) · 11 de enero al 15 de enero de 2027 |
| **Componente** | `apps/universal/app/(provider)` |
| **Predecesores** | F25 · F26 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Las quince pantallas donde el partner gestiona su presencia y, sobre todo, **ve sus leads**. Es lo que lo mantiene en la plataforma: si no ve el retorno, se va.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F28-01` | Pantallas D1 a D3: alta, onboarding y estado de verificación | Flujo guiado con documentos |
| `REQ-F28-02` | Pantalla D4: editor del microsite | Secciones, galería, descripción y traducciones |
| `REQ-F28-03` | Pantallas D5 a D6: servicios y productos | Alta, edición y publicación |
| `REQ-F28-04` | **Pantalla D7: destinos de redirección y UTM** | Con la validación de al menos uno obligatorio |
| `REQ-F28-05` | Pantalla D8: condiciones de entrega | Responsable, cobertura, costo de traslado y plazos |
| `REQ-F28-06` | **Pantalla D13: métricas de leads** | Impresiones, clics, CTR y leads válidos por día, categoría y destino |

---

## Qué se construye

- `apps/universal/app/(provider)/onboarding/`
- `apps/universal/app/(provider)/microsite.tsx`
- `apps/universal/app/(provider)/servicios.tsx`
- `apps/universal/app/(provider)/productos.tsx`
- `apps/universal/app/(provider)/destinos.tsx`
- `apps/universal/app/(provider)/entrega.tsx`
- `apps/universal/app/(provider)/agenda.tsx`
- `apps/universal/app/(provider)/metricas.tsx`

---

## Plan por slices

Cada slice es vertical y termina con sus pruebas en verde. No se pasa al siguiente con el anterior rojo.

1. Alta, onboarding y verificación.
2. Editor de microsite, servicios y productos.
3. Destinos de redirección, UTM, configuración de leads y condiciones de entrega.
4. Agenda, solicitudes recibidas y panel de métricas.

---

## Plan de pruebas

- Test de que publicar sin destinos muestra el 422 de forma accionable.
- Test del panel de métricas con datos de 90 días.
- Test de autorización: un partner no ve los datos de otro.
- Testing Library por pantalla y axe sobre las quince.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Un partner entiende de un vistazo cuántos leads le dio la plataforma este mes.
- [ ] Las quince pantallas funcionan en móvil, no solo en escritorio.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F28/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- El panel de métricas es lo que justifica el cobro al partner. Si no se entiende, la conversación comercial se vuelve una discusión de confianza.

---

## Cómo se activa

```
/rsvp-master Ejecuta el carril F28 completo
```
