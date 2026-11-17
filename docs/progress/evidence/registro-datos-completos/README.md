# Registro con todos los datos (2026-11-17)

**Estado: TESTED** (web con Chrome real contra Identity + Provider Catalog + Kong locales de la rama `feat/identity-perfil-registro`, backend PR #26). iOS y Android nativos: no ejecutados.

## Causa raíz
- `identity_user` solo tenía correo y contraseña; el alta no podía pedir ni guardar nombre, celular, ciudad ni consentimiento.
- Las tablas `organization` (Identity) y `provider` (Provider Catalog) existían, pero el alta no las alimentaba: el organizador y el proveedor quedaban sin empresa ni negocio hasta encontrarlos en otra pantalla.
- `StickyActions` sobresalía 16 px a cada lado (pensado para pantallas sin padding); en la columna centrada del registro la línea quedaba desalineada en móvil y tableta.

## Qué pide ahora
Rol · empresa (PLANNER) o negocio (PROVIDER) · nombre · apellido · celular E.164 (+591 por defecto) · ciudad (capitales de Bolivia + El Alto, u «Otra ciudad») · correo · contraseña · repetir contraseña · términos (obligatorio) · novedades (opcional). Idioma y zona horaria salen del dispositivo.
La empresa/negocio se crea con el token nuevo **antes** de publicar la sesión (`SessionManager.register(input, prepare)`), así el portal ya la encuentra; si falla, la cuenta entra igual y el portal ofrece crearlo.

## Evidencia
| Prueba | Resultado |
|---|---|
| `yarn lint` (eslint + 18 tareas) | exit 0 |
| `yarn typecheck` | exit 0 |
| `yarn test` (30 tareas; universal 370, auth 73, ui 251…) | exit 0, todo passed |
| Playwright visual, líneas base del registro regeneradas (390/768/1440, claro y oscuro) | 5 passed |
| Playwright visual completo | 153 passed, 36 failed; **las mismas 36 fallan en la base sin este cambio** (login, invitado, portal: deriva previa de líneas base en esta máquina) |
| Alta real HOST / PROVIDER / PLANNER en Chrome contra Kong `:8000` | register 201; PROVIDER `POST /providers` 201 y portal `GET /providers/mine` 200; PLANNER `POST /identity/organizations` 201 |
| axe (`@axe-core/playwright`) tras enviar vacío, 360/768/1280 × claro/oscuro × es-BO/en-US | 0 critical/serious en las 12 combinaciones |
| gitleaks sobre `origin/dev..HEAD` | no leaks found |
| Filas en Postgres | `identity_user` con todos los campos; `organization` con miembro PLANNER; `provider` DRAFT/BOB |

Nota de entorno: el compose local no migra `provider_db` (mismo hueco que el PR backend #20 para Gift); se aplicó `yarn db:migrate` a mano antes del recorrido.

## No probado
iOS/Android nativos (el formulario usa solo primitivas RN; la ciudad usa el selector nativo de `FilterSelect`). CI remoto pendiente al abrir el PR.
