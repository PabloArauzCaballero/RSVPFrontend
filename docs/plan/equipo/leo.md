> **Replanificación vigente (16-oct-2026):** [slices verticales y gates de CodeGraph, UX/UI y animación](../revision-vertical-slice-2026-10-16.md). Las fechas y tareas de esta ficha son objetivos históricos sujetos a reestimación con evidencia de slices completos.

# Leo · Celebración, contenido y SEO

> Tenés la isla de Next.js, que es la parte del producto que Google lee. El buscador de proveedores que construís en `F24` es el embudo de captación orgánica del negocio: alguien busca «salón de eventos Santa Cruz», llega a nuestra ficha y se convierte en un lead para un partner.

---

## Lo que te pertenece

| | |
|---|---|
| **Apps** | `apps/seo-web` completa |
| **Packages** | `celebration-theme` (el motor de templates) |
| **Superficies** | A1–A8 y A21 (sitio público), B1–B4 (buscador), C3–C5 y C7–C18 (onboarding, editor, publicación y configuración), E1–E12 (admin) |

---

## Tu calendario

| Semana | Fechas | Carriles | Foco |
|---|---|---|---|
| 06 | 23–27 nov | — | Buffer de backend y spike técnico de SEO con Next.js |
| 07 | 30 nov – 4 dic | [F08](../carriles/lane-F08-seo-web-bootstrap.md) | Bootstrap de la isla SEO: SSR, metadatos, JSON-LD, sitemap |
| 08 | 7–11 dic | [F09](../carriles/lane-F09-celebration-theme-engine.md) | Motor de templates theme-driven con cinco layouts |
| 09 | 14–18 dic | [F10](../carriles/lane-F10-sitio-publico-celebracion.md) | Las nueve pantallas del sitio público |
| 10 🎄 | 21–25 dic | [F11](../carriles/lane-F11-onboarding-y-editor-de-contenido.md) | Onboarding y editor de contenido |
| 11 🎄 | 28 dic – 1 ene | [F12](../carriles/lane-F12-templates-preview-y-publicacion.md) | Templates, vista previa y publicación |
| 12 | 4–8 ene | [F13](../carriles/lane-F13-configuracion-y-switches.md) · [F14](../carriles/lane-F14-admin-plataforma.md) | Configuración, modos de control y admin |
| 13 | 11–15 ene | [F24](../carriles/lane-F24-buscador-publico-de-proveedores.md) | Buscador público de proveedores y estabilización |

Antes de la semana 6 estás en backend: carriles 10 a 16. Tu calendario completo está en [`RSVPBackend/docs/plan/equipo/leo.md`](../../../../RSVPBackend/docs/plan/equipo/leo.md).

---

## Tus carriles

| # | Carril | Entregable que lo cierra |
|---|---|---|
| [F08](../carriles/lane-F08-seo-web-bootstrap.md) | Isla SEO | **Lighthouse SEO por encima de 95**, medido en CI |
| [F09](../carriles/lane-F09-celebration-theme-engine.md) | Motor de templates | Un template nuevo cambia el sitio **sin desplegar el frontend** |
| [F10](../carriles/lane-F10-sitio-publico-celebracion.md) | Sitio público | Nueve pantallas con snapshot aprobado en tres breakpoints |
| [F11](../carriles/lane-F11-onboarding-y-editor-de-contenido.md) | Onboarding y editor | Ningún formulario pierde datos al fallar el guardado |
| [F12](../carriles/lane-F12-templates-preview-y-publicacion.md) | Vista previa y publicación | **Cambiar template y volver deja el contenido idéntico** |
| [F13](../carriles/lane-F13-configuracion-y-switches.md) | Configuración y modos | Cada interruptor explica su consecuencia antes de confirmar |
| [F14](../carriles/lane-F14-admin-plataforma.md) | Admin de plataforma | **Crear un tipo de evento desde la interfaz y usarlo**, sin desplegar |
| [F24](../carriles/lane-F24-buscador-publico-de-proveedores.md) | Buscador de proveedores | Rutas de categoría y ciudad indexables, Lighthouse sobre 95 |

---

## Lo que esperás de los demás

| De quién | Qué | Para cuándo |
|---|---|---|
| Pablo | F01, F02 y F03 | fin semana 06 — te bloquea F08 |
| Pablo | F04 (cliente de API y hooks) | fin semana 07 — te bloquea F11 |
| Pablo | F06 (i18n y formatos) | fin semana 08 — te bloquea las traducciones de F11 |
| Fabio | Datos de proveedores en el backend | fin semana 06 — te bloquea F24 |

---

## Riesgos de tu eje

- **Si una ruta indexable termina renderizándose solo en el cliente, Google la ve vacía.** No falla nada, no hay error en consola: simplemente el embudo orgánico desaparece. Por eso Lighthouse es un umbral bloqueante en CI, no una comprobación manual.
- **Programar un componente por template funciona para los dos primeros y se vuelve inmanejable en el quinto.** El motor theme-driven es la diferencia entre un template nuevo que cuesta una fila y uno que cuesta una semana.
- **Un editor que pierde lo escrito cuando falla la red es la queja número uno de este tipo de producto.** El borrador local no es opcional.
- **El admin suele ser lo último y lo peor cuidado.** Si el editor de tipos de evento de `F14` no funciona, el carril 11 del backend pierde todo su valor: el cliente internacional vuelve a depender de un desarrollador para añadir un tipo de celebración.
- **Tus dos carriles de Navidad son editores.** Toleran interrupciones mejor que el motor de templates o la isla SEO, por eso están ahí.
