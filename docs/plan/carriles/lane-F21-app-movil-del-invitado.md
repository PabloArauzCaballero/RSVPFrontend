# Carril F21 · App móvil del invitado

| | |
|---|---|
| **Responsable** | [Miguel](../equipo/miguel.md) |
| **Semana** | [12](../calendario/semana-12.md) · 4 de enero al 8 de enero de 2027 |
| **Componente** | `apps/universal/app/(guest)` |
| **Predecesores** | F05 · F15 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Que el magic link abra la app si está instalada y el navegador si no. El invitado confirma asistencia y ve la lista de regalos sin crear ninguna cuenta.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F21-01` | Pantalla F1: enrutador de deep links | Resuelve el destino según el enlace |
| `REQ-F21-02` | **Pantalla F2: el magic link abre la app si está instalada** | Verificado en iPhone y Android |
| `REQ-F21-03` | Repliegue transparente a web | El mismo enlace funciona sin la app |
| `REQ-F21-04` | RSVP completo dentro de la app | Los cinco estados de F15, en nativo |
| `REQ-F21-05` | Lista de regalos y solicitud de reserva | Con el redirector para los enlaces a partner |
| `REQ-F21-06` | Sin registro ni contraseña | El token es la única credencial |

---

## Qué se construye

- `apps/universal/app/(guest)/_layout.tsx`
- `apps/universal/app/(guest)/rsvp/[token].tsx`
- `apps/universal/app/(guest)/regalos/`
- `apps/universal/src/deep-links/router.ts`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Entrar a la app del invitado, ver celebración y confirmar una acción principal con estados completos.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F21-01, REQ-F21-02, REQ-F21-03, REQ-F21-04, REQ-F21-05, REQ-F21-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 19 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** Impeccable + UI/UX Pro Max + estados + visual. **Animación:** evaluar propósito; si se implementa, motion design + reduced motion.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Enrutador de deep links y repliegue a web.
2. RSVP nativo con los cinco estados.
3. Lista de regalos y solicitud de reserva.
4. Pruebas en dispositivo real de ambas plataformas.

---

## Plan de pruebas

- Test del enrutador con enlaces válidos, inválidos y de otra celebración.
- **Flow de Maestro: abrir el magic link y confirmar asistencia, en iOS y Android.**
- Test del repliegue a web cuando la app no está instalada.
- Test de que ningún enlace a partner escapa del redirector.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] El recorrido completo desde el enlace hasta la confirmación está grabado en ambas plataformas.
- [ ] Un invitado sin la app no nota ninguna diferencia funcional.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F21/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Si los archivos de verificación del dominio no están servidos, el enlace abre el navegador y el carril no se puede demostrar.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F21 completo
```
