# QA 2026-11-13 · #4 Bloques pegados (Equipo / Organizaciones)

Reporte: en Ajustes → Equipo el aviso y la tarjeta "Tus organizaciones" quedaban pegados, sin separación.

Causa raíz: `Screen` pone `gap` en el contenedor del contenido, pero `ScreenTransition` envuelve a los hijos en su propia caja (un `div` en web, `Enter` en nativo). El `gap` separaba esa única caja y no a los bloques de la pantalla. Afectaba a toda pantalla que no envolviera su contenido en una columna propia.

Solución: `Screen` reaplica la columna dentro de la transición (`screen-stack`, `gap` 32 px en móvil y 40 px desde 1024 px, los mismos del contenedor). Arreglo en un único punto, sin tocar las pantallas.

Evidencia (2026-11-13, Chrome real contra dev): separación aviso→tarjeta 72–80 px en 360/768/1280 × claro/oscuro (antes 0); axe sin críticos/serios. Unitaria nueva en `navigation.test.tsx`; falla si se quita la columna (comprobado revirtiendo el arreglo).

Límites: no se hizo una comparación visual completa contra la línea base del resto de pantallas; las que ya tenían su propia columna no cambian (un solo hijo).

## Ampliación (2026-11-13, tarde)

- en-US en Chrome real contra dev (360 oscuro y 1280 claro, axe sin críticos/serios), con las 4 ramas combinadas: los cuatro arreglos se comportan igual ("This is missing." ×2, Settings → /configuracion, separación 70–78 px, 17 ciudades por nombre).
- Puerta visual del repo (`playwright test`, 189 capturas, mock determinista, en-US): `origin/dev` limpio ya falla 38 capturas contra la línea base guardada en el repo (auth, guest y portal; anterior a este PR). Comparando contra una línea base regenerada localmente desde `origin/dev`: 189/189.
