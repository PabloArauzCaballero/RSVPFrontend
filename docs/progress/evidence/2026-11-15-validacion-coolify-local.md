# Validación local Coolify · 2026-11-15

Rama local `feat/coolify-product-offers`, base `bcf40f17f776da8b726d01839acfc7c95307f445`. Entrega externa reproducible: `validacion-coolify/INFORME_VALIDACION_COOLIFY.md`, `evidencia/`, scripts Playwright y registros con códigos de salida. Sin PR ni despliegue remoto.

- Snapshot propio: ocho contratos generados verificados; Provider 2.4.0 coincide con backend en los campos `CategoryList.listingType` y `ListingSummary.imageUrl`. El generador no detecta un clon hermano `RSVPBackend`, como se planificó para verificar el snapshot de CI.
- Dockerfile universal de despliegue construido con API `http://localhost:8000`, frontend servido en `http://localhost:8081`. Las solicitudes observadas usan ese gateway con servicios reales.
- Chrome: alta y publicación de Vajilla de prueba, categoría KITCHENWARE, imagen sintética HTTPS directa, contacto separado y precio 25000 BOB. Celebración creada desde la app y primer regalo disponible, una sola fila. Recuperación HTTP observada: 404/201/201.
- Primera alta de tienda en otra celebración con enlace y 17500 BOB. Casos de acceso y carrera de creación comprobados por Kong.
- Matriz 360/768/1280 × claro/oscuro × es-BO/en-US: 12/12, formulario, catálogo y Mi lista. Teclado ArrowDown/Tab, sin desborde horizontal y con movimiento reducido. 36 auditorías axe, sin violaciones serias/críticas; aviso moderado `region` en escritorio.
- Se inspeccionaron capturas representativas de formulario móvil, catálogo oscuro en inglés y Mi lista de escritorio. Las 47 pruebas dirigidas de formulario/regalos pasaron. UI completa, en serie: 257 pruebas y cobertura 94.68 % de líneas, con umbrales originales.
- Reversión: frontend construido desde la base previa, restaurado antes de Provider; Chrome sigue mostrando el regalo disponible por Bs 250.

Las comprobaciones generales y sus intentos fallidos permanecen detallados en el informe externo. Turbo filtra variables por defecto: para limitar workers en este entorno Windows se usa `--env-mode=loose`, un workspace y un worker por vez. No se cambiaron tests ni umbrales. Esta ejecución web no acredita binarios iOS/Android ni cierra todos los REQs de F23/F28.
