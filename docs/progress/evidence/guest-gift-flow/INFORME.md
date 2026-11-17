# Enlace personal → asistencia → regalos

Fecha: 2026-11-17. Base: `chore/deploy-contabo-coolify`, commit `669547884aabaf6cf625ce91a0fccb44676312e9`. Rama candidata: `fix/guest-rsvp-gifts-coolify` en ambos repositorios. No se modificó el despliegue.

## Resultado implementado

Después de confirmar asistencia, el invitado encuentra «Ver regalos». El clic conserva la misma credencial en un fragmento URL; Gift la lee con el mecanismo existente y envía Bearer al backend. No requiere cuenta. El botón de vuelta permite regresar a la respuesta. Se conservan es-BO/en-US también en lista y detalle.

La pantalla de asistencia muestra el nombre registrado por el celebrador si el backend entrega el nuevo campo opcional `GuestTokenResource.name` de Guest1.11. El recurso sigue limitado al token válido de ese invitado y celebración. El frontend anterior y el servidor anterior siguen siendo utilizables; sin el nuevo campo simplemente no aparece el nombre.

Las tarjetas consultan la foto del producto mediante `/listings/{listingId}`, endpoint público de Provider2.4 ya desplegado. La consulta no recibe el Bearer del invitado y se cachea cinco minutos por listing. Solo se renderiza HTTPS sin credenciales embebidas, con alt traducido, carga diferida y `no-referrer`. Si no hay foto, falla su carga o falla el catálogo, se mantiene el regalo reservable. No se añaden fotos inventadas a regalos externos.

## Verificación ejecutada

| Comando / prueba | Resultado observado |
|---|---|
| `corepack yarn workspace @rsvp/seo-web test` | 137 pruebas, 18 archivos, PASS |
| `corepack yarn workspace @rsvp/query-hooks test` | 83 pruebas, seis archivos, PASS |
| `corepack yarn workspace @rsvp/contracts test` | Cuatro pruebas, PASS |
| `corepack yarn lint:code` | Salida 0 |
| `corepack yarn workspace @rsvp/seo-web typecheck` | Salida 0; build también verifica tipos |
| `corepack yarn workspace @rsvp/query-hooks typecheck` | Salida 0 |
| `NEXT_TELEMETRY_DISABLED=1 corepack yarn workspace @rsvp/seo-web build` | Build Next de producción, salida 0 |
| `corepack yarn workspace @rsvp/contracts check:generated` | Ocho contratos verificados contra snapshot vendorizado |
| Guest y lector de Gift | 54 pruebas PASS; TypeScript y lint del área PASS |
| Backend OpenAPI / AsyncAPI | Ocho contratos y 69 eventos validados |
| Chrome headless + PostgreSQL + HTTP de Guest y Nest de Gift | 12 combinaciones PASS; ver `browser-results.json` |

Se mantuvieron las aserciones existentes de privacidad del token. Las nuevas pruebas cubren nombre en formulario, aparición del botón tras confirmar, ausencia tras rechazar, continuidad después del cierre del plazo, transferencia por fragmento, almacenamiento bloqueado en la primera apertura, foto sin autenticación, imagen rota, respuesta 503 del catálogo y URL de imagen insegura. La consulta de idioma cubre selección explícita y Accept-Language.

La matriz de Chrome ejercitó 360/768/1280 px, claro/oscuro y es-BO/en-US, con movimiento reducido. Sin desbordes horizontales ni violaciones axe críticas/serias. Se inspeccionaron capturas de respuesta móvil, regalos móvil y regalos escritorio oscuro en inglés. La imagen es un fixture PNG mínimo: acredita carga y composición del elemento, no calidad fotográfica de un producto real. No se añadieron animaciones.

El primer recorrido confirmó asistencia con el formulario, abrió regalos y reservó PENDING_REVIEW usando el token original. Otro invitado válido recibió 409 GIFT_NOT_AVAILABLE. La prueba adicional bloqueó una fila de regalo, observó **dos UPDATE simultáneamente esperando el mismo bloqueo SQL**, soltó el bloqueo y verificó exactamente un 201, un 409 y una única reserva persistida. La identidad se validó contra el HTTP real de Guest y sus registros de PostgreSQL; los dos tokens nunca se registraron en el informe.

## Límites y pendientes

- Publicación de celebración, respuestas públicas de catálogo y bytes de foto fueron fixtures. El proxy de QA fue Node, no Kong. No hubo RabbitMQ, despliegue Coolify, iOS ni Android. Esta evidencia no cierra los gates del stack completo ni autoriza merge.
- En la suite existente de concurrencia con 20 peticiones, las cuatro comprobaciones funcionales pasaron, pero el proceso terminó con actividad asíncrona al eliminar la base de pruebas. Se conserva ese resultado como ejecución con fallo de cierre, no PASS global. La nueva prueba de dos invitaciones reales sí terminó con salida 0.
- El HTML completo de Next ya incorpora la ruta personal en su bootstrap del router y los enlaces globales de idioma. El panel de asistencia modificado no introduce el token en DOM o almacenamiento y conserva no-store/no-referrer. No afirmar que todo el HTML está libre de token; revisar esa superficie al preparar la unificación posterior de enlaces.
- CodeGraph fue bloqueado por revisión automática al contactar telemetría externa. Se usó lectura local de archivos actuales y no se eludió ese bloqueo.
- **Cancelar asistencia no libera reservas en el backend revisado.** El cambio CONFIRMED → DECLINED emite guest.rsvp.changed.v1, pero Gift no lo consume para liberar. No se cambió este comportamiento ni se presenta como resuelto.

La instrucción para completar validación y liberación está en la rama backend, `docs/progress/evidence/guest-gift-flow/CODEX_VALIDACION_Y_LIBERACION.md`. Mantener separada esa entrega con sus eventos, migración, worker y pruebas reales. No usar borrado de datos personales como cancelación de asistencia.

## Orden y reversión

Publicar primero el backend coordinado Guest + lector compatible Gift y verificar el nombre protegido. Luego publicar el frontend y realizar un smoke test desde un enlace personal. No hay migración de datos en estos cambios. Para revertir, revertir los commits de cada rama por PR; el lector acepta formatos con/sin nombre y el frontend tolera su ausencia. La futura liberación al cancelar requiere su propio plan de migración y rollback.
