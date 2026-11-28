# Regalos R5 FE · invitado: dos botones, WhatsApp por /r, «¿Lo compraste?», cantidad y aporte coordinado

- Fecha: 2026-11-27. Rama `feat/regalos-r5-invitado`, sobre `feat/regalos-r4-asistente` (FE #149, `a4ba035f`). Fusionar después de FE #149 y de BE #168.
- Corrige: A31, M27 (parte FE). Plan §3 (20 a 30), §5.7, §5.8, §5.11, §8 R5.
- Contrato: `generate --ref af8280c2be37e40b52685b5c47c339498bc1c954` (BE #168, ronda 3): gift-list 1.18.0, provider-catalog 3.8.0. `check:generated` en verde. Respecto de 609462f3 solo cambian descripciones (`coordinatorName` respeta también `showRequesterToGuests`); el FE ya trata `coordinatorName` como `string|null`.
- Nivel: TESTED (unitarias + jsdom + axe) y recorrido en Chrome real contra gift-list y provider-catalog reales con PostgreSQL real (ver límites). No VERIFIED: falta TEST/Kong/Celebration y Guest reales, nativo.

## Qué se entrega
- `@rsvp/query-hooks`: `guest-card.ts` (estado de la tarjeta: unidades, aporte, quién ve botones, precio vigente, 409 `INSUFFICIENT_UNITS`), `purchase-attempts.ts` (intentos locales) y `purchase-prompt.ts` (hook, módulo cliente aparte para que el barril siga siendo legible por componentes de servidor).
- App (`apps/universal/src/guest`): selector de unidades, líneas «Faltan 8 de 12» y «Entre varios», tarjeta «¿Compraste …?», enlaces con contexto. seo-web (`components/gift`): lo mismo en HTML sin importar `packages/ui`.
- `/r` en seo-web: reenvía `giftItemId`, `variant`, `quantity`, `celebrationSlug` solo con forma válida (un `quantity` inválido sería 422) y **no añade `utm_*` ni `correlationId` a `wa.me`** (el BE devuelve el texto exacto). Nunca reenvía nombre, teléfono ni `text`.
- `partnerRedirectUrl` (app) y `partnerRedirectHref`/`PartnerLink` (ui-web, con `onFollow`) llevan `celebrationId` + `celebrationSlug` siempre juntos (decisión M12 del BE).
- i18n es-BO y en-US (`gifts.guest.units|group|buy|prompt|form.*`); «Pedir por WhatsApp» y «Ver en la tienda».

## Reglas de la tarjeta
| Caso | Reservar | Botones del proveedor |
|---|---|---|
| Regalo normal con unidades libres | sí, con unidades (1 a las libres) | sí, con `quantity` = unidades elegidas |
| Regalo normal, el invitado ya tiene reserva (SOLE) | no (ya reservó) | sí, con `quantity` = sus unidades (reservar y luego comprar, D-3) |
| Regalo normal sin unidades libres y sin reserva del invitado | no | no |
| Aporte, nadie coordina | «Coordinar este regalo» (el servidor decide unidades) | no |
| Aporte, otro coordina | «Sumarme» | no; ve «{Nombre} lo comprará» o «Alguien del grupo…», y «N personas aportan» |
| Aporte, soy coordinador | no | sí, `quantity` = cantidad total; ve solo los nombres que cada aportante quiso mostrar |
| Aporte, soy aportante | «Salirme del regalo» | no |

## «¿Compraste?»
Intento local por `giftItemId` (id, botón, unidades, hora, fase; 14 días, máx. 50). Web: `localStorage`; app: `readLocal/writeLocal` (SecureStore / localStorage). Todo con try/catch; sin almacenamiento la lista funciona igual y la tarjeta no vuelve. Vuelta: `visibilitychange` (hidden→visible), `pageshow` persistido, `AppState` background→active; un clic en la misma pestaña se detecta al abrir la lista. «Sí» abre la reserva con las unidades del intento (coordinador: solo agradece; regalo ya tomado: «Alguien se adelantó»), «Todavía no» deja un recordatorio que se muestra una sola vez, «No» cierra. Nada sale del dispositivo.

## PF-1
La UI solo pinta recuentos y nombres que el contrato ya filtró; además `guestGiftState` descarta `contributorNames` si el espectador no es coordinador. El mensaje de WhatsApp lo arma el BE sin datos del invitado; el FE no manda nombre en `/r`. El consentimiento `showName` es opt-in y solo viaja con nombre escrito.

## Impeccable / UI-UX Pro Max / motion / estados
Modo Persuade del invitado, mismas piezas de la lista (sin chips de RSVP para recuentos, sin iconos decorativos, signos del selector dibujados, objetivos ≥ 44 px). Estados: carga (esqueleto existente), vacío, error con salida (409 unidades con número, ya reservado, sin conexión conservando lo escrito) y sin almacenamiento. Movimiento: no se añade animación nueva (la tarjeta aparece sin transición; `Notice` ya respeta movimiento reducido). Accesibilidad: tarjeta como región nombrada, selector como grupo con botones nombrados y valor en `output` con `aria-live`, notas de respuesta con foco/`role=status`.

## Verificación
Ver el cuerpo del PR. Recorrido: `evidence/regalos-r5-fe/walk/` (`salida.txt`, capturas en `shots/`). Gateway del recorrido = enrutador por prefijos (`gw.mjs`), **no Kong**; Celebration y Guest = stub; sin RabbitMQ.

## Ronda 2 (revisión de FE #152)
B-1 botones para quien reserva; M-1 gitleaks en verde (4 huellas falsas de `PURCHASE_STORE_KEY` en `.gitleaksignore`); M-2 contratos @af8280c2; M-3 sin «reservado por» en regalos de aporte; M-5 tarjeta como región con respuestas nombradas, foco (web) y anuncio (app), ayuda de `showName` dentro del nombre de la casilla; M-6 slug de `/r` con la forma del contrato (`^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 100); M-7 máximo 10 intentos (≈1,7 KB con UUID reales en el peor caso (probado), bajo 2048 B); M-8 claves i18n sin uso quitadas.

## Ronda 4 (revisión independiente de FE #152): lista cerrada, WCAG 2.5.3 y gitleaks
- **B1 + M1** (causa raíz: `guestGiftState` no conocía la lista cerrada y cada pantalla lo parchaba): `guestGiftState(item, held, { listClosed })` devuelve `closed`, `canReserve=false`, `chooseUnits=false` y los botones del proveedor solo para quien ya sostiene una reserva (SOLE o coordinador). Web y app: `open()` no hace nada con la lista cerrada, el efecto web depende también de `target` (igual que la app), y «¿Compraste?» con la lista cerrada y sin reserva se pinta en variante cerrada (`prompt.bodyClosed`, una sola acción «Entendido» = `answer('no')`) que deja la nota `prompt.yesClosed` con `role="status"`. Ya no hay camino sin salida ni formulario fantasma.
- **M2** (WCAG 2.5.3): `prompt.yesFor` = «Sí, ya lo compré: {{title}}» / «Yes, I bought it: {{title}}»; el aportante usa `group.leaveFor` («Salirme del regalo {{title}}» / «Leave this gift: {{title}}»).
- **M4**: la constante se renombró `PURCHASE_STORAGE_SLOT`; el código actual no dispara `generic-api-key`. Las 4 huellas de `.gitleaksignore` se conservan solo para commits que ya están en el historial de la rama (no se reescribe); con merge squash sobran y deben borrarse.
- Menores hechos de paso: m1 (plural de `units.help`), m5 (`prompt.closed` pasa a `prompt.dismissed`).
- Pruebas nuevas: `guest-card` (3, estado cerrado), web `gifts-r5.test.tsx` (5 de lista cerrada + M2), app `guest-gifts-r5.test.tsx` (5 de lista cerrada, incluida la reapertura por refetch sin formulario fantasma), en es-BO y en-US.
- **Ejecutado en este worktree** (Node 22, yarn 4.10.3, `--mode=skip-build`): `eslint --max-warnings 0` sobre apps/seo-web, apps/universal, packages/query-hooks y packages/i18n; `tsc --noEmit` en esos cuatro; `vitest run` i18n 18/18, query-hooks 269/269, seo-web 276/276, universal 931/931; `next build` de apps/seo-web.
- **No ejecutado**: gitleaks (no está instalado aquí), recorrido en Chrome real con lista cerrada, `check:generated`/contratos (no se regeneró contra otro SHA), build nativo, Kong/TEST. M3 (evidencia del PR sobre la punta final, base del PR, SHA de contrato fusionado) y m2-m4, m6-m11 siguen abiertos.

## Pendiente
0. M-4: la tarjeta no muestra la versión elegida, el proveedor con sello ni «Entrega en {ciudad}»: gift-list 1.18.0 solo trae `variantCode` (un id) y el detalle público del listing no trae variantes. Hace falta un campo en el BE (etiqueta de la versión). No se inventa en el FE; solo el mensaje de WhatsApp lleva `{version}`.
1. Recorrido contra Kong y TEST con Celebration y Guest reales; build nativo y recorrido en dispositivo (la app Expo solo está en jsdom).
2. Contraste y lector de pantalla en la app nativa; secuencia con movimiento reducido en dispositivo.
3. `{ciudad}` del mensaje: el contrato de celebración no trae ciudad; solo se manda `city` si ya se conoce (hoy no).
4. «No disponible» visible al invitado (`El proveedor ya no lo ofrece`): el BE sigue ocultándolo hasta R7.
5. Línea base visual (capturas) del repositorio: macOS, no regenerada en Linux.
