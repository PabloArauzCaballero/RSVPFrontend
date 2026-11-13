# QA 2026-11-13 · #1 Ciudad y cobertura de una oferta por nombre

Reporte: al crear una oferta, "Ciudad" pedía el código (`la-paz`) y "Santa Cruz De la Sierra" volvía 422 `Revisa este dato: Ciudad desconocida`. "Zonas de cobertura" pedía `la-paz, el-alto`.

Causa raíz: el formulario era texto libre y Provider Catalog valida la ciudad contra su catálogo por *slug*. El catálogo ya se publica en `GET /providers/geo` (17 ciudades, público), pero la app no lo usaba.

Solución: hook `useGeoCities` (`@rsvp/query-hooks`) sobre `GET /providers/geo`; "Ciudad" es un selector con el nombre (y departamento si difiere) y "Zonas de cobertura" son casillas por ciudad. Se siguen enviando los slugs que el servidor valida y busca; la fila de la oferta muestra los nombres. No hay cambio de contrato.

Evidencia (2026-11-13, Chrome real contra el backend de dev por un proxy del mismo origen, `qa-1113.mjs`):

- 360/768/1280 × claro/oscuro: 17 ciudades por nombre, ninguna con guiones; axe sin violaciones críticas/serias.
- Alta real en dev (proveedor de prueba): guardado `city=santa-cruz`, `coverageZones=[santa-cruz, warnes]`; la fila dice "Cobertura: Santa Cruz de la Sierra, Warnes".
- Unitarias: `gifts-portal.test.tsx` elige "La Paz", "El Alto" y "Santa Cruz de la Sierra (Santa Cruz)" y verifica el cuerpo del POST.

Límites: en-US no se recorrió en Chrome (las cadenas se actualizaron en ambos idiomas); nativo iOS/Android no probado (el selector usa `FilterSelect`, que ya tiene variante nativa). El filtro "Ciudad" de proveedores en Regalos sigue siendo texto libre (fuera de este PR).
