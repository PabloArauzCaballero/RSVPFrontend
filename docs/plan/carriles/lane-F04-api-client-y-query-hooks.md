# Carril F04 · Cliente de API y hooks de consulta

| | |
|---|---|
| **Responsable** | [Pablo](../equipo/pablo.md) |
| **Semana** | [07](../calendario/semana-07.md) · 30 de noviembre al 4 de diciembre de 2026 |
| **Componente** | `packages/api-client` y `packages/query-hooks` |
| **Predecesores** | F01 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Que ninguna pantalla hable HTTP directamente. Un cliente generado desde los contratos del backend, con interceptores de sesión y de trazabilidad, y una capa de hooks de TanStack Query por dominio.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F04-01` | Cliente generado desde `@rsvp/contracts` | Un cambio de contrato rompe la compilación, no el runtime |
| `REQ-F04-02` | Interceptor que adjunta el token y lo refresca en silencio | Un 401 dispara el refresh y reintenta una vez |
| `REQ-F04-03` | `correlationId` generado y propagado al gateway | Aparece en la traza del backend |
| `REQ-F04-04` | Hooks de TanStack Query por dominio | Celebración, invitados, regalos, proveedores y notificaciones |
| `REQ-F04-05` | Política de caché e invalidación declarada por dominio | Documentada, no improvisada por pantalla |
| `REQ-F04-06` | Manejo uniforme de errores 401, 403, 409 y 422 | Cada uno tiene un tipo y un tratamiento previsto |

---

## Qué se construye

- `packages/api-client/src/client.ts`
- `packages/api-client/src/interceptors/`
- `packages/query-hooks/src/celebration/`
- `packages/query-hooks/src/guest/`
- `packages/query-hooks/src/gift/`
- `packages/query-hooks/src/provider/`
- `packages/forms/src/schemas/`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Leer un dato de celebración desde contrato y query hook en una pantalla, con carga y error.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F04-01, REQ-F04-02, REQ-F04-03, REQ-F04-04, REQ-F04-05, REQ-F04-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 08 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** interfaz solo si el cambio la toca. **Animación:** según superficie.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Cliente generado e interceptores de sesión y trazabilidad.
2. Hooks de consulta y mutación por dominio.
3. Política de caché e invalidación.
4. Tipado de errores y schemas Zod compartidos con React Hook Form.

---

## Plan de pruebas

- Test de refresh silencioso: un 401 refresca y reintenta una sola vez.
- Test de propagación de `correlationId`.
- Test de invalidación: una mutación invalida exactamente las consultas que debe.
- Test de que los cuatro códigos de error se tipan correctamente.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Ninguna pantalla importa `fetch` ni `axios` directamente.
- [ ] La política de caché está escrita y justificada por dominio.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F04/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Un refresh que reintenta en bucle ante un 401 permanente deja la app colgada. El reintento es uno, no infinito.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F04 completo
```
