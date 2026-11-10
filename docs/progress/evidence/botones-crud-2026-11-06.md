# Botones × {error, límite, válido} y CRUD por pantalla (2026-11-06)

Estado: **TESTED** contra el backend real en Chrome real (web), a 360/768/1280 px, es-BO/en-US y esquema claro/oscuro. **No** verificado en iOS/Android ni contra `template-media`/almacenamiento de objetos.

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

## Ronda 2: responsive, en-US y esquema oscuro (2026-11-07)

Cada área corrió su matriz botón × {error, límite, válido} a 360 y 768 px además de 1280, y un barrido por ruta × ancho {360,768,1280} × idioma {es-BO,en-US} × esquema {claro,oscuro} con sesión real. Cada celda comprueba: sin errores de consola ni de página, sin scroll horizontal, sin claves i18n crudas ni español en en-US, axe WCAG 2.1 A/AA sin violaciones serias/críticas y objetivos táctiles de 44 px o más a 360. Además, flujos de punta a punta en en-US dirigidos por `testID`, confirmados con un GET al backend.

| Área | Matriz botón a 360 / 768 / 1280 | Barrido | Flujos en-US |
|---|---|---|---|
| Invitados, avisos, preferencias, push | 94 PASS en cada ancho, 0 FAIL | 942 comprobaciones, 0 FAIL | 6/6 |
| Celebración | 47/47 en cada ancho | 844 comprobaciones, 0 FAIL | 12/12 |
| Regalos e invitado | 52/52 en cada ancho | 144/144 | 15/15 |
| Proveedor y admin | portal 62 PASS, admin 36 PASS, 0 FAIL | 1492 comprobaciones, 0 FAIL | 18/18 |
| Login, organizaciones y marcos (Expo) | 53/53 en cada ancho | 330/330 | 15/15 |
| seo-web | 42/42 a 1280 (42/42 a 360 y 768 en la corrida del agente) | 192/192 | 6/6 |
| F23 + F28 | 15/15, 0 errores de consola | | |

Capturas: app Expo 159/159 y seo-web 34 + 1 omitida (necesita mundo en vivo; ya existía), ambas limpias dos veces tras regenerar las que cambiaron.

**Ruido de entorno excluido, con motivo:** 502/503 de `/media`, `/templates`, `/notifications/.../devices` y `/push-deliveries` (servicios no desplegados en el mundo local). Cualquier otro 4xx/5xx cuenta como fallo.

### Defectos encontrados y corregidos en esta ronda
- Interruptores de 20 px (preferencias, visibilidad de regalos): no cumplían 44 px táctiles y no respondían a la barra espaciadora. Nuevo `SwitchRow` en `packages/ui` (role switch, Espacio/Enter, foco visible, 56 px) y ambas pantallas lo usan. La nota «On/Off» salía en rojo (estilo de error): ahora usa el texto secundario.
- seo-web no tenía inglés ni tema oscuro real: negociación de idioma por `?lang=`, cookie y `Accept-Language` (`middleware.ts`), selector en el pie, 404 localizadas; el tema oscuro ahora sí cambia el sitio. Las pruebas visuales fijan `locale: es-BO` (idioma del producto) para que las referencias no pasen a inglés por el idioma por defecto de Playwright.
- Login a 360 px: el aviso de error estaba sobre el botón y el segundo toque de un doble clic caía en «¿Olvidaste tu contraseña?». Los avisos van debajo del botón.
- Regalos/avisos: canal INBOX sin traducción; textos de aviso del backend en español dentro de la app en inglés; contraste de avisos leídos; `Select` sin `aria-checked`; región de vista previa sin foco de teclado; objetivos táctiles de seo-web a 360.
- Filtro de ciudad y fichas de seo-web, portada pública y cotización: ya corregidos en la ronda 1.

### Hechos que conviene conocer
- **Esquema oscuro:** anfitrión, admin, proveedor, invitado y login de la app Expo usan paleta clara fija (`UiProvider scheme="light"`): medido, `colorScheme: dark` no cambia nada. En esas pantallas solo se comprueba que no se rompen y que axe pasa. **El oscuro real existe solo en seo-web.**
- **seo-web pasó de estático a dinámico** en landing, directorio y fichas para negociar idioma por solicitud (las páginas de categoría y ciudad siguen estáticas). Costo: menos caché. Alternativa a evaluar: rutas `/en/...`.
- Los avisos que redacta el backend usan voseo («Revisá», «Tenés») y la app usa tuteo; los plantillas conocidas se muestran con texto propio.
- El servicio de regalos se cayó dos veces durante la sesión por un «Heartbeat timeout» de RabbitMQ sin capturar (el proceso muere). Brecha de backend a corregir.
- Un recorrido a 768 px del portal (429 en ráfaga) y uno de invitados (guardado por teléfono) fallaron una vez por carga o por la ventana de consistencia del modelo de lectura y pasaron al repetirlos en aislamiento.

## Defectos reales encontrados y corregidos en la ronda 1 (causa raíz)

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

- Flujos válidos en en-US: solo con esquema claro (en oscuro se barren las rutas sin escribir). Los diálogos de rechazo del anfitrión no se escanearon con axe.
- 429 real con `Retry-After` visible en el navegador (Kong no lo expone por CORS).

- iOS y Android en dispositivo o simulador.
- `template-media` y almacenamiento de objetos (`/media/*` y `/templates/*` dan 502/503): subir foto, portada, aplicar plantilla, subir/descargar/borrar documentos con éxito. Solo se probó el error real y el camino feliz con mocks (vitest).
- Push real (necesita teléfono, EAS y credenciales): solo el 503 real y el flujo con respuestas simuladas.
- 429 real de Kong: solo ráfagas de login/RSVP no lo disparan; se probó con respuestas simuladas con `Retry-After` expuesto, salvo el 429 real de cotizaciones anónimas.
- 401 con token vencido real: solo token manipulado y refresh rechazado.
- Las capturas son salida de máquina (macOS) y ninguna persona las ha revisado; sin línea base Linux.
- Datos de prueba que quedan en la base local: categorías, ciudades y tipos de evento desactivados (no hay DELETE), un proveedor suspendido y 55 leads sembrados por SQL.
