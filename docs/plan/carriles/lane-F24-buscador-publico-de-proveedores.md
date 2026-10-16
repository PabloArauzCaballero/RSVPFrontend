# Carril F24 · Buscador público de proveedores

| | |
|---|---|
| **Responsable** | [Leo](../equipo/leo.md) |
| **Semana** | [13](../calendario/semana-13.md) · 11 de enero al 15 de enero de 2027 |
| **Componente** | `apps/seo-web/app/proveedores` |
| **Predecesores** | F08 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

El embudo de captación orgánica. Rutas por categoría y ciudad que posicionan en Google: alguien busca «salón de eventos Santa Cruz», llega a nuestra ficha y se convierte en un lead para un partner.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F24-01` | Pantalla B1: portada del directorio | Categorías, ciudades destacadas y buscador |
| `REQ-F24-02` | Pantalla B2: listado por categoría | Renderizado en servidor y paginado de forma indexable |
| `REQ-F24-03` | **Pantalla B3: listado por categoría y ciudad** | Rutas de cola larga con metadatos propios |
| `REQ-F24-04` | Pantalla B4: resultados con filtros | Geo, precio, verificado y disponibilidad |
| `REQ-F24-05` | JSON-LD de tipo `ItemList` en los listados | Validado contra el esquema |
| `REQ-F24-06` | **Lighthouse SEO por encima de 95** | Medido en CI sobre las tres rutas |

---

## Qué se construye

- `apps/seo-web/app/proveedores/page.tsx`
- `apps/seo-web/app/proveedores/[categoria]/page.tsx`
- `apps/seo-web/app/proveedores/[categoria]/[ciudad]/page.tsx`
- `apps/seo-web/app/proveedores/buscar/page.tsx`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Buscar una categoría y ciudad, abrir un proveedor y mantener filtros en navegación atrás.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F24-01, REQ-F24-02, REQ-F24-03, REQ-F24-04, REQ-F24-05, REQ-F24-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 30 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** Impeccable + UI/UX Pro Max + estados + visual. **Animación:** evaluar propósito; si se implementa, motion design + reduced motion.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Portada del directorio con categorías y ciudades.
2. Listados por categoría y por categoría más ciudad, renderizados en servidor.
3. Búsqueda con filtros combinables.
4. Metadatos, JSON-LD y verificación con Lighthouse.

---

## Plan de pruebas

- Lighthouse SEO sobre 95 en las tres rutas, en CI.
- Validación del JSON-LD.
- Test de que la paginación es rastreable por un buscador.
- **Test que escanea el DOM buscando enlaces directos a partner.**

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Las rutas de cola larga tienen título y descripción únicos y descriptivos.
- [ ] El sitemap incluye las combinaciones de categoría y ciudad con contenido real.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F24/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Generar rutas de cola larga sin proveedores detrás crea páginas vacías que perjudican el posicionamiento en vez de ayudarlo.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F24 completo
```
