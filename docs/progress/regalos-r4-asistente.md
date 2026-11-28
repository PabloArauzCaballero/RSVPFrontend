# Regalos R4 FE · asistente del anfitrión y del organizador (`/regalos/catalogo`)

- Fecha: 2026-11-26; revisado y corregido 2026-11-28 (hallazgos de la revisión independiente, ver «Correcciones de la revisión»). Rama `feat/regalos-r4-asistente`, sobre `feat/regalos-r2-ficha` (R2, que trae R1).
- Plan: `docs/bugs/auditorias/2026-11-24/regalos-proveedores/PLAN-REGALOS-PROVEEDORES.md` (rama `bugs/catalogo` de RSVPBackend), §3, §5.4 a §5.6, §5.11, §8 R4 y §11.
- Corrige: A32 (parte FE) y M27 (parte FE: Gift pone título y precio desde Provider; el FE ya no los manda).
- Contrato: `packages/contracts/backend.lock.json` fija el BE `a3ecf36a` (RSVPBackend #165): gift-list 1.17.0, provider-catalog 3.8.0, celebration 1.6.0. Esta corrección no regenera contratos.

## Slice (rsvp-vertical-slice)

- Resultado observable: el anfitrión o el organizador abre «Agregar regalo · Del catálogo», marca ideas recomendadas para su tipo de evento y ciudad, elige un producto por idea y agrega todo en una sola llamada idempotente; el resumen muestra el equilibrio de precios.
- Capas: `packages/contracts` (regenerado), `packages/query-hooks` (`gift/assistant.ts`, `provider/recommendations.ts`), `packages/i18n` (`gifts.host.wizard.*`), `apps/universal/src/host/gifts/assistant/*`.
- Caso negativo: 422 por `itemIndex`, 428, 409, red caída, reintento con la misma llave.
- Dependencia externa: BE #165 y BE #161 (R3) desplegados en TEST. No hay recorrido real todavía (ver pendientes).

## Qué se quitó

`catalog-panel.tsx` (buscador por texto de R1). El asistente lo reemplaza: la única fuente de productos es `GET /providers/gift-ideas/recommendations` y, si falla, error con «Reintentar» (A27). `GET /listings?q=` sigue solo para las sugerencias de «De una tienda».

## Decisiones tomadas en el código (y por qué)

| Tema | Decisión | Origen |
|---|---|---|
| Un producto por idea | Radio por idea; elegir otro reemplaza | D-10 #5 |
| Idempotency-Key | Una llave por cuerpo distinto (`createBatchKeys`); el reintento con el mismo cuerpo la repite; otro cuerpo, llave nueva | BE #165, PF-4 |
| Lista sin crear | 404 `GIFT_LIST_NOT_FOUND`: se crea y se reenvía la MISMA petición con la MISMA llave | patrón de `addGiftWithList` |
| Errores 422 del lote | Por `itemIndex` (y `failures[]`) sobre la fila y el producto; ninguno se agregó; se relee la recomendación | BE #165 |
| Cantidad e interruptor «entre varios» | Ambos detrás de `EXPO_PUBLIC_GIFT_QUANTITY` (apagada por defecto, declarada en Dockerfile, compose y `eas.json`): sin R5, «4 de 12» y «entre varios» no son reales. Apagada se envía `quantity: 1` y `groupGiftEnabled: false`. Encendida, el interruptor se sugiere encendido si precio × cantidad > Bs 1.000 mientras el anfitrión no lo toque | decisión pendiente 2 de BE #165; DECISIONS.md P3 |
| Equilibrio | 4 rangos (≤ 200, 200–500, 500–1.000, > 1.000) por unidad; compara con confirmados + pendientes. Regla propuesta: un regalo hasta Bs 200 por cada 4 invitados (`AFFORDABLE_UNITS_PER_GUESTS`) | **pendiente de confirmar por Pablo** (DECISIONS.md P2); el plan da solo el ejemplo |
| Ciudad | La celebración no tiene campo de ciudad en el contrato (celebration 1.6.0). Selector «Ciudad de entrega» con `/providers/geo`; arranca con `content.citySlug|city|venueCity` si coincide con el catálogo, si no, «Todas las ciudades». Sin ciudad no se muestra «Entrega en tu ciudad / otra ciudad» (sería falso) | pendiente |
| Precio por versión | El total y el equilibrio usan el precio del **listing** (el que Gift guarda); el precio de la versión es solo dato del chip. Pendiente de Pablo (DECISIONS.md P1) | decisión pendiente 1 de BE #165 |
| Regalo no disponible | Un regalo con `availability: UNAVAILABLE` (estado conservado en el cable) no cuenta como vivo: su idea se puede volver a marcar y no entra al equilibrio | contrato gift-list 1.14.0 |
| Titular del paso 1 | «Recomendado para tu celebración» solo con `scope: EVENT_TYPE`; con `ALL_IDEAS` dice «Ideas de regalo» | provider-catalog 3.8.0 |
| Indicaciones de entrega | `PUT` aparte (no pisa notas ajenas); validación en `@rsvp/forms`. El texto no promete que el invitado o el proveedor las vean hasta R5 | DECISIONS.md P3 y P5 |
| Moneda | Solo Bs; con otra moneda de celebración se avisa | D-10 #30 |
| Fechas y horas | El asistente no muestra fechas ni horas: N/A de zona horaria | convenciones 5 |

## Impeccable y UI/UX Pro Max

- Modo Operate (anfitrión). Se respeta `DESIGN.md`: papel cálido, tinta, tarjetas con borde de 1 px, radio 8–12, etiquetas de estado en píldora, sin color como único estado. Reutiliza `Chip`, `SwitchRow`, `StepProgress`, `FilterSelect`, `Notice`, `ActionButton`; no toca `packages/ui`.
- Jerarquía: un titular por paso (foco al cambiar), una acción primaria por paso, el resto secundaria.
- Craft floor: sin eyebrow, sin tarjetas de icono + título + texto, sin borde lateral de color, sin emoji ni glifos como icono (el «+» y «−» del selector de cantidad se dibujan con vistas), sin gradientes.
- Objetivos táctiles: tarjeta de idea, producto, versión y botones de cantidad ≥ 44 px (`minHeight` 48).
- Estados: carga (esqueleto), vacío (con salida a «De una tienda»), error (con «Reintentar»), sin conexión (mensaje propio y selección conservada), éxito (cheque del producto).
- Accesibilidad (jsdom): ideas = `checkbox`; productos = `radio` en su `radiogroup` (solo radios) y las opciones del elegido (versiones, y con la bandera cantidad y aporte) en un grupo propio «Opciones de {producto}»; aporte = `switch`; progreso = `progressbar` con `aria-valuetext`; errores con `role="alert"`; el foco pasa al titular de cada paso; axe sin violaciones estructurales en los tres pasos. Contraste y lector de pantalla real: pendientes (ver abajo).

## Motion design (rsvp-motion-design)

- Decisión: **no se añade animación nueva**. El cambio de paso reutiliza `Enter from="none"` del sistema (solo opacidad, ~500 ms, estática con movimiento reducido en web y nativo) igual que el cambio de origen de «Agregar regalo». La lista de ideas usa `Stagger from="none"` (solo opacidad, escalonada; antes bajaba con traslación y no coincidía con esta decisión). No hay bucles ni movimiento automático.
- Función del movimiento: orientar el cambio de paso; la tarea funciona completa sin él.
- Barra de equilibrio: ancho proporcional sin transición (cambia con la selección, no se anima).
- Interrupción y movimiento reducido: heredados de `Enter`; probados por `packages/ui`. En esta etapa solo se verificó en jsdom; la secuencia temporal en navegador real queda pendiente.

## Correcciones de la revisión (2026-11-28)

| Hallazgo | Corrección | Prueba |
|---|---|---|
| M1 | `isLive` excluye `availability: UNAVAILABLE`; la idea se vuelve a poder marcar y no entra al equilibrio | `gift-assistant.test.tsx` «a gift the catalog no longer offers…» y su contraparte «still offered» |
| M2 | `listingPriceOf` (precio del listing) en total, equilibrio y sugerencia; versión solo en el chip. Registrado como P1 en DECISIONS.md | «the total and the balance use the listing price…» y `listingPriceOf` en query-hooks |
| M3, 9 | Interruptor «entre varios» detrás de `EXPO_PUBLIC_GIFT_QUANTITY` (se envía `groupGiftEnabled: false` apagado); `delivery.help` dice «cuando esta función esté disponible» (es-BO y en-US). Regla de equilibrio marcada pendiente (P2) | flujo completo (cuerpo del batch) y prueba de textos en es-BO y en-US |
| 1 | La etiqueta del stepper usa el título del producto, no el código de la idea | prueba de la bandera: `Más · Producto torta` |
| 2 | Con la bandera encendida el interruptor queda dentro del grupo «Opciones de {producto}» | misma prueba |
| 3 | El `radiogroup` de productos contiene solo radios; las opciones van en su grupo propio | prueba de roles y nombres |
| 4 (PF-5) | `EXPO_PUBLIC_GIFT_QUANTITY` en `deploy/Dockerfile.universal`, `docker-compose.coolify.yml` y `apps/universal/eas.json` (vacía) | `gift-flags-deploy.test.ts` |
| 5 | Titular neutro con `scope !== EVENT_TYPE` | «when the backend answers every idea…» (es-BO) y su versión en en-US |
| 6 | La ciudad exige igualdad por slug o nombre completo; solo se quita la cola «de la Sierra» | `gift-assistant-city.test.ts` |
| 7 | Quitados `useUpdateGiftItem`, `assistantApi.updateItem`, `MAX_BATCH_ITEMS`, `GiftItemUpdateRequest` y las claves `gifts.host.catalog.*` sin uso (queda `added`) | `tsc` y los tests de query-hooks e i18n |
| 8 | El aviso «DOne te conecta con el proveedor…» vuelve en el paso 3 (`gifts.host.wizard.summary.disclaimer`); el lugar exacto lo confirma Pablo (P6) | «the delivery notes belong to the list…» y la versión en en-US |
| 10 | La validación de las indicaciones vive en `@rsvp/forms` (`gift-delivery-notes.ts`); `@rsvp/universal` declara la dependencia | `packages/forms/src/schemas/gift-delivery-notes.test.ts` |
| 11 | Registrado como P5 en DECISIONS.md | n/a |
| 12 | `ProductPhoto` guarda la URL que falló, no un booleano: otra URL se intenta de nuevo | **sin prueba automática**: `onError` de `Image` en react-native-web no se dispara con un evento sintético en jsdom (se intentó y no llega); queda para el recorrido real |
| 13 | `Stagger from="none"` | revisión de código; la animación real queda en el recorrido |
| 14 | La nota de moneda se ve desde el paso 1 | «the currency note is shown from the first step…» |
| 15 | Esta ficha corregida (`--ref a3ecf36a`, 3.8.0, `/regalos/catalogo`); comentario de `assistant.ts` | n/a |
| 16 | Hueco de pactos del BE: registrado como P7; se anotará en `bugs/catalogo` (M31), no es de este PR | n/a |
| B1 | Proceso: ver «Pendiente». Este PR no puede subir de nivel sin el recorrido real | n/a |

Sin corregir porque no es de este PR o requiere decisión: 17 (pruebas con cliente falso y `SLOW = 5000`: el recorrido real las complementa), `SwitchRow` con `accessibilityLabel` propio (PR aparte en `packages/ui`), el aviso de pactos del BE y las decisiones P1 a P7.

## Verificación (resultados reales de la corrección, 2026-11-28, sobre Node 22 con Yarn 4.10.3)

Corrido en el worktree de la rama, con `yarn install --immutable` previo a los cambios:

| Comando | Resultado |
|---|---|
| `eslint --max-warnings 0` sobre los `.ts`/`.tsx` tocados | sin salida (en verde) |
| `tsc --noEmit` en `packages/forms`, `packages/i18n`, `packages/query-hooks`, `apps/universal`, `apps/seo-web` | en verde |
| `vitest run` en `packages/forms` | 6 archivos, 67 pruebas en verde |
| `vitest run` en `packages/i18n` | 3 archivos, 18 pruebas en verde |
| `vitest run` en `packages/query-hooks` | 19 archivos, 234 pruebas en verde |
| `vitest run test/gift-assistant.test.tsx` en `apps/universal` | 54 pruebas en verde (suelto) |
| `vitest run` completo en `apps/universal` | 904 de 908 en verde. 4 fallaron por tiempo de espera con la suite completa y la máquina cargada: tres de `gift-assistant.test.tsx` y una de `provider-admin-buttons.test.tsx`. Repetidas sueltas pasaron (`gift-assistant.test.tsx`: 54 de 54); en una repetición conjunta la prueba de la bandera de cantidad volvió a agotar 20 s y pasó en la corrida suelta. Es sensibilidad al tiempo de las pruebas con la máquina cargada, no una aserción rota, pero queda anotado sin darlo por resuelto |
| `yarn workspace @rsvp/universal build` (`expo export` web) | exportó `web-build` sin errores |

NO corrido: el recorrido en Chrome real contra el backend real, Playwright (`test:visual`) en 360/768/1280 claro y oscuro, axe real con contraste, lector de pantalla, regeneración de las capturas de macOS, gitleaks, `yarn lint` de la raíz con turbo completo, los contratos contra el backend y las pruebas de `apps/seo-web`. El nivel alcanzado sigue siendo `TESTED` con mocks de contrato (vitest/jsdom); `VERIFIED` no se alcanzó.

## Pendiente

1. Recorrido en Chrome real contra el backend real (gateway Docker con BE #165 + #161): no hay Docker en esta sesión.
2. Capturas de macOS (no se regeneran en Linux): `host-regalos-catalogo-768`, `host-regalos-catalogo-1440`, `host-regalos-proveedores-768`, `host-regalos-proveedores-1440`, `host-regalos-390` y `host-regalos-768` (la lista suma cantidad, aporte y notas solo con datos del mock). Capturas nuevas sugeridas: cada paso del asistente en 390/768/1440, claro y oscuro, es-BO y en-US; estado vacío y estado de error del paso 1; resumen con error 422 por producto.
3. Contraste AA, lector de pantalla (VoiceOver, TalkBack) y secuencia de movimiento en dispositivo.
4. Ficha completa del producto (galería, descripción, garantía): la tarjeta de recomendación no las trae; hace falta un detalle público del producto en provider-catalog.
5. Las capturas de `host-regalos-catalogo-768/1440` y `host-regalos-proveedores-768/1440` cambian de contenido y su línea base queda obsoleta hasta regenerarlas en macOS.
6. «Ver más productos» de una idea con más de 12: la API pagina con `ideas=<código>&offset=`; esta etapa muestra los 12 primeros y lo dice.

## Hallazgo del recorrido real (2026-11-28) y su corrección

- Con el backend real (gift-list 1.17.0), unas indicaciones de entrega con un teléfono o una dirección web dan `PUT .../gift-list/delivery-notes` 422 `CONTACT_IN_TEXT`. El asistente solo conocía `INVALID_DELIVERY_NOTES` y mostraba «Reintenta para guardar», una promesa falsa: el mismo texto vuelve a fallar. Ahora `CONTACT_IN_TEXT` tiene su propio texto (es-BO y en-US) que dice que no se admiten teléfonos ni enlaces y conserva el texto en el campo editable; los regalos ya agregados no se pierden. Prueba: `gift-assistant.test.tsx` «422 CONTACT_IN_TEXT of the PUT…» (falla sin la corrección, verificado).
- Pendiente fuera de este PR: el `Screen` del shell (`apps/universal/src/host/shell.tsx`) cambia de árbol al cruzar el punto de corte de ancho (rotar el teléfono o redimensionar la ventana) y reinicia el asistente al paso 1 con la selección perdida. No lo introduce este PR; afecta a cualquier pantalla con estado local.
