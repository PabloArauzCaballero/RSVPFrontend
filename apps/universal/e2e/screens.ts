import { MOCK_CELEBRATION_ID, MOCK_SLUG, MOCK_VALID_TOKEN } from "@rsvp/testing/contract-mock";

/** Every screen the visual gate walks. Add a route here when you add a screen: a screen not listed is a screen nobody looks at. */
const C = `?c=${MOCK_CELEBRATION_ID}`;
export interface VisualScreen { readonly name: string; readonly path: string }

export const AUTHED_SCREENS: readonly VisualScreen[] = [
  { name: "host-celebraciones", path: "/celebraciones" },
  { name: "host-resumen", path: `/inicio${C}` },
  { name: "host-invitados", path: `/invitados${C}` },
  { name: "host-invitado-nuevo", path: `/invitados/nuevo${C}` },
  { name: "host-invitados-importar", path: `/invitados/importar${C}` },
  { name: "host-invitados-grupos", path: `/invitados/grupos${C}` },
  { name: "host-reporte-rsvp", path: `/rsvp/reporte${C}` },
  { name: "host-acompanantes", path: `/bandeja/acompanantes${C}` },
  { name: "host-avisos", path: `/notificaciones${C}` },
  { name: "host-preferencias", path: `/preferencias${C}` },
  { name: "host-regalos", path: `/regalos${C}` },
  { name: "host-regalos-bandeja", path: `/bandeja/regalos${C}` },
  { name: "host-regalos-catalogo", path: `/regalos/catalogo${C}` },
  { name: "host-regalos-externo", path: `/regalos/externo${C}` },
  { name: "host-regalos-proveedores", path: `/regalos/proveedores${C}` },
  { name: "host-editor-general", path: `/editor/general${C}` },
  { name: "host-editor-galeria", path: `/editor/galeria${C}` },
  { name: "host-editor-traducciones", path: `/editor/traducciones${C}` },
  { name: "host-templates", path: `/templates${C}` },
  { name: "host-vista-previa", path: `/preview${C}` },
  { name: "host-publicar", path: `/publicar${C}` },
  { name: "host-configuracion", path: `/configuracion${C}` },
  { name: "host-modos", path: `/modos${C}` },
  { name: "host-onboarding", path: "/onboarding/1" },
  { name: "admin-resumen", path: "/admin" },
  { name: "admin-templates", path: "/admin/templates" },
  { name: "admin-tipos-evento", path: "/admin/tipos-evento" },
  { name: "admin-categorias", path: "/admin/categorias" },
  { name: "admin-geografia", path: "/admin/geografia" },
  { name: "admin-verificacion", path: "/admin/verificacion" },
  { name: "admin-moderacion", path: "/admin/moderacion" },
  { name: "admin-usuarios", path: "/admin/usuarios" },
  { name: "admin-organizaciones", path: "/admin/organizaciones" },
  { name: "admin-metricas", path: "/admin/metricas" },
  { name: "admin-operacion", path: "/admin/operacion" },
  { name: "portal-inicio", path: "/portal" },
  { name: "portal-alta", path: "/portal/alta" },
  { name: "portal-servicios", path: "/portal/servicios" },
  { name: "portal-productos", path: "/portal/productos" },
  { name: "portal-entrega", path: "/portal/entrega" },
  { name: "portal-destinos", path: "/portal/destinos" },
  { name: "portal-agenda", path: "/portal/agenda" },
  { name: "portal-leads", path: "/portal/leads" },
  { name: "portal-metricas", path: "/portal/metricas" },
  { name: "portal-perfil", path: "/portal/perfil" },
  { name: "portal-documentos", path: "/portal/documentos" },
  { name: "guest-rsvp", path: `/c/${MOCK_SLUG}/rsvp/${MOCK_VALID_TOKEN}` },
  { name: "guest-regalos", path: `/c/${MOCK_SLUG}/regalos/${MOCK_VALID_TOKEN}` }
];

export const ANON_SCREENS: readonly VisualScreen[] = [
  { name: "auth-login", path: "/login" },
  { name: "auth-registro", path: "/registro" },
  { name: "auth-recuperar", path: "/recuperar" },
  { name: "guest-rsvp-publico", path: `/c/${MOCK_SLUG}/rsvp` },
  { name: "guest-rsvp-invalido", path: `/c/${MOCK_SLUG}/rsvp/${"x".repeat(43)}` }
];

export const WIDTHS = [390, 768, 1440] as const;
