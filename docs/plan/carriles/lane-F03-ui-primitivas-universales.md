# Carril F03 · Primitivas de interfaz universales

| | |
|---|---|
| **Responsable** | [Pablo](../equipo/pablo.md) |
| **Semana** | [06](../calendario/semana-06.md) · 23 de noviembre al 27 de noviembre de 2026 |
| **Componente** | `packages/ui` y `packages/ui-web` |
| **Predecesores** | F02 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

El vocabulario con el que los otros tres construyen todas las pantallas. Primitivas en React Native para la app universal, y equivalentes con shadcn/ui para la isla SEO, ambas sobre los mismos tokens.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F03-01` | Primitivas: Button, Input, Select, Checkbox, Card, Sheet, Modal, Toast, Table, DatePicker, FileUpload | Las once con sus variantes |
| `REQ-F03-02` | Cada primitiva tiene estados de carga, error, vacío y deshabilitado | Probados con Testing Library |
| `REQ-F03-03` | Roles y etiquetas de accesibilidad en todas | `accessibilityLabel` en RN, roles ARIA en web |
| `REQ-F03-04` | Equivalentes en `ui-web` con shadcn/ui | Mismo nombre, misma API, distinta implementación |
| `REQ-F03-05` | Catálogo navegable de componentes | Una pantalla que los muestra todos en sus estados |
| `REQ-F03-06` | Responsive por defecto | Cada primitiva se comporta bien a 360, 768 y 1280 px |

---

## Qué se construye

- `packages/ui/src/button/`
- `packages/ui/src/input/`
- `packages/ui/src/sheet/`
- `packages/ui/src/table/`
- `packages/ui/src/date-picker/`
- `packages/ui/src/file-upload/`
- `packages/ui-web/src/`
- `apps/universal/app/(dev)/catalogo.tsx`

---

## Plan por slices

Cada slice es vertical y termina con sus pruebas en verde. No se pasa al siguiente con el anterior rojo.

1. Primitivas de entrada: Button, Input, Select, Checkbox.
2. Primitivas de contenedor: Card, Sheet, Modal, Toast.
3. Primitivas complejas: Table, DatePicker, FileUpload.
4. Equivalentes web con shadcn/ui y catálogo navegable.

---

## Plan de pruebas

- Testing Library por primitiva, cubriendo los cuatro estados.
- axe sobre el catálogo completo: sin violaciones críticas.
- Snapshots visuales de cada primitiva en los tres breakpoints.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Los otros tres ejes pueden construir una pantalla completa sin escribir estilos sueltos.
- [ ] El catálogo sirve como documentación viva.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F03/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Una primitiva sin estado de error obliga a cada pantalla a inventarse el suyo. Los cuatro estados no son opcionales.

---

## Cómo se activa

```
/rsvp-master Ejecuta el carril F03 completo
```
