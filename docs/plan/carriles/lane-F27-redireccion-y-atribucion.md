# Carril F27 · Redirección y atribución en el frontend

| | |
|---|---|
| **Responsable** | [Fabio](../equipo/fabio.md) |
| **Semana** | [12](../calendario/semana-12.md) · 4 de enero al 8 de enero de 2027 |
| **Componente** | `apps/seo-web/app/r/[listingId]` |
| **Predecesores** | F25 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

El carril que protege el modelo de negocio en el lado visible. Ningún enlace a un partner sale directo desde ninguna pantalla del producto: todos pasan por el redirector, que es lo que convierte un clic en un lead facturable.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F27-01` | Pantalla B12: botones de contacto directo | WhatsApp, teléfono, correo e Instagram, todos vía el redirector |
| `REQ-F27-02` | Pantalla B13: manejador de redirección | Registra el lead y devuelve 302 |
| `REQ-F27-03` | **302, nunca 301** | Un test que falla si alguien lo cambia |
| `REQ-F27-04` | La URL final contiene los UTM y el `correlationId` | Verificado en un test de extremo a extremo |
| `REQ-F27-05` | Se registra la superficie de origen | Sitio público, panel, catálogo de regalos o buscador |
| `REQ-F27-06` | **Ningún enlace a partner escapa del redirector** | Un test escanea el DOM renderizado de todas las pantallas |

---

## Qué se construye

- `apps/seo-web/app/r/[listingId]/route.ts`
- `packages/ui-web/src/partner-link.tsx`
- `e2e/playwright/no-direct-partner-links.spec.ts`

---

## Primer slice vertical replanificado (16-oct-2026)

**Resultado demostrable:** Salir por /r/{listingId} desde una tarjeta y observar atribución sin enlace directo.

- **REQs:** relacionar el primer corte con los requisitos aplicables (REQ-F27-01, REQ-F27-02, REQ-F27-03, REQ-F27-04, REQ-F27-05, REQ-F27-06) en la evidencia antes de implementarlo; los demás se reparten en cortes posteriores. Este primer corte no cierra el carril.
- **Frontera entre repos:** 31 backend; coordinar contrato versionado y prueba de integración cuando el resultado la requiera.
- **Prueba mínima:** caso de éxito y caso negativo en runtime pertinente, con comando/artefacto y resultado en la evidencia del carril. Un mock solo prueba su capa.
- **Gates de interfaz:** Impeccable + UI/UX Pro Max + estados + visual. **Animación:** evaluar propósito; si se implementa, motion design + reduced motion.
- **Descubrimiento:** consultar CodeGraph para flujo e impacto y confirmar en archivos actuales.

Los puntos del inventario siguiente describen capacidades previstas, **no** slices verticales listos para ejecutar. Corta cada capacidad restante por comportamiento y cierra su prueba antes de avanzar; sigue [la revisión general](../revision-vertical-slice-2026-10-16.md).

---

## Inventario histórico de capacidades

Esta lista conserva el inventario original por componentes. No representa slices ejecutables ni el orden de entrega.

1. Manejador de ruta con 302 y propagación de contexto.
2. Componente `PartnerLink` que es la única forma permitida de enlazar.
3. Registro de la superficie de origen en cada superficie.
4. Test de barrido del DOM en todas las pantallas públicas.

---

## Plan de pruebas

- **El código de respuesta es exactamente 302.**
- La URL resuelta contiene UTM y `correlationId`.
- **Barrido del DOM de todas las pantallas: cero enlaces directos a dominios de partner.**
- Test de extremo a extremo: clic, redirección y lead visible en las métricas del partner.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Existe un único componente para enlazar a un partner y una regla de lint que prohíbe el resto.
- [ ] El test de barrido cubre las pantallas públicas y las del panel.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F27/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- **Un solo enlace directo que se cuele pierde leads en silencio.** Nada falla, nada se rompe: simplemente se deja de contar. Por eso el test escanea el DOM en vez de confiar en la revisión.

---

## Cómo se activa

```
Usa $rsvp-frontend-lane para ejecutar el carril F27 completo
```
