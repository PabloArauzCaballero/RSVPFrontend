# Fabio · El negocio, en la superficie

> Tu eje frontend es el que convierte el tráfico en dinero. El carril `F27` es el más importante del repositorio entero: si un solo enlace a un partner sale directo en vez de pasar por el redirector, se dejan de contar leads **sin que nada falle, sin que nada se rompa y sin que nadie se entere**.

---

## Lo que te pertenece

| | |
|---|---|
| **Superficies** | A14–A19 (lista de regalos pública), B5–B14 (microsites, cotización, agenda y redirector), D1–D15 (portal del proveedor) |
| **Conceptos** | Mini-marketplace, `fulfillment`, atribución de leads, UTM, métricas de partner |

Tenés menos carriles de frontend que los demás porque en backend tenés doce: Gift List y Provider Catalog son dos dominios completos.

---

## Tu calendario

| Semana | Fechas | Carriles | Foco |
|---|---|---|---|
| 09 | 14–18 dic | [F22](../carriles/lane-F22-lista-de-regalos-publica.md) | Lista de regalos pública |
| 10 🎄 | 21–25 dic | [F25](../carriles/lane-F25-microsite-del-partner.md) | Microsite del partner |
| 11 🎄 | 28 dic – 1 ene | [F26](../carriles/lane-F26-cotizacion-y-agenda.md) | Cotización y agenda en el microsite |
| 12 | 4–8 ene | [F27](../carriles/lane-F27-redireccion-y-atribucion.md) | **Redirección y atribución** |
| 13 | 11–15 ene | [F28](../carriles/lane-F28-portal-del-proveedor.md) | Portal del proveedor y estabilización |

Antes de la semana 9 estás en backend: carriles 25 a 36. Tu calendario completo está en [`RSVPBackend/docs/plan/equipo/fabio.md`](../../../../RSVPBackend/docs/plan/equipo/fabio.md).

---

## Tus carriles

| # | Carril | Entregable que lo cierra |
|---|---|---|
| [F22](../carriles/lane-F22-lista-de-regalos-publica.md) | Lista de regalos | **Catalogados antes que externos**, verificado en el orden renderizado |
| [F25](../carriles/lane-F25-microsite-del-partner.md) | Microsite del partner | `fulfillment` visible **antes** del botón de contacto, sin desplazar en móvil |
| [F26](../carriles/lane-F26-cotizacion-y-agenda.md) | Cotización y agenda | 409 por último cupo y 422 por fecha bloqueada, con mensajes distintos |
| [F27](../carriles/lane-F27-redireccion-y-atribucion.md) | **Redirección y atribución** | **302 siempre; cero enlaces directos a partner en todo el DOM** |
| [F28](../carriles/lane-F28-portal-del-proveedor.md) | Portal del proveedor | El partner entiende de un vistazo cuántos leads le dio la plataforma |

---

## El carril que no puede salir mal

`F27` construye dos cosas:

1. Un componente `PartnerLink` que es la **única** forma permitida de enlazar a un proveedor, más una regla de lint que prohíbe cualquier otra.
2. Un test de Playwright que **renderiza todas las pantallas públicas y del panel, escanea el DOM y falla si encuentra un enlace a un dominio de partner que no pase por `/r/`**.

Ese test no es paranoia. Es la única defensa contra un fallo que no produce ningún síntoma: el producto sigue funcionando perfectamente y la facturación baja.

---

## Lo que esperás de los demás

| De quién | Qué | Para cuándo |
|---|---|---|
| Pablo | F04 y F05 | fin semana 07 |
| Pablo | F03 con Table y DatePicker | fin semana 06 — los necesitás para métricas y agenda |
| Leo | F08 (isla SEO) | fin semana 07 — te bloquea F25 |
| Leo | F24 (buscador de proveedores) | semana 13 — F25 cuelga de sus rutas |

> ⚠️ `F24` es de Leo y está en la semana 13, pero tu `F25` es de la semana 10. Acordá con él en la semana 7 la **forma de las rutas** `/proveedores/{categoria}/{ciudad}` y `/p/{slug}` para que no se pisen. El contrato de rutas se congela ahí.

---

## Riesgos de tu eje

- **`301` en lugar de `302` mata el negocio en silencio.** El navegador cachea la redirección permanente y los clics siguientes del mismo usuario nunca llegan al servidor. Hay un test explícito sobre esto, con un comentario que explica por qué.
- **Confiar el orden de partners al frontend significa perderlo** en cualquier otro consumidor del API. El orden viene del backend; acá solo se respeta y se verifica.
- **Esconder las condiciones de entrega genera conflictos que acaban en la plataforma** aunque no sea responsable. En `F25` el `fulfillment` va antes del botón de contacto y visible sin desplazar en móvil.
- **Si el regalo externo es tan fácil de añadir como el catalogado**, la regla comercial existe solo en el documento. La fricción es deliberada y se mide en número de pasos.
- **El panel de métricas de `F28` es lo que justifica el cobro al partner.** Si no se entiende, la conversación comercial se convierte en una discusión de confianza en lugar de una lectura de datos.
- **Tus carriles 10 y 11 caen en Navidad.** Son el microsite y la cotización, que toleran interrupciones; el crítico, `F27`, está deliberadamente en la semana 12, con capacidad completa.
