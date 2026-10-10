# Carril F19 · Push en la app: permisos y recepción

| | |
|---|---|
| **Responsable** | [Miguel](../equipo/miguel.md) |
| **Semana** | [10](../calendario/semana-10.md) · 21 de diciembre al 25 de diciembre de 2026 |
| **Componente** | `apps/universal` |
| **Predecesores** | F05 · F07 · Backend 24 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

La exigencia dura del cliente, en el lado del cliente. Pedir permiso sin quemarlo, registrar el dispositivo y recibir la notificación en los tres estados de la app: abierta, en segundo plano y cerrada.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F19-01` | Pantalla F3: solicitud de permiso con contexto | Se explica para qué antes de pedirlo |
| `REQ-F19-02` | Registro y baja del device token | Al iniciar y al cerrar sesión |
| `REQ-F19-03` | Recepción con la app abierta | Aviso dentro de la app, sin interrumpir |
| `REQ-F19-04` | Recepción con la app en segundo plano | Notificación del sistema |
| `REQ-F19-05` | **Recepción con la app cerrada** | Notificación del sistema y apertura en la pantalla correcta |
| `REQ-F19-06` | Insignia de no leídas sincronizada | El número coincide con el centro de notificaciones |

---

## Qué se construye

- `apps/universal/src/push/register.ts`
- `apps/universal/src/push/handlers.ts`
- `apps/universal/app/(auth)/permisos-push.tsx`
- `docs/progress/evidence/lane-F19/`

---

## Plan por slices

Cada slice es vertical y termina con sus pruebas en verde. No se pasa al siguiente con el anterior rojo.

1. Solicitud de permiso con pantalla de contexto previa.
2. Registro y baja del token ligados a la sesión.
3. Manejadores para los tres estados de la app.
4. Insignia e integración con el centro de notificaciones.

---

## Plan de pruebas

- Tests con el driver falso para los tres estados.
- Test de que cerrar sesión da de baja el token.
- **Verificación manual en un iPhone y un Android físicos, con capturas en el pull request.**
- Flow de Maestro que cubre el registro de permiso.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Evidencia en dispositivo real de los tres estados, en ambas plataformas.
- [ ] Rechazar el permiso no rompe nada ni se vuelve a pedir de forma insistente.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F19/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Pedir el permiso en el primer arranque sin contexto quema la única oportunidad: si lo rechazan, recuperarlo exige ir a ajustes del sistema.

---

## Cómo se activa

```
/rsvp-master Ejecuta el carril F19 completo
```
