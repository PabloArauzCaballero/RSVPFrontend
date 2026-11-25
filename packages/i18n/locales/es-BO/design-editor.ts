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
    conflict: "Alguien guardó otra versión del diseño mientras editabas. Tus cambios siguen aquí: carga la versión nueva y vuelve a aplicar lo que necesites.",
    conflictAction: "Cargar la versión nueva",
    rejected: "El servidor no aceptó este borrador ({{code}}). Revisa los avisos y vuelve a intentarlo.",
    forbidden: "No tienes permiso para cambiar este diseño."
  },
  outline: {
    title: "Páginas",
    cover: "Portada",
    elements_one: "{{count}} elemento",
    elements_other: "{{count}} elementos",
    hidden: "oculto"
  },
  basic: {
    title: "Colores",
    accentLight: "Color de acento (claro)",
    accentDark: "Color de acento (oscuro)",
    hint: "Los cambios se guardan solos y puedes deshacerlos."
  },
  customCode: {
    title: "Código propio",
    html: "HTML",
    css: "CSS",
    htmlHelp: "Etiquetas de texto, listas, tablas, enlaces https y tus fotos. Sin scripts, formularios ni marcos.",
    cssHelp: "Solo se aplica dentro de tu invitación y no puede tocar el botón de regalos ni el de confirmar. El texto mínimo es de 13 px.",
    clean: "Todo el código es válido.",
    issues_one: "Se ajustó o quitó 1 cosa de tu código.",
    issues_other: "Se ajustaron o quitaron {{count}} cosas de tu código.",
    issue: {
      TOO_LONG: "Es más largo de lo permitido (20 000 caracteres).",
      TAG_REMOVED: "Quitamos la etiqueta «{{detail}}» y lo que contiene: no está permitida.",
      TAG_UNWRAPPED: "La etiqueta «{{detail}}» no existe en las invitaciones; dejamos solo su texto.",
      ATTRIBUTE_REMOVED: "Quitamos «{{detail}}»: ese atributo no está permitido.",
      URL_REJECTED: "Quitamos un enlace o imagen no permitido ({{detail}}). Las imágenes tienen que venir de tus fotos subidas.",
      PROVIDER_LINK: "Quitamos el enlace directo a un proveedor ({{detail}}). Los enlaces a proveedores van por la página de recomendaciones.",
      TOO_DEEP: "Hay demasiados niveles anidados; recortamos los más profundos.",
      TOO_MANY_NODES: "Hay demasiados elementos; recortamos el final.",
      UNSTABLE: "Este HTML cambia cada vez que se lee, así que no lo podemos guardar. Simplifícalo.",
      SYNTAX: "El CSS tiene un error de sintaxis y no se pudo leer. Revisa las llaves y los punto y coma.",
      AT_RULE_REMOVED: "Quitamos «{{detail}}»: no está permitido en el CSS de una invitación.",
      SELECTOR_REJECTED: "Quitamos un selector no permitido ({{detail}}). Solo puedes dar estilo a elementos de tu contenido.",
      PROPERTY_REJECTED: "Quitamos la propiedad «{{detail}}»: no se permite.",
      VALUE_REJECTED: "Quitamos un valor no permitido ({{detail}}).",
      IMPORTANT_REMOVED: "Quitamos «!important» de «{{detail}}».",
      ESCAPE_REJECTED: "Quitamos una línea con caracteres de escape ({{detail}}): no se permiten.",
      TOO_MANY_RULES: "Hay demasiadas reglas; ignoramos las del final.",
      MEDIA_REJECTED: "Quitamos una consulta @media no permitida ({{detail}})."
    }
  },
  refusal: {
    title: "Ese cambio no se puede hacer",
    dismiss: "Entendido",
    GIFTS_BLOCK_REQUIRED: "El botón de regalos es obligatorio: no se puede quitar de la invitación.",
    GIFTS_BLOCK_LOCKED: "El botón de regalos siempre lleva a la lista de regalos: no se puede girar ni cambiarle el destino.",
    GIFTS_BLOCK_HIDDEN: "El botón de regalos siempre se ve: no se puede ocultar ni hacer transparente.",
    GIFTS_BLOCK_OUT_OF_CANVAS: "El botón de regalos tiene que quedar dentro del lienzo.",
    GIFTS_BLOCK_TOO_SMALL: "El botón de regalos mide al menos 44 px para que se pueda tocar sin errores."
  }
} as const;
