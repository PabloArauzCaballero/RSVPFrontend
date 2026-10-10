# Carril F12 · Templates, vista previa y publicación

| | |
|---|---|
| **Responsable** | [Leo](../equipo/leo.md) |
| **Semana** | [11](../calendario/semana-11.md) · 28 de diciembre al 1 de enero de 2027 |
| **Componente** | `apps/universal/app/(host)` |
| **Predecesores** | F11 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Elegir cómo se ve y decidir cuándo se hace público. La validación de publicación no está en el frontend: la devuelve el backend según el tipo de evento, y la pantalla la presenta de forma accionable.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F12-01` | Pantalla C14: galería de templates compatibles | Solo los del tipo de evento correspondiente |
| `REQ-F12-02` | **Cambiar de template no pierde contenido** | Cambiar y volver deja la celebración idéntica |
| `REQ-F12-03` | Pantalla C15: vista previa en escritorio, tableta y móvil | Sin salir del panel |
| `REQ-F12-04` | Pantalla C16: lista de verificación de publicación | Los campos faltantes del 422 se muestran como tareas pendientes |
| `REQ-F12-05` | Publicar y despublicar con confirmación | Ambas acciones son reversibles y claras |
| `REQ-F12-06` | El enlace público se copia y se comparte | Con vista previa de cómo se verá en WhatsApp |

---

## Qué se construye

- `apps/universal/app/(host)/templates.tsx`
- `apps/universal/app/(host)/preview.tsx`
- `apps/universal/app/(host)/publicar.tsx`
- `packages/query-hooks/src/celebration/use-publish.ts`

---

## Plan por slices

Cada slice es vertical y termina con sus pruebas en verde. No se pasa al siguiente con el anterior rojo.

1. Galería de templates con filtro por tipo y vista previa.
2. Cambio de template con confirmación y preservación de contenido.
3. Vista previa multi-dispositivo.
4. Lista de verificación de publicación a partir del 422.

---

## Plan de pruebas

- **Test de cambio de template y vuelta al original: contenido idéntico.**
- Test de que el 422 se traduce en una lista de tareas accionables.
- Test de que solo aparecen templates compatibles.
- Snapshots de la vista previa en los tres tamaños.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] El usuario entiende exactamente qué le falta para publicar, sin adivinar.
- [ ] La vista previa refleja el resultado real, no una aproximación.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F12/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Reimplementar la validación en el frontend garantiza que algún día diverja del backend. La fuente es el 422.

---

## Cómo se activa

```
/rsvp-master Ejecuta el carril F12 completo
```
