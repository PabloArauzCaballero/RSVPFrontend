# Carril F25 · Microsite del partner

| | |
|---|---|
| **Responsable** | [Fabio](../equipo/fabio.md) |
| **Semana** | [10](../calendario/semana-10.md) · 21 de diciembre al 25 de diciembre de 2026 |
| **Componente** | `apps/seo-web/app/p/[slug]` |
| **Predecesores** | F24 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

El mini-marketplace. Para el partner que no tiene web propia, este microsite es el destino al que redirigirlo: sin destino no hay lead, y sin lead no hay negocio.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F25-01` | Pantalla B5: portada del microsite | Hero, descripción, galería y zona de cobertura |
| `REQ-F25-02` | JSON-LD de tipo `LocalBusiness` | Con dirección, horarios y zona de servicio |
| `REQ-F25-03` | Pantalla B6: catálogo de servicios y productos | Con precio en la moneda del partner |
| `REQ-F25-04` | **Pantalla B7: detalle con `fulfillment` visible** | Quién se responsabiliza, cobertura, costo de traslado y plazos |
| `REQ-F25-05` | El deslinde de la plataforma aparece de forma prominente | Antes del botón de contacto, no en letra pequeña |
| `REQ-F25-06` | Pantalla B14: partner no verificado o suspendido | 404 controlado |

---

## Qué se construye

- `apps/seo-web/app/p/[slug]/page.tsx`
- `apps/seo-web/app/p/[slug]/catalogo/page.tsx`
- `apps/seo-web/app/p/[slug]/catalogo/[sku]/page.tsx`
- `apps/seo-web/components/provider/fulfillment-notice.tsx`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Abrir un microsite de partner indexable y llegar a cotización desde una ficha real.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F25-01, REQ-F25-02, REQ-F25-03, REQ-F25-04, REQ-F25-05, REQ-F25-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 30 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** Impeccable + UI/UX Pro Max + estados + visual. **Animación:** evaluar propósito; si se implementa, motion design + reduced motion.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Portada del microsite con tema del partner y JSON-LD.
2. Catálogo de servicios y productos.
3. Detalle con condiciones de entrega y deslinde.
4. Estados de partner no verificado y suspendido.

---

## Plan de pruebas

- Lighthouse SEO sobre 95 en la portada del microsite.
- Test de que el `fulfillment` se muestra antes del botón de contacto.
- Test de partner suspendido: 404 sin filtrar datos.
- Snapshots en tres breakpoints.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] El deslinde de responsabilidad es visible sin desplazar la pantalla en móvil.
- [ ] Un partner sin web propia tiene un destino presentable.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F25/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Esconder las condiciones de entrega genera conflictos que acaban en la plataforma aunque no sea responsable. Visibilidad es protección.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F25 completo
```
