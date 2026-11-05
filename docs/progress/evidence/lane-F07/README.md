# F07 · CI, EAS y distribución: evidencia (2026-11-03)

| REQ | Estado | Comando / artefacto | Resultado |
|---|---|---|---|
| REQ-F07-01 `turbo --affected` | PASS (simulación local, sin corrida en CI) | `turbo-affected.txt`: worktree limpio, se toca `apps/universal/src/host/routes.ts` y `turbo run build lint typecheck test --affected --dry=json` | 28 tareas en 9 paquetes (universal y sus dependencias); no incluye `seo-web`, `forms` ni los demás. Con el árbol sucio actual se afectan 18 de 19 paquetes |
| REQ-F07-02 tests, lint y typecheck bloqueantes | PARTIAL | `yarn turbo run typecheck test` (47/47 OK); ESLint real (lo añadió el carril F01) | `ci.yml` los ejecuta. Que bloqueen el merge exige branch protection en GitHub: no verificable desde el repo. `ci.yml` usa `turbo run ... lint`; el `eslint .` raíz (`lint:code`) no está en el workflow |
| REQ-F07-03 EAS Build firmado | BLOCKED-EXTERNAL | `eas.json` válido (JSON), `eas-build.yml` YAML válido; no ejecutado | Faltan `EXPO_TOKEN`, proyecto EAS, credenciales Apple/Google. No hay binarios |
| REQ-F07-04 TestFlight / Internal Testing | BLOCKED-EXTERNAL | `eas.json` `submit` | Faltan `EXPO_ASC_APP_ID` y cuentas |
| REQ-F07-05 EAS Update | BLOCKED-EXTERNAL (config versionada) | `.github/workflows/eas-update.yml` (nuevo, YAML válido, no ejecutado); `docs/runbooks/releases.md` | Sin `EXPO_TOKEN` ni `projectId` no se puede publicar ni recibir un parche |
| REQ-F07-06 Lighthouse CI, umbral 95 | PARTIAL | `lighthouse-local.txt`: Lighthouse 12.8.2 sobre `next start` (:3200) | SEO = 1 en `/`, `/proveedores`, `/proveedores/salones`, `/proveedores/salones/la-paz` tras el rediseño. Defecto corregido: `lighthouse.yml` pasaba `.lighthouserc.json` como `budgetPath` (el umbral no se aplicaba); ahora usa `configPath` y mide las 4 rutas. **No se ejecutó `lhci`** (descarga bloqueada por el entorno) ni el workflow en GitHub; las rutas `/c/<slug>` necesitan backend y quedan fuera |

No cubierto: ninguna corrida real en GitHub Actions, builds instalables iOS/Android, 3 corridas seguidas de CI.

## Actualización 2026-11-04

- `ci.yml` ahora ejecuta `yarn lint:code` (ESLint real de toda la raíz) y `contracts check:generated` antes de `turbo run build lint typecheck test --affected`. Los scripts `lint` de cada workspace siguen siendo `tsc --noEmit` (el lint de código corre una vez en la raíz, no por paquete: decisión deliberada para no duplicar).
- `lighthouse.yml`: `configPath: ./.lighthouserc.json` con `assert.assertions["categories:seo"] = error >= 0.95` sobre 4 rutas indexables (`/`, `/proveedores`, `/proveedores/salones`, `/proveedores/salones/la-paz`). Las mediciones locales posteriores al rediseño están en `lane-F08` y `lane-F24`.
- **Solo ejecutable en GitHub Actions (no verificado aquí):** las corridas de `ci.yml`, `lighthouse.yml` (`treosh/lighthouse-ci-action`), `eas-build.yml`, `eas-update.yml`; branch protection; 3 corridas verdes seguidas; el baseline de `test:visual` en Linux. BLOQUEOS externos: `EXPO_TOKEN`, proyecto EAS, credenciales Apple/Google, `EXPO_ASC_APP_ID`.
