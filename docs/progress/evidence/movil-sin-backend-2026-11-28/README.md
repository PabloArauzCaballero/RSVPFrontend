# Móvil sin backend · evidencia (2026-11-28)

Base: `chore/deploy-contabo-coolify` @ `68af6eb6`. Las capturas de autenticación se tomaron sobre `68af6eb6` (esa pantalla no cambió en la fusión). Chromium 1243 preinstalado (Playwright, sin reinstalar), Linux. Nada de esto se probó en iPhone/Android reales.

## Tipografía de escritorio (PLA-02)
Separada de este PR por la revisión independiente: va en un PR aparte («NO FUSIONAR sin aprobación de capturas»).

## Autenticación en teléfono, tableta y escritorio (MV-D1 corto, MV-D4)
`auth-medidas.json` y `auth-{login,recuperar,registro}-{light,dark}-{360,768,1280}.png` (contrato mock, `yarn expo start --web`):
- 360 y 768: figura decorativa (`aria-hidden`, 64 px) junto al logo; la acción de login y recuperar está en el grupo «Actions» (`position: sticky` en web); el pastel de `welcomeHost` ya no es amarillo (ningún `#FBF3DB`/`#3A3012` en el DOM).
- 1280: columna editorial con la figura grande (148 px, también en azul), sin barra.
- Sin desbordamiento horizontal. Con formulario corto en web la barra queda bajo los campos (sticky solo se pega cuando hay desbordamiento).
- `registro` no se modificó (otra sesión); su barra sigue `relative` en las medidas.

## Pruebas (salida real)
- `yarn lint`, `yarn typecheck`: 19/19 tareas OK. `yarn test`: todas las suites verdes (celebration-theme 3028, ui 357, universal 1086, seo-web 302, query-hooks 311, auth 89, etc.). `@rsvp/design-editor` `versions.test.tsx` falló una vez en la corrida en paralelo por tiempo (42 s) y pasa aislado (31/31) y en la segunda corrida completa.
- Nuevas: `apps/universal/test/auth-short-forms-phone.test.tsx` (4), y las 4 de MV-B1 en `motion-kit.native.test.tsx` (cherry-pick).

## No verificado
iPhone/Android, safe area y teclado reales; `Enter` nativo con el driver real; gitleaks (no instalado); baselines visuales de `apps/universal/e2e/__screenshots__` (auth-login/recuperar/registro en 390 y 768 cambian por la figura; se generan en la plataforma de baselines, no en esta nube).
