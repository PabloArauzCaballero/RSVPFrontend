# Plantillas F5 · editor de invitaciones

Rama apilada sobre `feat/f1-diseno-v2-esquema` (FE #115). Plan: `PLAN-PLANTILLAS.md` en `bugs/catalogo` (P1, P5, P6, P9, P15, P19, P21, P22).

## PR a · carcasa, modelo, historial y autoguardado (2026-11-24)

- **Paquete nuevo `@rsvp/design-editor`:** modelo de estado sobre `DesignDocumentV2` (operaciones puras, historial de 100 pasos con fusión de ediciones seguidas), guardas espejo del botón de regalos (P22), autoguardador con `If-Match` y carcasa web (`EditorShell`).
- **`@rsvp/query-hooks` `design/`:** `designApi` (endpoints de BE #135) y `useCelebrationDesign`/`useCreateDesign`.
- **App:** ruta web `/diseno?c=` (`DesignEditorScreen`); en iOS y Android un aviso (el editor es web-first, P10).
- **Nivel de verificación:** `TESTED` contra un cliente simulado y un arnés en memoria. **No** `VERIFIED`: no se corrió contra el backend real (#135 sin fusionar, sin Docker aquí) ni en Mac/iOS/Android.
- **Evidencia visual:** `docs/progress/evidence/plantillas-f5/a-*.png` (Chromium de Linux; las líneas base macOS no se tocan).

### Pendiente / abierto
- Contrato 1.3.0 de Template/Media aún no vendorizado: `designApi` está tipada a mano; falta prueba de conformidad cuando #135 se fusione.
- Los dibujos del lienzo en PR a son un esquema de cajas (wireframe); el renderizador real llega con F6.
