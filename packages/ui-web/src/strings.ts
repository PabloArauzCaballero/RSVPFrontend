/** Default copy (es-BO). Apps pass their i18n catalog through <UiProvider strings>; nothing here is domain data. */
export interface UiStrings {
  action: string; loading: string; empty: string; genericError: string; close: string; emptyTable: string; chooseFile: string; dismiss: string;
}
export const defaultStrings: UiStrings = {
  action: 'Acción', loading: 'Cargando…', empty: 'No hay información disponible.', genericError: 'No se pudo completar la acción.',
  close: 'Cerrar', emptyTable: 'No hay registros.', chooseFile: 'Seleccionar archivo', dismiss: 'Descartar aviso'
};
