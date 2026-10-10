# Carril F11 · Onboarding y editor de contenido

| | |
|---|---|
| **Responsable** | [Leo](../equipo/leo.md) |
| **Semana** | [10](../calendario/semana-10.md) · 21 de diciembre al 25 de diciembre de 2026 |
| **Componente** | `apps/universal/app/(host)` |
| **Predecesores** | F09 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Donde el anfitrión crea y llena su celebración. Tres pasos de alta y siete pantallas de edición, incluidas la galería y las traducciones. Es la superficie donde el anfitrión pasa más tiempo.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F11-01` | Pantallas C3 a C5: tipo de evento, datos básicos y template | Con vista previa en vivo del template |
| `REQ-F11-02` | Pantallas C7 a C12: anfitrión, lugares, historia, itinerario, secciones y galería | Las seis con guardado y validación |
| `REQ-F11-03` | Pantalla C13: traducciones por idioma | Editar el mismo contenido en los idiomas soportados |
| `REQ-F11-04` | Los roles del anfitrión salen del tipo de evento | Boda pide novios; quinceaños pide la celebrante |
| `REQ-F11-05` | Subida de imágenes con URL prefirmada y progreso | Reordenar y elegir portada |
| `REQ-F11-06` | Guardado con detección de conflicto | Dos pestañas editando: la segunda recibe 409 y lo explica |

---

## Qué se construye

- `apps/universal/app/(host)/onboarding/`
- `apps/universal/app/(host)/editor/`
- `apps/universal/app/(host)/editor/galeria.tsx`
- `apps/universal/app/(host)/editor/traducciones.tsx`

---

## Plan por slices

Cada slice es vertical y termina con sus pruebas en verde. No se pasa al siguiente con el anterior rojo.

1. Onboarding de tres pasos con vista previa del template.
2. Editores de datos, lugares, historia e itinerario.
3. Galería con subida prefirmada, reordenamiento y portada.
4. Traducciones y manejo de conflicto de edición.

---

## Plan de pruebas

- Testing Library por pantalla con estados de carga, error y vacío.
- Test de que los campos cambian según el tipo de evento.
- Test de subida con archivo inválido: mensaje claro, sin perder el formulario.
- Test de conflicto de edición concurrente.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Ningún formulario pierde datos al fallar el guardado.
- [ ] Las diez pantallas tienen snapshot aprobado en tres breakpoints.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F11/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Un editor que pierde lo escrito cuando falla la red es la queja número uno de este tipo de producto. El borrador local no es opcional.

---

## Cómo se activa

```
/rsvp-master Ejecuta el carril F11 completo
```
