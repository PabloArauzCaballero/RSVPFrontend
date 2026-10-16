# Carril F26 · Cotización y agenda en el microsite

| | |
|---|---|
| **Responsable** | [Fabio](../equipo/fabio.md) |
| **Semana** | [11](../calendario/semana-11.md) · 28 de diciembre al 1 de enero de 2027 |
| **Componente** | `apps/seo-web/app/p/[slug]` |
| **Predecesores** | F25 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Convertir una visita en un lead cualificado. El visitante arma una selección, dice cuándo es su evento y cuánta gente va, y el partner recibe una solicitud con contexto, no un clic suelto.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F26-01` | Pantalla B8: carrito de intención | Selección de items, fecha, invitados y presupuesto |
| `REQ-F26-02` | Pantalla B9: solicitud enviada | Con copia por correo y confirmación clara |
| `REQ-F26-03` | Pantalla B10: calendario de disponibilidad | Días libres en la timezone del partner |
| `REQ-F26-04` | Pantalla B11: solicitar una fecha | Con 409 claro si se tomó el último cupo |
| `REQ-F26-05` | Una fecha bloqueada se distingue de una sin cupo | 422 y 409 tienen mensajes distintos |
| `REQ-F26-06` | La cotización genera un lead de tipo formulario | Más valioso que un clic, y así se registra |

---

## Qué se construye

- `apps/seo-web/app/p/[slug]/cotizar/page.tsx`
- `apps/seo-web/app/p/[slug]/agenda/page.tsx`
- `apps/seo-web/components/provider/quote-cart.tsx`
- `packages/forms/src/schemas/quote.ts`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Seleccionar fecha disponible y enviar cotización o reserva con confirmación y conflicto visibles.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F26-01, REQ-F26-02, REQ-F26-03, REQ-F26-04, REQ-F26-05, REQ-F26-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 35 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** Impeccable + UI/UX Pro Max + estados + visual. **Animación:** evaluar propósito; si se implementa, motion design + reduced motion.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Carrito de intención con persistencia local.
2. Formulario de cotización con contexto del evento.
3. Calendario de disponibilidad en la zona del partner.
4. Solicitud de fecha con los dos estados de error.

---

## Plan de pruebas

- Test del carrito: añadir, quitar y persistir al recargar.
- Test de 409 en el último cupo y de 422 en fecha bloqueada, con mensajes distintos.
- Test del calendario desde un dispositivo en otra zona horaria.
- Snapshots y axe en ambas pantallas.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Un visitante entiende si la fecha no está disponible o si simplemente se agotó.
- [ ] El carrito no se pierde al navegar dentro del microsite.

Y en todos los casos:

- [ ] Todos los `REQ` en `PASS`, o `BLOCKED-EXTERNAL` con evidencia concreta. `PARTIAL` no cierra.
- [ ] Tests de componente con estados de carga, error y vacío.
- [ ] MSW cubre todas las respuestas del contrato, incluidos 401, 403, 409 y 422.
- [ ] Cobertura ≥ 85 % en `packages/`, ≥ 75 % en pantallas.
- [ ] Cero cadenas fuera de i18n; `es-BO` y `en-US` completos.
- [ ] Fechas y horas en la timezone de la celebración, no la del dispositivo.
- [ ] Snapshots visuales aprobados en 360, 768 y 1280 px.
- [ ] axe sin violaciones críticas; navegable por teclado.
- [ ] La suite del carril corre 3 veces seguidas en CI sin un solo fallo.
- [ ] Evidencia en `docs/progress/evidence/lane-F26/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Mostrar la disponibilidad en la zona del visitante en vez de la del partner produce reservas para el día equivocado.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F26 completo
```
