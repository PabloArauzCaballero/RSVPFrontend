---
name: rsvp-frontend-lane
description: Ejecuta, continúa o revisa un carril FNN del plan frontend de RSVP con requisitos y evidencia verificables.
---

# Carril frontend

Usa esta skill cuando el trabajo se identifique por un carril `FNN`, o cuando se pida cerrarlo o verificar su estado. La ficha `docs/plan/carriles/lane-FNN-*.md` define el alcance; `AGENTS.md` y `docs/engineering/convenciones.md` definen reglas comunes.

1. Lee la revisión `docs/plan/revision-vertical-slice-2026-10-16.md`, aplica `rsvp-vertical-slice` y consulta `rsvp-code-graph` para el flujo e impacto. El inventario histórico por componentes no fija la secuencia.
2. Localiza la ficha y lee objetivo, REQs, predecesores, riesgos y Definition of Done. Inspecciona rutas, paquetes, tests y contrato del backend afectados; contrasta estado planeado y código observado. Una ficha no demuestra implementación.
3. Relaciona cada REQ con una verificación observable. Identifica superficies implicadas: Next.js, Expo web, iOS o Android. No asumas que una prueba web cubre móvil o que MSW representa una API ya desplegada.
4. Implementa dentro de la app o paquete dueño y comprueba estados de carga, vacío, éxito y error pertinentes con [la skill de estados y accesibilidad](../rsvp-accessible-states/SKILL.md). Ejecuta pruebas dirigidas y corrige fallos causados por el cambio. Si cambian pantallas, rutas, estilo o SEO, aplica [la skill de prueba visual](../rsvp-frontend-visual-proof/SKILL.md). Si hay animación, aplica también [motion design](../rsvp-motion-design/SKILL.md).
5. Ejecuta regresión relevante y el build/typecheck/lint realmente configurados. Para contratos, verifica versión del paquete, schemas, códigos de respuesta y consumo; informa si el backend requerido aún no está disponible.
6. Deja en `docs/progress/evidence/lane-FNN/` una tabla por REQ con `PASS`, `FAIL`, `BLOCKED-EXTERNAL` o `N/A` justificado, comando o artefacto, resultado y fecha. Actualiza registros de progreso o bloqueos existentes cuando cambie el estado del carril.
7. Declara `DONE` solo si todos los REQs aplicables son `PASS`, los gates relevantes pasaron y hubo regresión verificada. Si faltó revisión visual, dispositivo real, binario o entorno externo, informa el estado y el paso exacto pendiente.

Aplica el DoD específico al alcance real del carril; no fabriques capturas o resultados de plataformas sin ejecución.
