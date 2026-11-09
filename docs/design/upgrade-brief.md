# Brief de la mejora de experiencia: personalidad y simplificación

Rama `feat/upgrade-ux-personalidad` (parte de `feat/rediseno-marca`, PR #9 pendiente de revisión). Manda sobre el gusto de quien edite; las prohibiciones de `DESIGN.md` siguen vigentes.

## 1. Personalidad (qué hace que DOne no parezca una plantilla)

**Idea central: el toque.** La marca es un cheque dentro de una D («Que te respondan en un toque»). Todo el producto gira en torno a un gesto: invitar, tocar, confirmar. La personalidad es la de alguien que organiza la fiesta contigo: cálida, ágil, sin solemnidad, con el orgullo tranquilo de quien ya tiene todo resuelto.

**Voz** (para `copywriting`, `copy-editing`, `ux-writing-microcopy`):
- Tuteo boliviano neutro, nunca voseo ni jerga. Frases cortas, verbos de acción, una idea por línea.
- Habla de personas y momentos, no de «módulos»: «Quién viene», «Tu invitación», «Regalos», no «Gestión de invitados».
- Celebra los hitos con medida: una frase y un gesto, no confeti permanente. Los errores no culpan: dicen qué pasó y cómo seguir.
- Prohibido: «¡Bienvenido a la plataforma!», «No se pudo completar la acción», «Error 500», jerga técnica (slug, token, endpoint), signos de exclamación en errores, «Sin datos».
- Cada pantalla vacía responde tres preguntas: qué es esto, por qué importa, cuál es el primer toque.

**Forma y movimiento (firma visual):**
- **El cheque** como motivo único: se dibuja (trazo animado) al confirmar, publicar, guardar o responder. Un solo componente `CheckMark`/`Celebrate` reutilizable. Con `prefers-reduced-motion` aparece sin animación.
- **Ilustración de línea** propia (trazo grueso, redondeado, azul sobre noche o noche sobre claro) para estados vacíos, bienvenida y errores amables. SVG inline, no emojis ni glifos. Un set pequeño y coherente (invitación, sobre, regalo, calendario, mesa, ficha de proveedor, conexión caída).
- Esquinas muy redondeadas de la D; la sábana que sube sobre la portada (ya existe) es el gesto de marca; se repite en tarjetas destacadas.
- Fuente única Plus Jakarta Sans, con peso 800 y tracking cerrado en títulos para dar carácter.
- Movimiento según `rsvp-motion-design`: entradas de 150–250 ms con salida suave, el cheque como única animación «de celebración», nada decorativo en bucle.

## 2. Simplificar: fusionar funciones y reducir lo que ve el usuario

Hoy el anfitrión ve unas 17 entradas de menú. La regla: **menos destinos, más claridad; cada pantalla con una acción principal**. Solo se ofrece lo que el backend soporta (ver `docs/progress/evidence/botones-crud-2026-11-06.md` para las brechas).

**Anfitrión (de 17 a 6 destinos):**

| Destino | Absorbe (pestañas o secciones dentro) |
|---|---|
| **Inicio** | Resumen de invitados + siguiente mejor paso («Publica tu invitación», «Agrega 5 invitados», «Aprueba 2 solicitudes») + avance de la celebración |
| **Invitados** | Lista, agregar, importar, grupos, ajustes de invitados, reporte RSVP, solicitudes de acompañante |
| **Regalos** | Mi lista, reservas pendientes, y un solo flujo «Agregar regalo» con tres orígenes (catálogo, proveedor, externo) |
| **Mi invitación** | Contenido, galería, traducciones, plantilla, vista previa |
| **Avisos** | Bandeja, preferencias, permisos push |
| **Ajustes** | Publicar (checklist), configuración, modos, equipo, historial, mis celebraciones |

**Proveedor (de 10 a 5):** Resumen · Ofertas (servicios, productos y condiciones de entrega en un solo lugar) · Agenda (disponibilidad y reservas) · Clientes (leads y métricas) · Perfil (microsite, documentos, destinos).
**Admin:** agrupar en Verificación y moderación · Catálogo (categorías, geografía, tipos de evento, plantillas) · Personas (usuarios, organizaciones) · Operación.
**Invitado:** un solo recorrido: invitación → responder → (opcional) regalo; sin pasos intermedios.

**Principios de simplificación:**
- Una acción primaria por pantalla; las secundarias en menú «Más» o como enlaces.
- Divulgación progresiva: lo avanzado (retención, estados raros) detrás de «Más opciones».
- Alta guiada: el anfitrión nuevo llega a «invitación publicada» en 3 pasos con vista previa en vivo (`onboarding`, `signup`).
- Un solo lugar para cada dato: no repetir el mismo número o estado en tres pantallas.
- Todo debe seguir funcionando con las rutas actuales o con redirecciones; no romper enlaces ya compartidos.

## 3. Skills de marketing (obligatorio abrir el `SKILL.md` íntegro antes de usarlas)

`product-marketing` (contexto: `.agents/product-marketing.md`, **no inventar cifras, precios, clientes ni testimonios**; lo no validado se marca como pendiente), `copywriting`, `copy-editing`, `cro`, `signup`, `onboarding`, `marketing-psychology`, `site-architecture`, `seo-audit`, `schema`, `emails`/`popups` si aplica, y las de UI: `impeccable`, `ui-ux-pro-max`, `ux-writing-microcopy`, `visual-hierarchy-composition`, `rsvp-motion-design`, `rsvp-accessible-states`, `rsvp-frontend-visual-proof`. Cada entrega cita qué skill aplicó y qué decisión salió de ella.

## 4. Reglas que no cambian

AGENTS.md y `rsvp-pr-gate`: PR a `dev`, sin push directo, un agente no aprueba su propio PR; i18n es-BO y en-US; accesibilidad (axe, 44 px, foco, reduced-motion); sin parches, sin debilitar pruebas, sin `skip`/`only`; evidencia real (Playwright con Chrome real contra el backend real). Las capturas base solo las regenera el orquestador.
