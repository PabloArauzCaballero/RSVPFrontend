# QA 2026-11-13 · #3 "Ajustes" abre Configuración

Reporte: tocar "Ajustes" llevaba a `/publicar`.

Causa raíz: cada destino del menú abre su primera pestaña (`hostNav`: `href = tabs[0]`) y en "Ajustes" la primera era `publish`.

Solución: el orden de pestañas de "Ajustes" pasa a `settings, publish, modes, celebrations, organizations`. Publicar sigue en su pestaña y en la acción "Publicar celebración". Ninguna ruta cambia.

Evidencia (2026-11-13, Chrome real contra dev): 360/768/1280 × claro/oscuro, "Ajustes" abre `/configuracion` con la pestaña Configuración seleccionada. Unitaria nueva en `navigation.test.tsx` (`href` del destino = `/configuracion?c=…`, primera pestaña `settings`).

## Ampliación (2026-11-13, tarde)

- en-US en Chrome real contra dev (360 oscuro y 1280 claro, axe sin críticos/serios), con las 4 ramas combinadas: los cuatro arreglos se comportan igual ("This is missing." ×2, Settings → /configuracion, separación 70–78 px, 17 ciudades por nombre).
- Puerta visual del repo (`playwright test`, 189 capturas, mock determinista, en-US): `origin/dev` limpio ya falla 38 capturas contra la línea base guardada en el repo (auth, guest y portal; anterior a este PR). Comparando contra una línea base regenerada localmente desde `origin/dev`: 185/189; las 4 diferencias son host-configuracion y host-publicar a 390 px (claro/oscuro), solo el nuevo orden de pestañas; se actualizaron esas 4 imágenes de línea base.
