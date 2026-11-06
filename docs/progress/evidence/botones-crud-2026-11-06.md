# Botones × {error, límite, válido} y CRUD por pantalla (2026-11-06)

Estado: **TESTED** contra el backend real en Chrome real (web). **No** verificado en iOS/Android ni contra `template-media`/almacenamiento de objetos.

## Qué se hizo

Cada botón de las pantallas de anfitrión, invitado, proveedor, admin, cuenta y seo-web se recorrió en tres escenarios:

- **Error:** el servidor rechaza (401/403/404/409/422/429/5xx) o la red cae. La pantalla muestra un mensaje accionable, conserva lo escrito y se puede reintentar.
- **Límite:** vacío, longitudes y números en el borde, duplicados, doble clic con la petición en vuelo, listas vacías, paginación en el borde.
- **Válido:** el camino feliz. La persistencia se confirma con un GET directo al backend, no solo con la interfaz.

Además se auditó el CRUD de cada entidad contra los contratos OpenAPI (`RSVPBackend/packages/contracts-openapi/specs`). Si el backend soporta una operación, la pantalla la ofrece; si no la soporta, no hay botón y queda como brecha de backend (abajo).

## Cómo se reproduce

Stack: infraestructura del backend en Docker (Postgres en :5445 por conflicto de :5432, RabbitMQ, Redis, MinIO), los servicios Node y Identity en el host, y un Kong propio en :28000 con el `kong.yml` del repo apuntando al host. La siembra es `apps/seo-web/scripts/live-world.mjs` (ahora crea también un lead real).

```
WORLD=world.json APP=http://localhost:8081 API=http://localhost:28000 \
CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
node apps/universal/scripts/live/<area>-buttons.mjs
```

Áreas: `auth`, `guests`, `celebration`, `gifts`, `provider-admin` (`portal` | `admin`), más `e2e-live-f23-f28.mjs` y `apps/seo-web/scripts/live-buttons.mjs`.

## Resultados de la corrida final (código ya unido)

| Recorrido | Resultado |
|---|---|
| Login, registro, recuperar, cierre de sesión, organizaciones | 53/53 |
| Celebración (onboarding, editor, traducciones, publicar, ajustes, modos) | 47/47 |
| Invitados, avisos, preferencias, push, ajustes de invitados | 93 PASS, 0 FAIL tras corregir 2 casos (ver abajo); 3 brechas de backend |
| Regalos del anfitrión y del invitado | 52 PASS, 0 FAIL |
| Portal del proveedor | 62 PASS, 4 BLOCKED (documentos y backend), 0 FAIL |
| Admin | 37 PASS, 7 BLOCKED (6 brechas de backend y `template-media`), 0 FAIL |
| F23 + F28 en 360/768/1280 | 15/15, 0 errores de consola |
| seo-web (`live-buttons.mjs`, corrida del agente sobre el build previo) | 42/42 |
| Capturas visuales + axe WCAG 2.1 A/AA, app Expo | 159/159, limpia dos veces seguidas |
| Capturas visuales, seo-web | 34 pasan, 1 omitida (necesita el mundo en vivo; ya existía) |
| `yarn lint` / `typecheck` / `test` | 18/18, 18/18, 30/30 (app 247, seo-web 111, ui 25, query-hooks 83, i18n 12) |
| `expo export` iOS + Android | exit 0 (compila; no se ejecutó en dispositivo) |
| `harness:validate` | válido |
| gitleaks | 5 en el historial = los mismos de `origin/dev`; 0 nuevos en archivos nuevos |

## Defectos reales encontrados y corregidos (causa raíz)

- **Doble clic enviaba dos escrituras** (aprobar, crear regalo, publicar, guardar, marcar todos, preferencias): `isPending` cambia un render tarde. Un único módulo (`platform/single-flight.ts`) con tres guardas explícitas.
- **Errores genéricos:** 409 con un solo texto; 429, 5xx y red caída iban a "error". `errorMessage` y los avisos por área ahora distinguen código, `Retry-After`, 5xx y red.
- **Conectar una ficha de proveedor ajena** era posible (el chequeo de propietario nunca fallaba). Ahora se valida contra `/providers/mine`.
- **Fecha límite inválida borraba la fecha guardada**; fecha límite vacía al recargar; fecha `2027-13-45` aceptada.
- **seo-web filtraba ciudad por nombre**; el backend exige slug: la búsqueda quedaba vacía. La cotización pedía ciudad en texto libre.
- **Geografía admin** no podía crear ciudades (código en mayúsculas, sin coordenadas); **verificación** ofrecía "Verificar" a rechazados/suspendidos (siempre 409).
- **Microsite** truncaba en silencio y un guardado borraba galería, horarios y coordenadas.
- **Borrar invitado** no navegaba; **filas de la lista** pisaban el rol de botón; **paginación** podía dejar una página inexistente.
- Sin límites de longitud en cliente (el backend acepta títulos de 20 000 caracteres); sin confirmación al borrar foto, rechazar/cancelar reserva y quitar un dispositivo push.
- **Portada `/c/{slug}` daba 500** si caía el servicio de media; ahora se muestra sin galería.
- Texto "1 acompañantes permitidos / 1 guests allowed": reformulado sin plural.

## Botones nuevos

Borrar invitado (con confirmación), ajustes de invitados, retención de datos, dispositivos y entregas push, rechazar propuesta externa, equipo de la celebración (dar y quitar acceso), tipo de evento, historial de la celebración, editar el nombre del proveedor, borrar y ver documentos, dar rol a usuarios, paginación de usuarios y de leads, organizaciones (crear y agregar miembros), filtro por grupo.

## Brechas de backend (no hay botón a propósito)

- Invitado: editar nombre/contacto, reenviar invitación. Grupo: editar y borrar.
- Regalo: editar, borrar; reserva: cancelar. Backend acepta regalos duplicados y precios sin tope.
- Oferta: editar, archivar, despublicar, borrar; entrega: editar. Lead: marcar atendido.
- Usuario: quitar rol, suspender cuenta. Proveedor suspendido: reactivar.
- Categorías, geografía, tipos de evento: borrar (solo se desactivan). Celebración: borrar y desarchivar.
- Cuenta: confirmar recuperación de contraseña, cambiar contraseña/perfil/correo, borrar cuenta, listar sesiones, verificar correo.
- Colaboración acepta cualquier UUID inexistente; `localTimes` no cubre `settings.rsvpDeadline`; la búsqueda de invitados es por prefijo.
- **Kong no expone `Retry-After` en CORS** (`infra/kong/kong.yml`, `exposed_headers`): el navegador nunca ve los segundos de un 429 real.
- El servicio de regalos se cayó una vez solo durante la sesión (excepción no capturada en un temporizador) y el de invitados quedó en 500 tras una importación de 1000 filas; ambos volvieron al reiniciarse.

## No probado (declarado)

- iOS y Android en dispositivo o simulador.
- `template-media` y almacenamiento de objetos (`/media/*` y `/templates/*` dan 502/503): subir foto, portada, aplicar plantilla, subir/descargar/borrar documentos con éxito. Solo se probó el error real y el camino feliz con mocks (vitest).
- Push real (necesita teléfono, EAS y credenciales): solo el 503 real y el flujo con respuestas simuladas.
- 429 real de Kong: solo ráfagas de login/RSVP no lo disparan; se probó con respuestas simuladas con `Retry-After` expuesto, salvo el 429 real de cotizaciones anónimas.
- 401 con token vencido real: solo token manipulado y refresh rechazado.
- Las capturas son salida de máquina (macOS) y ninguna persona las ha revisado; sin línea base Linux.
- Datos de prueba que quedan en la base local: categorías, ciudades y tipos de evento desactivados (no hay DELETE), un proveedor suspendido y 55 leads sembrados por SQL.
