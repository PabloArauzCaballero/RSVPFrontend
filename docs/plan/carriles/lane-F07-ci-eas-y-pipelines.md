# Carril F07 · CI, EAS Build y distribución

| | |
|---|---|
| **Responsable** | [Pablo](../equipo/pablo.md) |
| **Semana** | [08](../calendario/semana-08.md) · 7 de diciembre al 11 de diciembre de 2026 |
| **Componente** | `.github/workflows/` · EAS |
| **Predecesores** | F01 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Que cada pull request construya solo lo afectado y que exista un binario real firmado de iOS y de Android. «Funciona en móvil» no se demuestra con un emulador: se demuestra con una build instalable.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F07-01` | `turbo --affected` en el pipeline | Tocar una pantalla no reconstruye todo |
| `REQ-F07-02` | Tests, lint y typecheck bloqueantes | Un fallo impide el merge |
| `REQ-F07-03` | **EAS Build produce binarios firmados de iOS y Android** | Artefactos descargables desde CI |
| `REQ-F07-04` | Distribución a TestFlight e Internal Testing | Los testers reciben la build |
| `REQ-F07-05` | EAS Update configurado para parches sin tienda | Un cambio de JavaScript llega sin rebuild |
| `REQ-F07-06` | Lighthouse CI sobre las rutas indexables | Umbral bloqueante de SEO en 95 |

---

## Qué se construye

- `.github/workflows/ci.yml`
- `.github/workflows/eas-build.yml`
- `.github/workflows/lighthouse.yml`
- `eas.json`
- `apps/universal/app.config.ts`
- `docs/runbooks/releases.md`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Construir una ruta mínima en CI y obtener un artefacto EAS o un bloqueo externo reproducible.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F07-01, REQ-F07-02, REQ-F07-03, REQ-F07-04, REQ-F07-05, REQ-F07-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 09 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** interfaz solo si el cambio la toca. **Animación:** según superficie.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Pipeline base con `--affected`, lint, typecheck y tests.
2. Perfiles de EAS para desarrollo, vista previa y producción.
3. Firma y distribución a TestFlight e Internal Testing.
4. Lighthouse CI y umbrales bloqueantes.

---

## Plan de pruebas

- Pull request de prueba que verifica que solo se reconstruye lo tocado.
- Build de vista previa instalada en un dispositivo real de cada plataforma.
- Lighthouse por debajo del umbral hace fallar el pipeline.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Existe un binario instalable de iOS y otro de Android generados desde CI.
- [ ] El runbook de releases explica cómo publicar un parche con EAS Update.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F07/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- La firma de iOS es la parte que más sorpresas da. Si las cuentas no están listas, este carril queda bloqueado externamente.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F07 completo
```
