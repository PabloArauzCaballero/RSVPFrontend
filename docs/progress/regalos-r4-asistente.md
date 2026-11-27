# Regalos R4 FE · asistente del anfitrión y del organizador (`/regalos/agregar`)

- Fecha: 2026-11-26. Rama `feat/regalos-r4-asistente`, sobre `feat/regalos-r2-ficha` (R2, que trae R1).
- Plan: `docs/bugs/auditorias/2026-11-24/regalos-proveedores/PLAN-REGALOS-PROVEEDORES.md` (rama `bugs/catalogo` de RSVPBackend), §3, §5.4 a §5.6, §5.11, §8 R4 y §11.
- Corrige: A32 (parte FE) y M27 (parte FE: Gift pone título y precio desde Provider; el FE ya no los manda).
- Contrato: `corepack yarn workspace @rsvp/contracts generate --ref 925fe05b` (RSVPBackend #165): gift-list 1.17.0, provider-catalog 3.7.0, celebration 1.6.0. `check:generated` en verde. El BE avanzó después a `a7f1348`; los OpenAPI no cambian entre los dos SHA (solo `compatibility.mjs`).

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
| Cantidad | Detrás de `EXPO_PUBLIC_GIFT_QUANTITY` (apagada por defecto): sin R5, «4 de 12» no es real. Apagada se envía `quantity: 1`. Se enciende sin cambiar código | decisión pendiente 2 de BE #165 |
| Interruptor de aporte | Visible siempre; sugerido encendido si precio × cantidad > Bs 1.000 mientras el anfitrión no lo toque | §5.6, §11 |
| Equilibrio | 4 rangos (≤ 200, 200–500, 500–1.000, > 1.000) por unidad; compara con confirmados + pendientes. Regla propuesta: un regalo hasta Bs 200 por cada 4 invitados (`AFFORDABLE_UNITS_PER_GUESTS`) | el plan da solo el ejemplo; umbral por confirmar |
| Ciudad | La celebración no tiene campo de ciudad en el contrato (celebration 1.6.0). Selector «Ciudad de entrega» con `/providers/geo`; arranca con `content.citySlug|city|venueCity` si coincide con el catálogo, si no, «Todas las ciudades». Sin ciudad no se muestra «Entrega en tu ciudad / otra ciudad» (sería falso) | pendiente |
| Precio por versión | Se muestra el precio de la versión elegida (es el del proveedor); Gift guarda el del listing (decisión pendiente 1 de BE #165) | BE #165 |
| Moneda | Solo Bs; con otra moneda de celebración se avisa | D-10 #30 |
| Fechas y horas | El asistente no muestra fechas ni horas: N/A de zona horaria | convenciones 5 |

## Impeccable y UI/UX Pro Max

- Modo Operate (anfitrión). Se respeta `DESIGN.md`: papel cálido, tinta, tarjetas con borde de 1 px, radio 8–12, etiquetas de estado en píldora, sin color como único estado. Reutiliza `Chip`, `SwitchRow`, `StepProgress`, `FilterSelect`, `Notice`, `ActionButton`; no toca `packages/ui`.
- Jerarquía: un titular por paso (foco al cambiar), una acción primaria por paso, el resto secundaria.
- Craft floor: sin eyebrow, sin tarjetas de icono + título + texto, sin borde lateral de color, sin emoji ni glifos como icono (el «+» y «−» del selector de cantidad se dibujan con vistas), sin gradientes.
- Objetivos táctiles: tarjeta de idea, producto, versión y botones de cantidad ≥ 44 px (`minHeight` 48).
- Estados: carga (esqueleto), vacío (con salida a «De una tienda»), error (con «Reintentar»), sin conexión (mensaje propio y selección conservada), éxito (cheque del producto).
- Accesibilidad (jsdom): ideas = `checkbox`; productos y versiones = `radio` en `radiogroup`; aporte = `switch`; progreso = `progressbar` con `aria-valuetext`; errores con `role="alert"`; el foco pasa al titular de cada paso; axe sin violaciones estructurales en los tres pasos. Contraste y lector de pantalla real: pendientes (ver abajo).

## Motion design (rsvp-motion-design)

- Decisión: **no se añade animación nueva**. El cambio de paso reutiliza `Enter from="none"` del sistema (solo opacidad, ~500 ms, estática con movimiento reducido en web y nativo) igual que el cambio de origen de «Agregar regalo». La lista de ideas usa `Stagger` existente. No hay bucles ni movimiento automático.
- Función del movimiento: orientar el cambio de paso; la tarea funciona completa sin él.
- Barra de equilibrio: ancho proporcional sin transición (cambia con la selección, no se anima).
- Interrupción y movimiento reducido: heredados de `Enter`; probados por `packages/ui`. En esta etapa solo se verificó en jsdom; la secuencia temporal en navegador real queda pendiente.

## Verificación

Ver el cuerpo del PR (comandos, resultados y límites). Resumen del nivel alcanzado: `TESTED` con mocks de contrato (vitest/jsdom); `VERIFIED` no alcanzado.

## Pendiente

1. Recorrido en Chrome real contra el backend real (gateway Docker con BE #165 + #161): no hay Docker en esta sesión.
2. Capturas de macOS (no se regeneran en Linux): `host-regalos-catalogo-768`, `host-regalos-catalogo-1440`, `host-regalos-proveedores-768`, `host-regalos-proveedores-1440`, `host-regalos-390` y `host-regalos-768` (la lista suma cantidad, aporte y notas solo con datos del mock). Capturas nuevas sugeridas: cada paso del asistente en 390/768/1440, claro y oscuro, es-BO y en-US; estado vacío y estado de error del paso 1; resumen con error 422 por producto.
3. Contraste AA, lector de pantalla (VoiceOver, TalkBack) y secuencia de movimiento en dispositivo.
4. Ficha completa del producto (galería, descripción, garantía): la tarjeta de recomendación no las trae; hace falta un detalle público del producto en provider-catalog.
5. «Ver más productos» de una idea con más de 12: la API pagina con `ideas=<código>&offset=`; esta etapa muestra los 12 primeros y lo dice.
