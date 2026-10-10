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

## Plan por slices

Cada slice es vertical y termina con sus pruebas en verde. No se pasa al siguiente con el anterior rojo.

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
/rsvp-master Ejecuta el carril F24 completo
```
