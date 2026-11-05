## Capturas A1-A8 y A21 · 2026-11-05

Comando: `MODE=fixture BASE=http://localhost:3318 API=http://localhost:28100 CHROMIUM_PATH=... node apps/seo-web/scripts/audit.mjs` (y `MODE=live` contra el gateway :28000). Chrome local, 360/768/1280, locale es-BO, zona America/La_Paz; en cada captura axe (wcag2a/aa/21aa) sin violaciones critical/serious, sin scroll horizontal y foco con Tab.

- **Fixture** (`*-fixture-{360,768,1280}.png`): A1 portada, A2 historia, A3 itinerario, A4 lugares, A5 galería, A6 dress code, A7 FAQ, A8 recomendaciones, A21 no publicada, y A1 en en-US. Celebración `fixture-ana-y-luis` servida por `fixture-api.mjs` (contrato de `GET /celebrations/public/{slug}`, plantilla y galería con imágenes SVG sintéticas). **Prueba el renderizado, no datos reales.** Todas con status esperado (200, y 404 en A21).
- **Live** (sin sufijo): A1, A1-en, A4 y A21 contra datos reales de Celebration. A2, A3, A5-A8 devuelven 404 correcto porque las celebraciones del backend de prueba no tienen contenido en esas secciones.
- Estado de REQ-F10-01/03: capturas completas por breakpoint con datos de fixture; son inspección + axe, no snapshots automatizados con baseline. No inspeccioné cada PNG de los 30: revisé a ojo los de microsite y búsqueda por geo, no todos los de A.
