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

## Plan por slices

Cada slice es vertical y termina con sus pruebas en verde. No se pasa al siguiente con el anterior rojo.

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
/rsvp-master Ejecuta el carril F07 completo
```
