/** Editor de invitaciones (plantillas F5): lienzo, modos, historial, guardado y publicación. */
export const designEditorEsBO = {
  title: "Diseño de la invitación",
  create: { title: "Crear el diseño", body: "Todavía no tienes un diseño propio. Lo creamos a partir de la plantilla de tu celebración y desde ahí lo personalizas.", action: "Crear el diseño desde mi plantilla", failed: "No pudimos crear el diseño. Inténtalo de nuevo; no se perdió nada." },
  noCelebration: "Elige una celebración para diseñar su invitación.",
  loading: "Abriendo tu diseño…",
  loadFailed: "No pudimos abrir el diseño. Revisa tu conexión y vuelve a intentarlo.",
  forbidden: "Puedes ver este diseño, pero solo los anfitriones o el planner pueden cambiarlo.",
  notFound: "Esta celebración todavía no tiene un diseño que editar.",
  nativeOnly: "El editor de diseño se usa desde el navegador. Abre DOne en tu computadora o en el navegador del teléfono para diseñar tu invitación.",
  mode: { label: "Nivel del editor", basic: "Básico", advanced: "Avanzado" },
  canvas: { label: "Lienzo", mobile: "Móvil", desktop: "Escritorio" },
  history: { undo: "Deshacer", redo: "Rehacer" },
  save: {
    saved: "Borrador guardado.",
    dirty: "Cambios sin guardar…",
    saving: "Guardando el borrador…",
    retrying: "No pudimos guardar. Reintentamos en {{seconds}} s; tus cambios siguen aquí.",
    stopped: "El guardado se detuvo."
  },
  outline: {
    title: "Páginas",
    cover: "Portada",
    elements_one: "{{count}} elemento",
    elements_other: "{{count}} elementos",
    hidden: "oculto",
    summary: "Páginas ({{count}})"
  },
  basic: {
    title: "Colores",
    accentLight: "Color de acento (claro)",
    accentDark: "Color de acento (oscuro)",
    hint: "Los cambios se guardan solos y puedes deshacerlos."
  },
  stage: {
    label: "Vista previa del diseño",
    caption: { mobile: "Vista móvil · 390 px", desktop: "Vista escritorio · 1024 px" },
    emptyPage: "Esta página no tiene elementos en este lienzo.",
    empty: "Este diseño todavía no tiene páginas.",
    required: "Obligatorio",
    hidden: "Oculto"
  },
  scheme: { light: "tema claro", dark: "tema oscuro" },
  role: { canvas: "fondo", surface: "superficie", text: "texto", muted: "texto suave", accent: "acento", accentFill: "relleno del acento", onAccent: "texto sobre el acento", line: "línea" },
  warnings: {
    title: "Colores que se leen con dificultad",
    hint: "Es un aviso: puedes publicar igual, pero a algunos invitados les costará leer.",
    item: "En el {{scheme}}, {{foreground}} sobre {{background}} tiene contraste {{ratio}}:1 y el mínimo es {{minimum}}:1.",
    use: "Usar {{colour}}",
    useLabel: "Cambiar {{foreground}} del {{scheme}} a {{colour}}"
  },
  section: { story: "Nuestra historia", schedule: "Itinerario", venues: "Lugares", gallery: "Galería", dressCode: "Código de vestimenta", faq: "Preguntas frecuentes", recommendations: "Recomendaciones", gifts: "Regalos", rsvp: "Confirma tu asistencia" },
  block: {
    cover: "Portada", giftsCta: "Botón de regalos", rsvpCta: "Botón de confirmación", heading: "Título", text: "Texto", story: "Historia", image: "Imagen", imageText: "Imagen con texto",
    gallery: "Galería", schedule: "Itinerario", venues: "Lugares", countdown: "Cuenta regresiva", dressCode: "Código de vestimenta", faq: "Preguntas frecuentes", recommendations: "Recomendaciones",
    illustration: "Ilustración", monogram: "Monograma", ornament: "Adorno", spacer: "Espacio", button: "Botón", quote: "Cita", weddingParty: "Cortejo", video: "Video", music: "Música", map: "Mapa", html: "Código propio"
  },
  notice: {
    conflict: {
      title: "Alguien guardó otra versión mientras editabas",
      body: "Para seguir hay que cargar la versión nueva. Los cambios que hiciste desde el último guardado se descartan; los que ya estaban guardados se conservan.",
      load: "Cargar la versión nueva",
      confirmTitle: "¿Descartar tus cambios sin guardar?",
      confirmBody: "Se carga la versión más reciente del diseño y lo que cambiaste desde el último guardado se pierde. No se puede deshacer.",
      confirm: "Sí, descartar y cargar",
      cancel: "No, seguir mirando",
      loading: "Cargando la versión nueva…",
      failed: "No pudimos cargar la versión nueva. Revisa tu conexión y vuelve a intentarlo; tu pantalla no cambió."
    },
    rejected: {
      title: "El servidor no aceptó este cambio",
      body: "Tu último borrador guardado sigue intacto. Haz otro cambio o deshaz el último y volveremos a guardar solos; también puedes reintentar ahora.",
      retry: "Reintentar ahora",
      code: "Código para soporte: {{code}}"
    },
    code: {
      DESIGN_TOO_LARGE: "El diseño es demasiado grande para guardarlo. Quita imágenes o elementos que no necesites.",
      DESIGN_SCHEMA_INVALID: "El diseño tiene un valor que no se puede guardar. Deshaz el último cambio.",
      DESIGN_REFERENCE_INVALID: "Hay un elemento que apunta a algo que ya no existe o queda fuera del lienzo. Deshaz el último cambio.",
      FONT_WEIGHT_UNAVAILABLE: "La tipografía elegida no tiene ese grosor. Elige otro grosor u otra tipografía.",
      CUSTOM_CODE_UNAVAILABLE: "El código propio todavía no está disponible. Quita ese cambio."
    },
    signIn: { title: "Tu sesión terminó", body: "No pudimos guardar porque hay que volver a entrar. Tu borrador anterior sigue guardado. Entra en la pestaña nueva, ciérrala al terminar y vuelve aquí: los cambios que ves en esta pestaña se conservan.", action: "Iniciar sesión en otra pestaña", retry: "Ya entré, reintentar" },
    forbidden: { title: "No puedes cambiar este diseño", body: "Solo los anfitriones o el planner de la celebración pueden guardar cambios. Lo que ves aquí no se guardará." }
  },
  refusal: {
    title: "Ese cambio no se puede hacer",
    dismiss: "Entendido",
    GIFTS_BLOCK_REQUIRED: "El botón de regalos es obligatorio: no se puede quitar de la invitación.",
    GIFTS_BLOCK_LOCKED: "El botón de regalos siempre lleva a la lista de regalos: no se puede girar ni cambiarle el destino.",
    GIFTS_BLOCK_HIDDEN: "El botón de regalos siempre se ve: no se puede ocultar ni hacer transparente.",
    GIFTS_BLOCK_OUT_OF_CANVAS: "El botón de regalos tiene que quedar dentro del lienzo.",
    GIFTS_BLOCK_TOO_SMALL: "El botón de regalos mide al menos 44 px para que se pueda tocar sin errores.",
    GIFTS_BLOCK_COVERED: "Otro elemento quedaría encima del botón de regalos: el botón siempre tiene que poder tocarse.",
    GIFTS_BLOCK_LOW_CONTRAST: "Con ese color el botón de regalos no se leería bien: su texto necesita contraste 4,5:1 y su contorno 3:1, en el tema claro y en el oscuro."
  }
} as const;
