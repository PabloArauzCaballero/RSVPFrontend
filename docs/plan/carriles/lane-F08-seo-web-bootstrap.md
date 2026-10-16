# Carril F08 · Isla SEO con Next.js

| | |
|---|---|
| **Responsable** | [Leo](../equipo/leo.md) |
| **Semana** | [07](../calendario/semana-07.md) · 30 de noviembre al 4 de diciembre de 2026 |
| **Componente** | `apps/seo-web` |
| **Predecesores** | F02 · F03 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

La parte del producto que Google debe leer. Render en servidor, metadatos, Open Graph, datos estructurados y sitemap. Es el embudo que lleva tráfico orgánico hacia los partners, que es donde está el negocio.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F08-01` | App Router con SSR e ISR por ruta | Las rutas públicas se sirven renderizadas |
| `REQ-F08-02` | Metadatos dinámicos por ruta | Título y descripción generados del contenido real |
| `REQ-F08-03` | Open Graph para compartir por WhatsApp | Una vista previa correcta al pegar el enlace |
| `REQ-F08-04` | JSON-LD donde corresponde | `Event` en la celebración, `LocalBusiness` en el partner |
| `REQ-F08-05` | `sitemap.xml` y `robots.txt` generados | Incluyen las rutas indexables y excluyen las privadas |
| `REQ-F08-06` | **Lighthouse SEO por encima de 95** | Medido en CI, no a ojo |

---

## Qué se construye

- `apps/seo-web/app/layout.tsx`
- `apps/seo-web/app/sitemap.ts`
- `apps/seo-web/app/robots.ts`
- `apps/seo-web/lib/metadata.ts`
- `apps/seo-web/lib/json-ld.ts`
- `apps/seo-web/components/`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Renderizar una ficha pública mínima por slug en servidor y comprobar HTML indexable.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F08-01, REQ-F08-02, REQ-F08-03, REQ-F08-04, REQ-F08-05, REQ-F08-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 15 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** Impeccable + UI/UX Pro Max + estados + visual. **Animación:** evaluar propósito; si se implementa, motion design + reduced motion.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Layout base, tema y tipografías con los tokens compartidos.
2. Metadatos dinámicos y Open Graph.
3. Datos estructurados JSON-LD por tipo de página.
4. Sitemap, robots y Lighthouse en CI.

---

## Plan de pruebas

- Lighthouse en CI con umbral de SEO en 95.
- Validación del JSON-LD contra el esquema.
- Test de que el sitemap incluye solo rutas públicas.
- Vista previa de Open Graph verificada con el validador.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Las rutas indexables se sirven renderizadas, no como una cáscara vacía.
- [ ] El sitemap se regenera cuando se publica una celebración nueva.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F08/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Si una ruta indexable termina renderizándose solo en el cliente, Google la ve vacía y el embudo orgánico desaparece sin que nada falle.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F08 completo
```
