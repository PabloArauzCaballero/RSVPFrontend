# Corrección F15/F16 · 2026-11-08

Alcance: tres defectos reproducidos en review-F15-F16-2026-11-08. Sin cambios backend, contratos ni otros carriles; no commit/push.

| Corte | REQ | Entrada y resultado | Negativo | Prueba |
|---|---|---|---|---|
| Envío RSVP | F15-01, F15-05, F15-06 | Enviar respuesta o alta pública: campos bloqueados hasta resolución; un solo envío activo | Error libera campos y conserva borrador | rsvp-submission.test.tsx; suite RSVP; Chrome |
| Alta anfitrión | F16-02 | Guardar invitado y editar siguiente borrador: respuesta anterior no borra cambios posteriores | Fallo conserva borrador y permite reintento | guest-state.test.tsx; suite invitados; Chrome |
| Identidad ficha | F16-05, F16-06 | Cambiar invitado en componente reutilizado: enlace anterior desaparece y no se puede copiar | Respuesta tardía de A no aparece en B | guest-state.test.tsx; recorrido router Chrome |

Causa: callbacks asíncronos que asumen que el formulario/identidad sigue siendo el original. F15 fija el contenido durante el envío; F16 limpia solo la misma revisión enviada y remonta detalle por identidad. Mantenimiento: Miguel. Reversión: archivos originales en before/, sin migración ni orden de despliegue. Complejidad constante por envío; no se recalculan ni recorren listas.

UI: Impeccable Operate/harden y UI/UX Pro Max: conservación de datos, estados pendientes/error, controles semánticos. Se preservan estilos e i18n. Animación nueva: no aporta orientación a estas correcciones; ninguna añadida. Evidencia de mock no acredita backend, CI ni dispositivos.
