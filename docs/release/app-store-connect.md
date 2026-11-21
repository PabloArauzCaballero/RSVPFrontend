# Ficha de App Store Connect · DOne (iOS, TestFlight)

Todo lo que se pega al crear la app. Los límites son los de Apple. Los puntos marcados **PENDIENTE** los decide o los aporta el dueño.

## 1. Datos para crear la app

| Campo | Valor |
|---|---|
| Plataformas | iOS |
| Nombre (máx. 30) | `DOne` |
| Idioma principal | Español (México) o Español (España); Apple no ofrece «es-BO». Usar **Español (México)**. |
| Bundle ID | `com.arauzsoftware.done` (decidido por Pablo el 2026-11-21; no se puede cambiar después de subir el primer build). Registrarlo en Certificates, Identifiers & Profiles como *Explicit App ID* y activar *Push Notifications* y *Associated Domains*. |
| SKU | `done-ios-001` |
| Acceso de usuario | Acceso completo |

Al terminar, enviar a Claude: **Bundle ID** y **Apple ID de la app** (el número que aparece en App Store Connect › Información de la app › Apple ID). Con eso se enlaza EAS y se compila.

## 2. Textos de la tienda (es)

- **Subtítulo (máx. 30):** `Invitas hoy, sabes quién viene`
- **Texto promocional (máx. 170):** `Crea la invitación de tu celebración, compártela por WhatsApp y mira quién confirma, quién no y qué regalos reservan. Todo desde el teléfono.`
- **Palabras clave (máx. 100):** `invitaciones,rsvp,boda,cumpleaños,evento,fiesta,invitados,confirmar asistencia,regalos,lista`
- **Descripción (máx. 4000):**

```
DOne organiza tu celebración como una buena invitación impresa: clara, tranquila y con el nombre de tu evento al centro.

Invitas hoy. Mañana sabes quién viene.

QUIÉN VIENE
Agrega a tus invitados, mira quién confirmó, quién no puede ir y quién todavía no responde. Cada invitado recibe su enlace personal y responde con un toque, sin crear cuenta.

TU INVITACIÓN
Elige un estilo, completa los datos de tu evento y mira cómo se ve en el teléfono, la tableta y la computadora antes de publicar. Comparte el enlace por WhatsApp con una vista previa lista.

REGALOS
Arma tu lista de regalos. Tus invitados los reservan con un toque y tú decides qué aprobar.

AVISOS
Te avisamos cuando alguien confirma, pide acompañantes o reserva un regalo.

Claro y oscuro, en español e inglés.
```

- **URL de asistencia:** **PENDIENTE** (una página real; ver §6).
- **URL de marketing (opcional):** el sitio público de DOne.
- **Copyright:** `2026 DOne`

## 3. Clasificación y categoría

- Categoría principal: **Estilo de vida**. Secundaria: **Productividad**.
- Clasificación por edades: responder «Ninguno» a todo; resultado **4+**.
- Precio: **Gratis**. Disponibilidad: Bolivia y los países que quieras.

## 4. Privacidad (App Privacy)

- **URL de la política de privacidad: PENDIENTE y obligatoria.** El sitio público (`apps/seo-web`) no tiene hoy una página de privacidad ni de términos; hay que crearla y publicarla antes de enviar a revisión (TestFlight interno no la exige).
- ¿Rastrea a los usuarios (ATT)? **No.** No se usan SDK de publicidad ni de análisis de terceros.
- Datos recopilados, vinculados a la persona y **no** usados para rastreo:
  - Información de contacto: nombre, correo, teléfono (anfitrión e invitados). Finalidad: funcionalidad de la app.
  - Contenido del usuario: fotos de la galería, mensajes de invitados, lista de regalos. Finalidad: funcionalidad de la app.
  - Identificadores: token de notificaciones push. Finalidad: funcionalidad de la app.
- Cifrado: la app solo usa HTTPS estándar; `ITSAppUsesNonExemptEncryption = false` ya está en la configuración, así que no habrá pregunta de cumplimiento de exportación en cada build.

## 5. Notas para el revisor de Apple

```
DOne es una app para organizar celebraciones: el anfitrión crea la invitación y gestiona invitados y regalos. Los invitados responden desde un enlace personal sin cuenta.

Para probar como anfitrión inicie sesión con la cuenta de demostración:
  Correo: PENDIENTE
  Contraseña: PENDIENTE

El entorno es de pruebas: las notificaciones por correo y SMS no se envían.
La app usa la cámara/fotos solo para subir imágenes a la galería de la invitación.
```

**PENDIENTE:** crear una cuenta de anfitrión de demostración en el backend de TEST con una celebración de ejemplo, y poner aquí sus credenciales. Sin ella, la revisión se rechaza.

## 6. Pendientes que bloquean la revisión pública (no TestFlight)

1. Página de privacidad y de asistencia publicadas.
2. Cuenta de demostración para el revisor.
3. Dominio propio para la API: hoy es `https://rsvp-api.161.97.85.216.sslip.io` (TEST). Para producción hace falta un registro DNS A creado por el dueño.
4. Dominio de enlaces universales (`EXPO_PUBLIC_LINK_DOMAIN`) y `apple-app-site-association` verificado.

## 7. Capturas (6,9": 1320 × 2868)

Cinco, en este orden, con datos de ejemplo («Ana y Luis»): Inicio, Quién viene, Regalos, Elige el estilo, Vista previa. Generadas desde la app web a 440 × 956 px con escala 3; **no son capturas de un iPhone real**, y se reemplazan por capturas del simulador cuando haya build.

## 8. Qué corre después

1. El dueño crea la app y registra el Bundle ID.
2. Claude: `eas init`, `EXPO_IOS_BUNDLE_IDENTIFIER` en EAS, build `production` (los builds apuntan al gateway https de TEST).
3. El dueño sube el `.ipa` con `altool` (la llave de App Store Connect no se la damos a Claude).
4. Apple procesa el build (minutos a ~1 h) y aparece en TestFlight.
