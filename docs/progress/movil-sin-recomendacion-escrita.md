# Móvil sin backend: qué tiene recomendación escrita y qué no

Fecha: 2026-11-28. Base: `chore/deploy-contabo-coolify` @ `68af6eb6` (incluye FE #158/#159 por el merge #174); se fusionó después `5c56053d`.

Regla del dueño (`docs/bugs/auditorias/2026-11-27/DECISIONES-2026-11-28.md`, rama `bugs/catalogo` de RSVPBackend): «Móvil (tipografía, cuenta en 4 pasos, figura por paso, botón fijo en tablet y formularios cortos, paso 3): aplicar la recomendación escrita en los documentos de diseño; donde no haya recomendación escrita, no inventar y anotarlo.»

Documentos revisados: `DECISIONES-2026-11-28.md`, `auditorias/2026-11-26/app-movil/MOVIL.md`, y en `auditorias/2026-11-27/traspaso-nube/`: `diseno-movil-D2-D3-D4.md`, `estado-movil.md`, `informes/auditoria-movil.md`, `TRASPASO.md`, `NUBE.md`, `CATALOGO-BRECHAS.md`, `PLAN-CORRECCIONES.md` (más `informes/preguntas-pablo.md` y `CATALOGO.md` para buscar la tablet).

## Aplicado (con la frase que lo respalda)

| Ítem | Recomendación escrita | Qué se hizo |
|---|---|---|
| c) Formularios cortos | `MOVIL.md` MV-D1: «Botón de acción fijo abajo en el celular: Siguiente, Guardar, Crear y los demás… Vale para **todos** los formularios y pasos de la app.» `auditoria-movil.md`, tarea 3b: «`provider/**`, `account`, `partner`, `directory`, `guest`, organizaciones y login/recuperar». | Inicio de sesión, recuperar y restablecer contraseña (pantallas cortas de `auth/screens.tsx`) usan la barra de acciones (`FormActions`, nuevo en `auth-ui.tsx`) en teléfono y tablet (< 900 px). Ver «Pendiente» para el resto del inventario C. |
| d) Paso 3 vacío (MV-B1) | `auditoria-movil.md`: «Una opción es un árbol estable (sin cambiar de fragmento a `Enter` ni remontar por key) con estado final garantizado.» `CATALOGO-BRECHAS.md` MOV-01: «árbol estable con estado final garantizado». | Cherry-pick de `1718abfc` (`fix/mv-b1-paso3-vacio`): `Enter` nativo fuerza el estado final con un temporizador de JS y deja props planas al terminar. `fix/mv-b1-pantalla-opacidad-cero` ya estaba contenida en la oficial (FE #159). La causa nativa sigue sin confirmar. |
| e) Figura por paso (MV-D4), parte inequívoca | `diseno-movil-D2-D3-D4.md` §3: «hacer que `AuthLayout` muestre la figurita en móvil (hoy solo `wide`), con tamaño pequeño para no empujar el contenido bajo el botón fijo… (`aria-hidden`)». `MOVIL.md` MV-D4: «nunca amarillo, sin caras». `PLAN-CORRECCIONES.md`: «figuras nuevas sin amarillo mediante `pastel`»; `CATALOGO-BRECHAS.md` MOV-06: «PROVISIONAL: figuras nuevas y del registro usan prop `pastel` azul/verde; tokens intactos». | `AuthLayout` muestra la figura (64 px, decorativa) junto al logo en < 900 px. Si la figura es del grupo anfitrión (pastel amarillo), usa `pastel="blue"`. Los tokens y el resto del producto no cambian. |

## Sin recomendación escrita (NO se inventó; pregunta pendiente)

1. **Botón fijo en tablet nativa ancha: ¿barra fija o en cabecera?**
   - Solo existe la pregunta: `estado-movil.md`, «MV-A2: tablet nativa ancha, ¿barra fija o en cabecera?». `MOVIL.md` MV-D1 habla del «celular». `auditoria-movil.md` solo anota que el comentario de `shell.tsx` «dice 768 y está desactualizado» (el umbral real es 960).
   - Qué hace hoy el código y se dejó igual: `Screen` usa la barra (acoplada abajo en nativo) por debajo de 960 px y la cabecera desde 960 px; `AuthLayout` cambia a 900 px. Una tableta nativa vertical (768) queda con barra fija; una apaisada ancha (>= 960) con cabecera.
   - Pregunta para Pablo: ¿en tableta nativa ancha la acción va en barra fija o en cabecera, y desde qué ancho?
2. **Formularios cortos: alcance exacto.** MV-D1 dice «todos», pero no distingue formularios que caben sin desplazar. Se aplicó «todos» solo a las pantallas de autenticación cortas. Pregunta: ¿entran también el resto del inventario C de `auditoria-movil.md` (organizaciones, solicitud de partner, directorio, regalos del invitado, grupos/ajustes/preferencias del anfitrión, resumen del proveedor) y las pantallas con dos guardados (`settings-screen.tsx`)? La auditoría lo deja como pregunta («si D1 incluye acciones que no son de formulario y las pantallas con dos guardados»).
3. **Barra fija en web con formulario corto.** En web la barra es `position: sticky`: queda fija abajo solo si el contenido desborda; con un formulario corto aparece justo debajo de los campos (medido a 360, 768 y 1280). En nativo el dock sí la pega al borde. No hay texto escrito que pida «pegada al borde aunque sobre espacio» en web. Pregunta: ¿se quiere la barra pegada al borde inferior también en web con formularios cortos?
4. **Figura por paso en «Crea tu invitación» (pasos 2 y 3) y en «los demás formularios».** `diseno-movil-D2-D3-D4.md` §3 solo dice «`calendar` y `invitation` podrían servir» (paso 2/3 de la auditoría) y «`table`, `welcomeHost`» / «`published`, `landingCreate`» como candidatas, y la pregunta 11 («¿Qué formularios exactamente reciben figurita y cuántas por formulario?») sigue sin respuesta. No se asignó ninguna.
5. **Color exacto por paso.** Pregunta 5 del diseño: «¿qué color exacto debe llevar cada paso del registro, y debe ser el mismo en claro y oscuro?». La regla provisional («azul/verde») se aplicó solo como «el amarillo pasa a azul»; las demás figuras conservan su pastel de grupo.
6. **Figuras nuevas (sobre con código, gafete, pin de ciudad, llave).** El diseño las describe, pero solo sirven al registro en 4 pasos, que hace otra sesión. No se dibujaron: no tienen pantalla que las use aquí y el archivo `illustrations.ts` (y su copia en `apps/seo-web`) es zona de choque. Pendiente para esa sesión, con la descripción de §3.
7. **Reiniciar el scroll al cambiar de paso (onboarding).** `auditoria-movil.md` MV-B1: «Conviene igualmente reiniciarlo al cambiar de paso». Es una sugerencia sobre una hipótesis descartada como causa; no se aplicó.

## Pendiente de la sesión del registro

El registro en 4 pasos (MV-D2/D3 y las figuras nuevas) no se tocó. `RegisterScreen` conserva su propia lógica de barra; solo se cambió `AuthLayout` (figura en móvil), que esa sesión también hereda.


## PLA-02 (tipografía de escritorio)
Separada de este PR: exige «fusionar solo con capturas aprobadas» (CATALOGO-BRECHAS PLA-02, PLAN-CORRECCIONES). Va en su propio PR con hoja de contactos.

Notas de alcance de este PR (FE #177): el registro recibe la figura (`illustration="table"`) por `AuthLayout` sin tocar los 4 pasos; la barra sticky en web no queda pegada al borde con formularios cortos (sin recomendación escrita, punto 3).
