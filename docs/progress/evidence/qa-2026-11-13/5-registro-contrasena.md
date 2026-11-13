# QA 2026-11-13 · #5 Contraseña vacía en el registro

Reporte: con los campos vacíos, Correo decía "Falta este dato." y Contraseña "Usa al menos 12 caracteres…"; además el borde rojo de error no abarcaba el botón "Mostrar".

Causa raíz: `registerSchema` validaba la contraseña solo con `min(12)`, así que el vacío caía en `passwordShort` (el login sí usaba `required`). El estilo de error se aplicaba al `TextInput` y no al botón que comparte el borde.

Solución: `min(1, "required")` antes de `min(12, "passwordShort")` (mismo mensaje que Correo y que el login) y el botón "Mostrar" recibe el mismo color de borde de error.

Evidencia (2026-11-13, Chrome real): 360/768/1280 × claro/oscuro, dos "Falta este dato." y borde del botón = borde del campo (oscuro `rgb(242,184,181)`, claro `rgb(159,47,45)`); axe sin críticos/serios. Unitarias nuevas en `identity-client.test.ts` y `auth.test.tsx` (la segunda falla si se quita el borde, comprobado).
