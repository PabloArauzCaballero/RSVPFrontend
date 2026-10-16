# Carril F23 · Gestión de regalos del anfitrión

| | |
|---|---|
| **Responsable** | [Miguel](../equipo/miguel.md) |
| **Semana** | [13](../calendario/semana-13.md) · 11 de enero al 15 de enero de 2027 |
| **Componente** | `apps/universal/app/(host)` |
| **Predecesores** | F22 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

La bandeja donde el anfitrión aprueba reservas y el armado de la lista desde el catálogo de partners. El regalo externo existe, pero con fricción deliberada: es la última opción.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F23-01` | Pantalla C25: bandeja de reservas pendientes | Aprobar o rechazar, con quién lo pidió |
| `REQ-F23-02` | Pantalla C27: armar lista desde el catálogo de partners | Buscar, filtrar y añadir |
| `REQ-F23-03` | **Pantalla C28: regalo externo con fricción explícita** | Se ofrecen alternativas de partner antes de permitirlo |
| `REQ-F23-04` | Pantalla C29: estado de cada regalo | Disponible, pendiente, comprometido o propuesto |
| `REQ-F23-05` | Pantalla C30: descubrir proveedores desde el panel | Con el redirector para los enlaces |
| `REQ-F23-06` | La visibilidad del solicitante respeta la configuración | Oculto hasta confirmar, por defecto |

---

## Qué se construye

- `apps/universal/app/(host)/bandeja/regalos.tsx`
- `apps/universal/app/(host)/regalos/catalogo.tsx`
- `apps/universal/app/(host)/regalos/externo.tsx`
- `apps/universal/app/(host)/regalos/index.tsx`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Crear un regalo desde el anfitrión y verlo en la lista pública con estado de publicación.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F23-01, REQ-F23-02, REQ-F23-03, REQ-F23-04, REQ-F23-05, REQ-F23-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 25 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** Impeccable + UI/UX Pro Max + estados + visual. **Animación:** evaluar propósito; si se implementa, motion design + reduced motion.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Bandeja de reservas con acciones y detalle.
2. Armado de lista desde el catálogo de partners.
3. Alta de regalo externo con sugerencias previas.
4. Vista de estado y descubrimiento de proveedores.

---

## Plan de pruebas

- Test de la bandeja con pendientes y vacía.
- Test de que el alta de externo muestra alternativas de partner primero.
- Test de visibilidad del solicitante según configuración.
- **Test que escanea el DOM buscando enlaces directos a partner.**

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Añadir un regalo de partner es más fácil que añadir uno externo, medible en número de pasos.
- [ ] Las cinco pantallas tienen snapshot aprobado.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F23/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Si el regalo externo es tan fácil como el catalogado, la regla comercial existe solo en el documento.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F23 completo
```
