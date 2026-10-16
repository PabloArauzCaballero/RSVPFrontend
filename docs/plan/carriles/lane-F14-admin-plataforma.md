# Carril F14 · Admin de plataforma

| | |
|---|---|
| **Responsable** | [Leo](../equipo/leo.md) |
| **Semana** | [12](../calendario/semana-12.md) · 4 de enero al 8 de enero de 2027 |
| **Componente** | `apps/universal/app/(admin)` |
| **Predecesores** | F03 · F04 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Las doce pantallas desde las que se opera el producto: templates, tipos de evento, categorías, geografía, verificación de proveedores, moderación, usuarios y métricas globales.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F14-01` | Pantallas E1 a E12 implementadas | Las doce con sus operaciones |
| `REQ-F14-02` | **Editor de `EventTypeDefinition`** | Crear un tipo de evento nuevo desde la interfaz, sin desplegar |
| `REQ-F14-03` | Cola de verificación de proveedores con acciones | Verificar, rechazar y suspender |
| `REQ-F14-04` | Moderación de microsites y regalos externos propuestos | Aprobar o rechazar con motivo |
| `REQ-F14-05` | Métricas globales de leads | Por partner, categoría y periodo |
| `REQ-F14-06` | Solo el rol `ADMIN` accede | Cualquier otro rol recibe una pantalla de acceso denegado |

---

## Qué se construye

- `apps/universal/app/(admin)/templates.tsx`
- `apps/universal/app/(admin)/tipos-evento.tsx`
- `apps/universal/app/(admin)/categorias.tsx`
- `apps/universal/app/(admin)/geografia.tsx`
- `apps/universal/app/(admin)/verificacion.tsx`
- `apps/universal/app/(admin)/moderacion.tsx`
- `apps/universal/app/(admin)/usuarios.tsx`
- `apps/universal/app/(admin)/metricas.tsx`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Buscar una celebración desde admin y ejecutar una acción autorizada con confirmación y error.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F14-01, REQ-F14-02, REQ-F14-03, REQ-F14-04, REQ-F14-05, REQ-F14-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 07 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** Impeccable + UI/UX Pro Max + estados + visual. **Animación:** evaluar propósito; si se implementa, motion design + reduced motion.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Catálogos: templates, categorías y geografía.
2. Editor de tipos de evento con campos obligatorios y traducciones.
3. Verificación de proveedores y moderación.
4. Usuarios, organizaciones y métricas globales.

---

## Plan de pruebas

- **Test de extremo a extremo: crear un tipo de evento desde el admin y usarlo en una celebración.**
- Test de autorización: los otros tres roles no acceden.
- Testing Library por pantalla con estados de carga, error y vacío.
- axe sobre las doce pantallas.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Un administrador puede dar de alta un tipo de evento nuevo sin pedirle nada a un desarrollador.
- [ ] Las doce pantallas funcionan a 1280 px y son usables a 768 px.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F14/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- El admin suele ser lo último y lo peor cuidado. Si el editor de tipos de evento no funciona, el carril 11 del backend pierde todo su valor.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F14 completo
```
