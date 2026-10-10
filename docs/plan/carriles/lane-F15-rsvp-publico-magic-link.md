# Carril F15 · RSVP público por magic link

| | |
|---|---|
| **Responsable** | [Miguel](../equipo/miguel.md) |
| **Semana** | [08](../calendario/semana-08.md) · 7 de diciembre al 11 de diciembre de 2026 |
| **Componente** | `apps/seo-web/app/c/[slug]/rsvp` |
| **Predecesores** | F05 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

La pantalla que más gente va a usar en todo el producto: cientos de invitados por celebración, muchos desde un teléfono, muchos sin paciencia. Cinco estados distintos, y cada uno necesita decir con claridad qué pasó y qué hacer.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F15-01` | Pantalla A9: formulario de RSVP por token | Confirmar o rechazar, acompañantes, dieta y mensaje |
| `REQ-F15-02` | Pantalla A10: estado confirmado y editable | Con cuenta atrás hasta la fecha límite |
| `REQ-F15-03` | Pantalla A11: fuera de plazo | Explica cuándo se cerró y a quién escribir |
| `REQ-F15-04` | Pantalla A12: token inválido o revocado | Sin revelar datos de la celebración |
| `REQ-F15-05` | Pantalla A13: RSVP de no registrado | Solo visible si el modo lo permite |
| `REQ-F15-06` | Funciona bien con conexión lenta | El formulario no se pierde si falla el envío |

---

## Qué se construye

- `apps/seo-web/app/c/[slug]/rsvp/[token]/page.tsx`
- `apps/seo-web/app/c/[slug]/rsvp/page.tsx`
- `apps/seo-web/components/rsvp/`
- `packages/forms/src/schemas/rsvp.ts`

---

## Plan por slices

Cada slice es vertical y termina con sus pruebas en verde. No se pasa al siguiente con el anterior rojo.

1. Formulario con React Hook Form y Zod, y envío optimista.
2. Los tres estados de error: fuera de plazo, token inválido y no autorizado.
3. Edición hasta la fecha límite con cuenta atrás.
4. RSVP de no registrado según el modo de la celebración.

---

## Plan de pruebas

- Los cinco estados con MSW, incluidos 401, 403 y 409.
- Test de que el 409 de plazo cerrado muestra la fecha límite en el idioma del invitado.
- Test de que un envío fallido conserva lo escrito.
- Snapshots en tres breakpoints y axe sin violaciones críticas.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Los cinco estados tienen pantalla propia y mensaje accionable.
- [ ] La pantalla carga y es usable en una conexión lenta simulada.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F15/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Es la pantalla con más usuarios y menos tolerancia. Un error genérico acá se traduce en llamadas al anfitrión.

---

## Cómo se activa

```
/rsvp-master Ejecuta el carril F15 completo
```
