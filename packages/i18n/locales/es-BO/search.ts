/** Búsqueda de proveedores por cercanía (F24 REQ-04). */
export const searchEsBO = {
  radius: "Radio cerca de mí",
  radiusOption: "{{km}} km",
  nearMe: {
    use: "Usar mi ubicación",
    locating: "Buscando tu ubicación…",
    denied: "No pudimos obtener tu ubicación. Elige una ciudad para continuar.",
    active: "Mostrando proveedores a menos de {{km}} km de ti.",
    clear: "Quitar ubicación"
  }
} as const;
