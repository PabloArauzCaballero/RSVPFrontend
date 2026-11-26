# Evidencia · prototipos de plantillas (F4, PR #117)

Capturas de `docs/design/prototipos-plantillas/` hechas en **Linux con Chromium (Playwright)**. Son evidencia de revisión, **no** líneas base de Playwright: no sustituyen ninguna captura de macOS.

## Cómo se generaron

```
cd docs/design/prototipos-plantillas
node _build/build.mjs      # regenera los 3 HTML
node _build/audit.cjs      # auditoría (desbordamiento, texto, táctil, contraste en el DOM, barra, estados); sale 1 si hay avisos
node _build/fichas.mjs     # regenera FICHAS.md con las tablas medidas
node _build/shoot.cjs      # regenera estas capturas
```

## Contenido

- `<plantilla>-<390|1280>-<claro|oscuro>-<foto|sinfoto>.png`: página completa. `pliegue-*`: primer pliegue.
- `ancho-<plantilla>-<320|360|768|900|1024>-claro-foto.png`: primer pliegue en anchos intermedios.
- `barra-<plantilla>-<320|360>-<normal|etiquetas-largas>.png`: barra inferior móvil (etiquetas largas = regalos vacío + sin enlace).
- `estado-*.png`: regalos vacío/cerrado, sin enlace personal, plazo vencido, error de foto, galería con error, y todos a la vez en escritorio oscuro.
- `animacion-*.png`: cinco fotogramas de la animación de entrada. `dibujitos.png`: hoja de contacto de los dibujos.

## No probado

Safari, Firefox, dispositivo real, lector de pantalla, foto real subida, rendimiento de las animaciones. Los textos de los avisos y la etiqueta «Ver mi respuesta» son propuestas de redacción pendientes de Pablo.
