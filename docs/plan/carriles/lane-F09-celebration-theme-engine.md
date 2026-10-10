# Carril F09 · Motor de templates theme-driven

| | |
|---|---|
| **Responsable** | [Leo](../equipo/leo.md) |
| **Semana** | [08](../calendario/semana-08.md) · 7 de diciembre al 11 de diciembre de 2026 |
| **Componente** | `packages/celebration-theme` |
| **Predecesores** | F08 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Que añadir un template sea insertar una fila en la base, no programar un componente. Cinco layouts base y un tema que llega como datos: paleta, tipografías, estilo de secciones y orden.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F09-01` | Cinco layouts base: clásico, minimalista, editorial, festivo y corporativo | Los cinco construidos y con snapshot visual |
| `REQ-F09-02` | El tema llega como datos del Template/Media Service | Paleta, tipografía, estilo y orden de secciones |
| `REQ-F09-03` | `<CelebrationRenderer>` compone según el tema | Un solo componente resuelve las cinco variantes |
| `REQ-F09-04` | La paleta se aplica como variables CSS en web y contexto en RN | Mismo resultado en las cuatro plataformas |
| `REQ-F09-05` | **Añadir un template no exige desplegar el frontend** | Una fila nueva en la base cambia el sitio |
| `REQ-F09-06` | Solo se ofrecen templates compatibles con el tipo de evento | Un template de boda no aparece en un quinceaños |

---

## Qué se construye

- `packages/celebration-theme/src/renderer.tsx`
- `packages/celebration-theme/src/layouts/`
- `packages/celebration-theme/src/sections/`
- `packages/celebration-theme/src/theme-context.tsx`

---

## Plan por slices

Cada slice es vertical y termina con sus pruebas en verde. No se pasa al siguiente con el anterior rojo.

1. Contrato de tema y contexto de aplicación.
2. Los cinco layouts base con sus secciones.
3. Renderizador que compone según orden y secciones habilitadas.
4. Prueba de extensibilidad sin despliegue.

---

## Plan de pruebas

- **Test de extensibilidad**: un tema nuevo cambia el render sin tocar código.
- Snapshots visuales de los cinco layouts en los tres breakpoints.
- Test de que un template incompatible no se ofrece.
- Test de secciones deshabilitadas: no se renderizan ni dejan hueco.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Los cinco layouts tienen snapshot aprobado en claro y oscuro.
- [ ] El contrato de tema está documentado para quien cree templates nuevos.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F09/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Programar un componente por template funciona para los dos primeros y se vuelve inmanejable en el quinto. El límite se cruza sin avisar.

---

## Preguntas abiertas

Lo que no se puede resolver sin el propietario no se inventa.

- Cinco layouts es la apuesta del plan. Si el cliente espera más diferenciación entre bodas y quinceaños, hay que subir el número y alargar este carril.

---

## Cómo se activa

```
/rsvp-master Ejecuta el carril F09 completo
```
