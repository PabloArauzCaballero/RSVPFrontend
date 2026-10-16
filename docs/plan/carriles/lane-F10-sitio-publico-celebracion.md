# Carril F10 · Sitio público de la celebración

| | |
|---|---|
| **Responsable** | [Leo](../equipo/leo.md) |
| **Semana** | [09](../calendario/semana-09.md) · 14 de diciembre al 18 de diciembre de 2026 |
| **Componente** | `apps/seo-web/app/c/[slug]` |
| **Predecesores** | F09 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Lo que ve el invitado cuando abre el enlace. Nueve pantallas públicas, responsive, en dos idiomas y con las horas del evento. Es la primera impresión del producto para cientos de personas por celebración.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F10-01` | Pantallas A1 a A8 implementadas | Portada, historia, itinerario, lugares, galería, dress code, FAQ y recomendaciones |
| `REQ-F10-02` | Pantalla A21: celebración no publicada o archivada | 404 controlado que no revela datos |
| `REQ-F10-03` | Responsive verificado por snapshot | 360, 768 y 1280 px |
| `REQ-F10-04` | Contenido en el idioma del visitante con repliegue | `Accept-Language` respetado |
| `REQ-F10-05` | **El itinerario se muestra en la timezone de la celebración** | Verificado desde un dispositivo en otro huso |
| `REQ-F10-06` | Las recomendaciones incluyen partners, siempre vía el redirector | Ningún enlace directo al proveedor |

---

## Qué se construye

- `apps/seo-web/app/c/[slug]/page.tsx`
- `apps/seo-web/app/c/[slug]/historia/page.tsx`
- `apps/seo-web/app/c/[slug]/itinerario/page.tsx`
- `apps/seo-web/app/c/[slug]/lugares/page.tsx`
- `apps/seo-web/app/c/[slug]/galeria/page.tsx`
- `apps/seo-web/app/c/[slug]/faq/page.tsx`
- `apps/seo-web/app/c/[slug]/recomendaciones/page.tsx`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Abrir portada de una celebración publicada con fecha, lugar y RSVP accesible desde móvil.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F10-01, REQ-F10-02, REQ-F10-03, REQ-F10-04, REQ-F10-05, REQ-F10-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 15 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** Impeccable + UI/UX Pro Max + estados + visual. **Animación:** evaluar propósito; si se implementa, motion design + reduced motion.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Portada con cuenta regresiva y datos clave.
2. Historia, itinerario y lugares con mapa.
3. Galería con carga diferida, dress code y preguntas frecuentes.
4. Recomendaciones con partners y estados de error.

---

## Plan de pruebas

- Snapshots visuales de las nueve pantallas en tres breakpoints.
- Test de idioma: la misma celebración en `es-BO` y `en-US`.
- Test de timezone desde un dispositivo simulado en Madrid.
- **Test que escanea el DOM: ningún enlace a partner fuera del redirector.**

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Las nueve pantallas tienen snapshot aprobado.
- [ ] Una celebración sin alguna sección opcional no deja huecos vacíos.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F10/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- La galería es la pantalla que más fácil degrada el rendimiento. Carga diferida y variantes webp desde el principio.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F10 completo
```
