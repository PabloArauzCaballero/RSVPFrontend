# Plantillas: contrato v2 de fidelidad (FE, Template/Media 1.8.0)

Fecha: 2026-11-26 (Linux, Node 22, Chrome real `/usr/bin/google-chrome`). Contrato revendorizado desde BE `25976e7d` (rama del PR #164 con el merge de la oficial; `RSVP_BACKEND_REPO` local; la API de GitHub no estaba autorizada). Al estar sobre la oficial trae también Celebration 1.6.0 (F7): el tipo `PublicPageState` de `query-hooks` gana `HIDDEN` para que la conformidad de contrato compile.

## Qué entrega
- Lector (`readDesign`): `animation.name`, `mask`, `frame`, `veil`, `page.animation`; todo valor fuera de lista se descarta; un `name` no lleva `durationMs`; `abrir-puertas` solo en páginas, `mecerse` solo en elementos.
- Renderizador: máscaras y marcos por elemento, portadas `arch|hanging|deco|poster`, animaciones nombradas, velo degradado (explícito) o uniforme, póster del video (`posterMediaId`). La capa protegida (`.rsvp-protected`, dock) no recibe máscara, marco ni animación, ni en el HTML ni en las reglas CSS.
- Movimiento (rsvp-motion-design): tokens en `@rsvp/design-tokens/motion`, reflejados en la hoja y vigilados por prueba; solo `transform`/`opacity` (la cortina recorta con `clip-path`); una sola vez; todo dentro de `prefers-reduced-motion: no-preference` (con movimiento reducido no hay paneles ni balanceo y el estado final se ve al instante); los paneles no toman clic y quedan bajo la capa protegida (z 500 < 1000 < 2000); duración máxima 2,2 s (< 5 s, WCAG 2.2.2).
- Velo: `graded` (explícito) = 0,2 sobre la foto y panel de ≥ 0,85 (y ≥ lo que pida AA) tras cada bloque de texto; `even` (también el valor ausente) = el velo uniforme anterior. AA medido en el peor caso (foto negra y blanca) en las 30 plantillas, claro y oscuro, con velo propio 0/0,4/0,8: `fidelity.test.tsx`.
- Semillas Marfil, Gala y Piñata con lo nuevo (iguales a las del BE).
- Editor e i18n es-BO/en-US: commits previos de la rama (controles Básico/Avanzado), ahora con las listas compartidas.

## Ronda 1 de revisión
- **PL-FE145-1 (velo por defecto)**: un `veil` ausente se lee como `even` y `readDesign` lo escribe explícito: todo documento guardado antes de 1.8.0 conserva el velo uniforme que tenía; `graded` solo si el documento lo dice (el editor lo escribe explícito al elegir la primera foto y en el interruptor; el contrato del BE lo dice igual). Las dos pruebas que antes fijaban `veil: "even"` por el cambio de defecto se vuelven a escribir como «ausente = uniforme». **Pregunta abierta a Pablo (una sola vez, en el PR):** ¿ausente = `graded` (los documentos con foto ya guardados cambian de aspecto) o `even`? Se implementó `even`; la otra variante es una línea en `read.ts`, el editor y el contrato.
- **PL-FE145-2 (panel del velo)**: el panel fuerte cubre ahora todo bloque con texto (`imageText`, `gallery`, `music`, `map`, `video`, `button`, `weddingParty`, `html` además de los anteriores); una prueba lee el contrato y exige que cada tipo de bloque esté en exactamente una de las dos listas (texto / sin texto). Nueva prueba en navegador real sobre `fixture-v2-velo` (Marfil con un tablero de ajedrez negro y blanco tras todas las páginas): mide el panel pintado, el velo y la superficie propia de cada bloque contra la tinta calculada de cada línea (texto, secundaria, acento, botón) en las dos peores fotos, 4,5:1 (3:1 en texto grande), claro y oscuro, 360 y 1280. Se comprobó por mutación (sin panel falla con 1,15:1).
- **PL-FE145-3**: el editor no ofrece animación con nombre en los botones de regalos y confirmar (el servidor la rechaza, PL-164-1) y ofrece `revelar-telon` en elementos.
- **PL-FE145-4 / V4 / V5**: los paneles de las puertas terminan con `visibility: hidden` (siguen en el árbol pero no pintan), sin retardo (la portada queda tapada 1,7 s y no 2,2 s), con un filete deco interior; el comentario de la hoja lo dice.
- **PL-FE145-V1 (foto descentrada)**: causa raíz, el `<picture>` era el elemento de la rejilla y el `img` se encogía dentro; `picture` pasa a `display: contents` en la portada. Aserción en la e2e: |centro de la foto − centro del bloque| ≤ 2 px cuando el bloque es angosto.
- **PL-FE145-V2 (escritorio)**: la composición de los prototipos se dibuja con consultas de contenedor sobre el bloque de portada: Marfil (ventana en arco a la izquierda, nombres a la derecha tras una regla vertical), Piñata (nombres a la izquierda, círculo a la derecha) y Gala (fecha | foto | sede y el título debajo). Para dar ancho al bloque las semillas de Marfil y Piñata cambian de posición en el lienzo de escritorio (iguales a las del BE). Aserciones de posición en la e2e a 1280. **Sigue sin igualarse:** el sello «A&M» sobre el arco de Marfil (no hay bloque que se superponga al arco en el contrato) y que la piñata cuelgue del círculo en Piñata (hoy es una ilustración aparte al lado).
- **PL-FE145-V3**: el tramo de hilo suelto bajo la piñata se elimina (la ilustración ya trae su hilo) y la guirnalda del ornamento `banderin` pasa a un solo cordel continuo (cambia el snapshot de la biblioteca de arte; lo usan Festivo, Fiesta patronal y Despedida como separador).
- **V6**: `fixture-v2-velo` es la captura de peor caso que faltaba (no es una foto real).

## Resultados observados (tras la ronda 1)
| Comando | Resultado |
|---|---|
| `yarn typecheck` | 19/19 tareas OK |
| `yarn eslint . --max-warnings 0` | salida 0 |
| `yarn test` (turbo) | celebration-theme 3070, design-editor 474, design-tokens 92, query-hooks 149, ui 333, seo-web 210, forms 65, auth 89 (+1 skip previo), api-client 17, i18n 15, contracts 6: OK. En la corrida completa bajo carga fallaron 2 pruebas de `versions.test.tsx` (timeouts de 5000 ms, archivo no tocado; el CI de la oficial ya los tiene) y una de `account-links.test.tsx` en universal; las dos pasan al repetirlas solas (474/474 y 16/16) |
| `yarn workspace @rsvp/contracts check:generated` y `check:source` (contra BE local) | OK; BE `25976e7d`, template-media 1.8.0, celebration 1.6.0 |
| Playwright con Chrome real, `playwright.v2f.config.ts`, `next build` + `next start` sobre el fixture | 54/54: Marfil/Piñata/Gala, con y sin foto, claro/oscuro, 360/768/1280 (variante de portada, foto en el eje o en las columnas del prototipo, botón de regalos ≥ 44 px y no cubierto, sin desborde, axe sin hallazgos, sin paneles ni balanceo con movimiento reducido, puertas sin tomar el clic, piñata que se mece) y 4 de AA medido sobre `fixture-v2-velo` |
| `playwright.f6.config.ts` (medios + ataques + libre), Chrome real, `next build` + `next start` sobre el fixture (2026-11-27, sobre la oficial `eb392573`) | **454/454** (14,3 min): la batería completa de ataques son 414 (PL-FE145-R2-2 cerrado) + medios y libre 40. En una primera ejecución, lanzada con `nohup &`, el proceso recibió SIGTERM del entorno (salida 143) a mitad de la batería y no cuenta; la cifra vale solo para la ejecución completa |

Capturas (evidencia, no líneas base): `docs/progress/evidence/plantillas-v2-fidelidad/`. Se regeneraron las capturas de evidencia de esta carpeta (28 PNG; evidencia, no líneas base). Líneas base commiteadas que cambian: ninguna (no se ejecutó `test:visual` ni se actualizó ningún `__screenshots__`).

## Integración con la oficial (2026-11-27)
Merge de `chore/deploy-contabo-coolify` (`eb392573`, trae FE #144, #146, #157) sin conflictos. FE #146 ya añadió a la oficial `.cdesign-cover > picture { display: contents }` y `> source { display: none }`; se quita la regla duplicada de esta rama (la portada conserva la de la oficial). Tras el merge: `lint:code` 0, `typecheck` 19/19, `build` 0, `harness:validate` 0; celebration-theme 3071, design-editor 483, query-hooks 149, seo-web 210, universal 726, i18n 16, contracts 6; `check:generated` y `check:source` (BE `25976e7d`, BE #164 sin cambios) OK; `playwright.v2f.config.ts` 54/54.

## No probado
- Una foto real con velo degradado: `fixture-v2-velo` usa un tablero blanco y negro (el peor caso), no una fotografía.
- iOS/Android: el invitado ve la web (P10). gitleaks no está instalado en este entorno.

## Reversión
Revertir el PR vuelve al contrato 1.4.2 vendorizado; los documentos con campos 1.8.0 dejan de verse decorados pero se leen (campos ignorados). Revertir primero este PR y luego el del BE.
