/** Editor de invitaciones (plantillas F5): lienzo, modos, historial, guardado y publicación. */
export const designEditorEsBO = {
  title: "Diseño de la invitación",
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
    elements: "{{count}} elementos",
    hidden: "oculto"
  },
  basic: {
    title: "Colores",
    accentLight: "Color de acento (claro)",
    accentDark: "Color de acento (oscuro)",
    hint: "Los cambios se guardan solos y puedes deshacerlos."
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
