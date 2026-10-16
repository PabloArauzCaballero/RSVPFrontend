# Carril F16 · Gestión de invitados

| | |
|---|---|
| **Responsable** | [Miguel](../equipo/miguel.md) |
| **Semana** | [08](../calendario/semana-08.md) · 7 de diciembre al 11 de diciembre de 2026 |
| **Componente** | `apps/universal/app/(host)` |
| **Predecesores** | F03 · F04 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Donde el anfitrión arma su lista. Alta individual, importación masiva por CSV con errores legibles, grupos familiares y gestión de los enlaces de cada invitado.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F16-01` | Pantalla C19: lista con filtros, búsqueda y estado | Una celebración de 500 invitados sigue siendo usable |
| `REQ-F16-02` | Pantalla C20: alta individual | Con validación en el momento |
| `REQ-F16-03` | **Pantalla C21: importación CSV con reporte por fila** | Las filas con error se muestran con su número de línea y su motivo |
| `REQ-F16-04` | Pantalla C22: grupos familiares y mesas | Arrastrar o asignar miembros |
| `REQ-F16-05` | Pantalla C23: detalle del invitado | Copiar, reenviar o revocar su magic link |
| `REQ-F16-06` | El enlace nunca se muestra completo en pantalla compartida | Se copia, no se exhibe |

---

## Qué se construye

- `apps/universal/app/(host)/invitados/index.tsx`
- `apps/universal/app/(host)/invitados/nuevo.tsx`
- `apps/universal/app/(host)/invitados/importar.tsx`
- `apps/universal/app/(host)/invitados/grupos.tsx`
- `apps/universal/app/(host)/invitados/[id].tsx`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Crear un invitado y verlo en la lista del anfitrión con búsqueda, vacío y error.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F16-01, REQ-F16-02, REQ-F16-03, REQ-F16-04, REQ-F16-05, REQ-F16-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 17 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** Impeccable + UI/UX Pro Max + estados + visual. **Animación:** evaluar propósito; si se implementa, motion design + reduced motion.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Lista con filtros, búsqueda y paginación.
2. Alta individual y edición.
3. Importación CSV con vista previa y reporte de errores por fila.
4. Grupos familiares y gestión de enlaces.

---

## Plan de pruebas

- Lista con 500 invitados: filtros y búsqueda responden sin degradarse.
- CSV con filas válidas e inválidas: el reporte permite corregir sin adivinar.
- Test de que el token no aparece en el DOM en texto plano.
- Testing Library con estados de carga, error y vacío.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] La importación de un CSV real de 200 filas se completa y se entiende.
- [ ] La lista vacía explica qué hacer, no muestra una tabla sin filas.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F16/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Un reporte de errores de CSV que dice solo «archivo inválido» obliga al anfitrión a abandonar la función.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F16 completo
```
