# Carril F13 · Configuración y modos de control

| | |
|---|---|
| **Responsable** | [Leo](../equipo/leo.md) |
| **Semana** | [12](../calendario/semana-12.md) · 4 de enero al 8 de enero de 2027 |
| **Componente** | `apps/universal/app/(host)` |
| **Predecesores** | F11 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Las pantallas donde el anfitrión decide cuánto control quiere. Cuatro interruptores con consecuencias reales: cada uno tiene que explicar qué pasa si se activa, porque la decisión afecta a sus invitados.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F13-01` | Pantalla C17: idiomas, timezone, moneda y fecha límite de RSVP | Con validación y vista previa del efecto |
| `REQ-F13-02` | Pantalla C18: los cuatro interruptores AUTO_ACCEPT y RESTRICTED | Cada uno con su explicación |
| `REQ-F13-03` | Cada interruptor explica la consecuencia antes de confirmar | No es un toggle a secas |
| `REQ-F13-04` | **La interfaz refleja que el cambio no es retroactivo** | Si hay pendientes, se avisa que seguirán pendientes |
| `REQ-F13-05` | Solo anfitrión y planner ven estas pantallas | Otros roles no las alcanzan |
| `REQ-F13-06` | El cambio de fecha límite avisa de su efecto | Si ya pasó, los RSVP quedan congelados |

---

## Qué se construye

- `apps/universal/app/(host)/configuracion.tsx`
- `apps/universal/app/(host)/modos.tsx`
- `packages/ui/src/switch-with-consequence/`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Cambiar una configuración de celebración y observar el efecto en la pantalla pertinente.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F13-01, REQ-F13-02, REQ-F13-03, REQ-F13-04, REQ-F13-05, REQ-F13-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 12 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** Impeccable + UI/UX Pro Max + estados + visual. **Animación:** evaluar propósito; si se implementa, motion design + reduced motion.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Configuración general con validación de timezone y moneda.
2. Componente de interruptor con explicación de consecuencia.
3. Los cuatro modos con sus textos y confirmaciones.
4. Aviso de no-retroactividad cuando hay solicitudes pendientes.

---

## Plan de pruebas

- Test de que con pendientes se muestra el aviso de no-retroactividad.
- Test de autorización por rol.
- Test de que cambiar la fecha límite al pasado avisa del congelamiento.
- axe sobre ambas pantallas.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Un anfitrión que nunca leyó documentación entiende qué hace cada interruptor.
- [ ] Los textos están revisados en los dos idiomas.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F13/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Un interruptor sin explicación lleva a que el anfitrión active AUTO_ACCEPT sin entender que deja de revisar reservas.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F13 completo
```
