# QA 2026-11-13 · #3 "Ajustes" abre Configuración

Reporte: tocar "Ajustes" llevaba a `/publicar`.

Causa raíz: cada destino del menú abre su primera pestaña (`hostNav`: `href = tabs[0]`) y en "Ajustes" la primera era `publish`.

Solución: el orden de pestañas de "Ajustes" pasa a `settings, publish, modes, celebrations, organizations`. Publicar sigue en su pestaña y en la acción "Publicar celebración". Ninguna ruta cambia.

Evidencia (2026-11-13, Chrome real contra dev): 360/768/1280 × claro/oscuro, "Ajustes" abre `/configuracion` con la pestaña Configuración seleccionada. Unitaria nueva en `navigation.test.tsx` (`href` del destino = `/configuracion?c=…`, primera pestaña `settings`).
