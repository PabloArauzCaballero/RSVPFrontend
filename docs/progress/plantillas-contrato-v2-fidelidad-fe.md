# Plantillas: contrato v2 de fidelidad (FE, Template/Media 1.8.0 provisional)

Fecha: 2026-11-26 (Linux, Node 22, Chrome real `/usr/bin/google-chrome`). Contrato revendorizado desde BE `525802b2` (`RSVP_BACKEND_REPO` local; la API de GitHub no estaba autorizada).

## Qué entrega
- Lector (`readDesign`): `animation.name`, `mask`, `frame`, `veil`, `page.animation`; todo valor fuera de lista se descarta; un `name` no lleva `durationMs`; `abrir-puertas` solo en páginas, `mecerse` solo en elementos.
- Renderizador: máscaras y marcos por elemento, portadas `arch|hanging|deco|poster`, animaciones nombradas, velo degradado (por defecto) o uniforme, póster del video (`posterMediaId`). La capa protegida (`.rsvp-protected`, dock) no recibe máscara, marco ni animación, ni en el HTML ni en las reglas CSS.
- Movimiento (rsvp-motion-design): tokens en `@rsvp/design-tokens/motion`, reflejados en la hoja y vigilados por prueba; solo `transform`/`opacity` (la cortina recorta con `clip-path`); una sola vez; todo dentro de `prefers-reduced-motion: no-preference` (con movimiento reducido no hay paneles ni balanceo y el estado final se ve al instante); los paneles no toman clic y quedan bajo la capa protegida (z 500 < 1000 < 2000); duración máxima 2,2 s (< 5 s, WCAG 2.2.2).
- Velo: `graded` = 0,2 sobre la foto y panel de ≥ 0,85 (y ≥ lo que pida AA) tras cada bloque de texto; `even` = el velo uniforme anterior. AA medido en el peor caso (foto negra y blanca) en las 30 plantillas, claro y oscuro, con velo propio 0/0,4/0,8: `fidelity.test.tsx`.
- Semillas Marfil, Gala y Piñata con lo nuevo (iguales a las del BE).
- Editor e i18n es-BO/en-US: commits previos de la rama (controles Básico/Avanzado), ahora con las listas compartidas.

## Cambio de comportamiento a revisar
El velo por defecto de un fondo de foto sin `veil` pasa a `graded` (lo dice el contrato). Los dos tests del velo uniforme ahora fijan `veil: "even"`; no se debilitó ninguna aserción.

## Resultados observados
| Comando | Resultado |
|---|---|
| `yarn typecheck` | 19/19 tareas OK |
| `yarn eslint . --max-warnings 0` | salida 0 |
| `yarn workspace @rsvp/celebration-theme test` | 18 archivos, 3068 pruebas OK |
| `yarn workspace @rsvp/design-editor test` | 474 OK |
| `yarn workspace @rsvp/design-tokens test` / `build` | 92 OK / tokens verificados |
| `yarn workspace @rsvp/seo-web test` | 210 OK |
| `yarn workspace @rsvp/contracts check:generated`, `check:source` (contra BE local), `test` | OK; template-media 1.8.0 |
| Playwright con Chrome real, `playwright.v2f.config.ts`, sitio `next build` + `next start` sobre el fixture del contrato | 50/50 (Marfil/Piñata/Gala, con y sin foto, claro/oscuro, 360/768/1280: variante de portada, botón de regalos ≥ 44 px y no cubierto, sin desborde, axe sin hallazgos, sin paneles ni balanceo con movimiento reducido; puertas de Gala sin tomar el clic y fuera de la vista al final; la piñata se mece y vuelve a reposo) |

Capturas (evidencia, no líneas base): `docs/progress/evidence/plantillas-v2-fidelidad/`. Líneas base commiteadas que cambian: ninguna (no se ejecutó `test:visual` ni se actualizó ningún `__screenshots__`).

## No probado
- Fondo de foto real con velo degradado en el navegador: ningún fixture lo trae; está cubierto por pruebas unitarias y el cálculo de peor caso, no por captura.
- iOS/Android: el invitado ve la web (P10). gitleaks no está instalado en este entorno.
- Gala escritorio: la foto de portada (chaflán) queda alineada a la izquierda dentro del marco; pendiente de criterio de diseño.

## Reversión
Revertir el PR vuelve al contrato 1.4.2 vendorizado; los documentos con campos 1.8.0 dejan de verse decorados pero se leen (campos ignorados). Revertir primero este PR y luego el del BE.
