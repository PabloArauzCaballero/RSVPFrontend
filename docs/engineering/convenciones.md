# Convenciones obligatorias de código · Frontend

## Descubrimiento y entregas (obligatorio)

Antes de editar código o contrato, consulta CodeGraph 1.6.2 para flujo e impacto y confirma rutas en archivos actuales. Planifica el cambio como slice vertical observable, con REQ, caso negativo y prueba por corte. Las listas por capas de los carriles son inventario, no orden de entrega. Usa la [revisión de 2026-10-16](../plan/revision-vertical-slice-2026-10-16.md). Graphify queda sustituido por CodeGraph.
Para cada interfaz, consulta Impeccable y UI/UX Pro Max contra el diseño vigente; verifica jerarquía, foco, contraste, estados, responsive y copy en la superficie real. La animación requiere propósito, alternativa de movimiento reducido y prueba de interrupción y rendimiento. No agregues GSAP a Expo: usa las primitivas compatibles con cada plataforma.


Estas reglas aplican a código nuevo o modificado. La ficha del carril agrega criterios específicos. Si una regla no corresponde a la superficie cambiada, registra `N/A` con motivo en la evidencia; no la marques como probada.

## Arquitectura y contratos

1. Respeta las dos superficies: `apps/universal` usa Expo Router y primitivas `packages/ui`; `apps/seo-web` usa Next.js y `packages/ui-web`. No importes componentes nativos en la isla SEO.
2. Centraliza transporte, parseo de respuestas y errores en `packages/api-client`; los datos de servidor llegan a pantallas por `packages/query-hooks`. Evita `fetch` directo dentro de vistas. Valida formularios con schemas compartidos en `packages/forms` y contratos publicados; no inventes campos o códigos de respuesta.
3. Toda salida a un partner usa el redirector `/r/{listingId}`. Mantén el destino y la atribución en el backend; prueba los enlaces renderizados cuando toques listados, regalos o microsites.

## Interfaz, accesibilidad e internacionalización

4. Los textos visibles se obtienen de `packages/i18n`; actualiza `es-BO` y `en-US` juntos. Incluye mensajes de error, estados vacíos, etiquetas accesibles y metadatos localizables. No guardes texto traducido como dato de dominio.
5. Formatea horas y fechas con la zona IANA de la celebración o del partner según el caso, nunca con la zona implícita del dispositivo. Monedas usan código ISO y `Intl` para presentación, sin redondeos de negocio en la vista.
6. Cada flujo afectado muestra carga, vacío, éxito y errores que realmente puede devolver el contrato. Conserva entradas de formulario tras errores recuperables. El control de acceso visual no sustituye autorización del backend.
7. Usa semántica, etiquetas, foco visible, teclado, contraste y tamaño de objetivo compatibles con WCAG 2.2 AA en web. En móvil comprueba lector de pantalla y acciones táctiles relevantes. Un escáner automático es una parte de la prueba, no evidencia completa de accesibilidad.
8. Las rutas indexables entregan contenido y metadatos útiles desde servidor. Evita publicar en HTML o metadata tokens, datos privados o URLs de RSVP con credenciales. Comprueba el resultado renderizado para cambios SEO.
9. El movimiento comunica orientación, respuesta o progreso. Usa tokens compartidos; comprueba interrupción, movimiento reducido y continuidad de la tarea sin animación. Toda transición nueva sigue [`rsvp-motion-design`](../../.agents/skills/rsvp-motion-design/SKILL.md) y su prueba visual.

## Estilo y verificación

10. TypeScript permanece en `strict`; tipa props, estados y respuestas. Evita `any`, casts que oculten errores de datos y lógica de negocio duplicada entre apps. Reutiliza tokens de diseño para colores, espaciado y tipografía.
11. Ejecuta los comandos configurados del workspace afectado y `corepack yarn verify` cuando el cambio cruza paquetes o apps. Para pantallas, inspecciona los tamaños y plataformas que exige el carril y guarda evidencia real. No declares probado iOS o Android por una exportación web.
12. `DONE` exige requisitos demostrados, regresión relevante y evidencia reproducible. `PARTIAL`, snapshots no revisados o mocks que omiten estados de error no equivalen a `PASS`.

## Aplicación real

`.editorconfig` fija formato básico. CI ejecuta checks configurados; hoy varios scripts `lint` hacen solo `tsc --noEmit` y algunas suites permiten cero tests. La revisión del PR debe verificar lo que aún no bloquea CI. Para impedir merges con checks rojos, un administrador debe proteger `dev` y `main`: PR obligatorio, una aprobación de otro eje, conversaciones resueltas y check de CI requerido, sin bypass ni force push. Primero confirma el nombre exacto del check en un PR ejecutado. Este documento no activa esa protección.

Referencias: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [guía de accesibilidad de React Native](https://reactnative.dev/docs/accessibility), [Next.js Metadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata), [protección de ramas de GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches). Las fronteras del producto proceden del [plan de RSVP](../plan/README.md).
