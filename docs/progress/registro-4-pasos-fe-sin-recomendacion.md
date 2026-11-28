# Registro en 4 pasos (FE-S1 a FE-S6): qué tenía recomendación escrita y qué no

Fecha: 2026-11-28. Regla del dueño (`DECISIONES-2026-11-28.md`, rama `bugs/catalogo` de RSVPBackend): «aplicar la recomendación escrita en los documentos de diseño; donde no haya recomendación escrita, no inventar y anotarlo». Fuentes: `MOVIL.md` (MV-D2, D3, D4) y `diseno-movil-D2-D3-D4.md` (§1.2, §2.4 FE-S1..S6, §3, §4 R6).

## Aplicado, con su cita

| Qué | Cita | Dónde |
|---|---|---|
| 4 pasos: correo + código de 6 dígitos; tipo de cuenta, nombre y apellido; teléfono y ciudad; una contraseña con mostrar y novedades. Barra de progreso arriba, botón fijo abajo | MV-D2 | `register-screen.tsx`, `StepProgress` (reutilizado), `FormActions` (FE #177) |
| La pantalla nunca revela si el correo existe; texto idéntico | MV-D3; §2.4 FE-S2: «Si el correo es válido, te enviamos un código» y «Código incorrecto o vencido, pide otro» | pasos del código; prueba de igualdad en jsdom y en Chrome real contra el backend real |
| Teclado numérico, `one-time-code`, pegado, cuenta atrás de reenvío, «cambiar correo» | §2.4 FE-S2 | paso 1 |
| Borrador solo en memoria, nunca en `localStorage` | §2.4 FE-S1, R6 | `registration-draft.ts` (la contraseña ni siquiera está ahí) |
| Foco y anuncio al cambiar de paso, movimiento reducido | §2.4 FE-S1; `rsvp-motion-design` | `StepTransition` (ya respeta movimiento reducido) + `FocusGroup` |
| Esquemas por paso, sin `passwordConfirmation` | §2.4 FE-S3/S4 | `packages/auth/src/identity/schemas.ts` |
| `registrationProof` en el alta; `emailTaken` ya no sale del camino del código | §2.4 FE-S4 | `client.ts`, 422 sobre `registrationProof` devuelve al paso 1 |
| Login con correo precargado SIN el correo en la URL | MV-D3; Q4(a), tercera opción («la app lo rellena desde lo que la persona escribió en el paso 1, mismo dispositivo»); PF-1 | `rememberLoginEmail` / `readLoginEmail`; `/login` queda exactamente `/login` |
| Texto neutro de la pantalla del código | Q4(b) | `auth.signup.code.intro` |
| Una figurita por paso, set DOne, nunca amarillo, sin caras: sobre con código, gafete, pin de ciudad, llave | MV-D4; §3 | `emailCode`, `nameBadge`, `cityPin`, `accessKey` en `packages/ui/src/illustrations.ts`, grupo `guest` (pastel azul; no cambia ningún token) |
| Tuteo en es-BO y en-US | instrucción del dueño; Q7 | `packages/i18n` |
| Términos obligatorios en el paso 4 | Hoy son obligatorios y PF-10 los exige; el dueño lo pidió así. **Anotado:** Q3 (casilla frente a texto al pulsar «Crear cuenta») sigue siendo de Pablo | paso 4 |

## Sin recomendación escrita: se mantuvo el comportamiento actual (NO decidido aquí)

1. **PLANNER.** MV-D2 dice «anfitrión o proveedor» pero Q1 sigue abierta: el paso 2 mantiene las tres opciones (anfitrión, proveedor, ayudo a organizar). La empresa del PLANNER se pide en el paso 2, justo bajo la elección (como hoy) y se crea con la cuenta.
2. **«Organización» del proveedor (Q2).** No se agregó ningún campo: el proveedor no pide ni crea organización ni solicitud de partner (A24, DP-2). MV-D2 la menciona en el paso 3; la pregunta (a, b o c) sigue abierta.
3. **Teléfono y ciudad obligatorios, prefijo +591 y «otra ciudad» (Q16):** se conserva lo de hoy (obligatorios en la app, +591 precargado, ciudad libre).
4. **Mensaje al dueño del buzón si la cuenta apareció entre el paso 1 y el 4 (Q4c):** se muestra el texto existente `auth.failure.emailTaken` (que no afirma que exista una cuenta) y el enlace «Entrar». Pendiente de Pablo.
5. **Enlace del correo «ya tienes cuenta» (Q4a, d):** abre `/login` en una carga nueva y ahí el correo NO se puede precargar (no hay dato ni se pone en la URL). Solo se precarga cuando la persona toca «Entrar» desde el registro en la misma sesión de la app. Si Pablo quiere precarga desde el correo, hay que elegir token opaco o aceptar el correo en la URL.
6. **Color exacto por paso (Q5):** solo se dijo «nunca amarillo» y «azul/verde»; las cuatro nuevas usan azul. Sin distinción entre claro y oscuro (los pastel ya cambian por tema).
7. **Figurita en «Crea tu invitación» y «los demás formularios» (Q11):** no se tocó. La cara de `emptySearch` (Q12) tampoco.
8. **Alcance web/móvil (Q14):** los 4 pasos valen para ambos anchos (la base de código es la misma); no hay recomendación de dejar el formulario largo en web.
9. **Medidor de fortaleza de contraseña (Q15):** no se agregó; solo el texto de requisitos actual.
10. **Cuentas sin verificar anteriores (Q17), fecha de corte del registro sin prueba (Q18):** backend/producto; el frontend nuevo siempre envía la prueba.
11. **Nombres técnicos de las láminas (Q13):** en inglés, como el resto de `IllustrationName`. Quién aprueba el dibujo: pendiente (se adjuntan capturas).
12. **Cuenta atrás de reenvío de 60 s:** es el mínimo del backend; se muestra a todos igual, pase lo que pase con el envío.

## Dependencias y límites

- Backend: RSVPBackend #177 (fusionado, Identity 2.3.0) y #181 (Identity 2.3.1, solo agrega 429 con `Retry-After`). Con el registro sin prueba aún permitido en backend (`IDENTITY_REGISTER_REQUIRES_EMAIL_PROOF=false`), el oráculo 409 sigue existiendo para clientes viejos hasta BE-S4.
- Rama: incluye FE #177 (`fix/movil-sin-backend`, `FormActions` y figura móvil en `AuthLayout`) por merge, sin rebase.
