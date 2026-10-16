# Carril F18 · Notificaciones in-app y preferencias

| | |
|---|---|
| **Responsable** | [Miguel](../equipo/miguel.md) |
| **Semana** | [09](../calendario/semana-09.md) · 14 de diciembre al 18 de diciembre de 2026 |
| **Componente** | `apps/universal` |
| **Predecesores** | F04 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

El centro de avisos dentro del producto y el control de por qué canal quiere recibir cada cosa el usuario. Es la antesala del push: si las preferencias no existen, el push molesta en lugar de ayudar.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F18-01` | Pantalla C31: centro de notificaciones | Leídas y no leídas, con acción directa |
| `REQ-F18-02` | Pantalla F6: centro nativo en móvil | Mismo contenido, presentación nativa |
| `REQ-F18-03` | Preferencias por canal y por tipo de evento | Email, WhatsApp, SMS y push, cada uno activable |
| `REQ-F18-04` | Las preferencias se respetan de verdad | Verificado contra el backend, no solo guardado |
| `REQ-F18-05` | Marcar como leída y marcar todas | Con actualización optimista |
| `REQ-F18-06` | Horario de silencio visible y editable | En la timezone de la celebración |

---

## Qué se construye

- `apps/universal/app/(host)/notificaciones.tsx`
- `apps/universal/app/(host)/preferencias.tsx`
- `packages/query-hooks/src/notification/`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Recibir una notificación in-app y abrir su destino con estado leído persistido.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F18-01, REQ-F18-02, REQ-F18-03, REQ-F18-04, REQ-F18-05, REQ-F18-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 23 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** Impeccable + UI/UX Pro Max + estados + visual. **Animación:** evaluar propósito; si se implementa, motion design + reduced motion.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Lista de notificaciones con estados y acciones.
2. Preferencias por canal y tipo.
3. Horario de silencio.
4. Actualización optimista y sincronización.

---

## Plan de pruebas

- Test de que desactivar un canal se refleja en el backend.
- Test de actualización optimista con fallo de red: se revierte.
- Estados de carga, error y vacío.
- axe sobre ambas pantallas.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Un usuario puede apagar completamente un canal y deja de recibirlo.
- [ ] La lista vacía explica que no hay avisos, no parece rota.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F18/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Una preferencia que se guarda pero no se respeta es peor que no tenerla: destruye la confianza en el producto.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F18 completo
```
