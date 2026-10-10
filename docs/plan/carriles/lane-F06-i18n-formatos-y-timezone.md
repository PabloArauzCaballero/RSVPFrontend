# Carril F06 · Internacionalización y formatos

| | |
|---|---|
| **Responsable** | [Pablo](../equipo/pablo.md) |
| **Semana** | [08](../calendario/semana-08.md) · 7 de diciembre al 11 de diciembre de 2026 |
| **Componente** | `packages/i18n` |
| **Predecesores** | F02 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Que el producto hable el idioma de quien lo mira y muestre las horas del evento, no las del dispositivo. Arranca con español boliviano e inglés, pero añadir un idioma es cargar un archivo.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F06-01` | i18next funcionando en React Native y en Next | Un mismo catálogo sirve a las dos apps |
| `REQ-F06-02` | `es-BO` y `en-US` completos | Ninguna clave sin traducir en el arranque |
| `REQ-F06-03` | Fechas, números y moneda con `Intl` | Formato correcto por locale, sin librerías de formato ad hoc |
| `REQ-F06-04` | **Las horas se muestran en la timezone de la celebración** | Un dispositivo en Madrid ve el itinerario en hora de La Paz |
| `REQ-F06-05` | Detección de idioma con preferencia explícita del usuario | La elección manual gana sobre la del sistema |
| `REQ-F06-06` | Test que detecta cadenas fuera de i18n | Un texto escrito a mano hace fallar el lint |

---

## Qué se construye

- `packages/i18n/src/index.ts`
- `packages/i18n/locales/es-BO/`
- `packages/i18n/locales/en-US/`
- `packages/i18n/src/format/date.ts`
- `packages/i18n/src/format/money.ts`
- `packages/config-eslint/rules/no-literal-strings.js`

---

## Plan por slices

Cada slice es vertical y termina con sus pruebas en verde. No se pasa al siguiente con el anterior rojo.

1. Configuración de i18next universal y carga de catálogos.
2. Formateo de fecha, número y moneda con `Intl`.
3. Resolución de timezone de la celebración en todos los formateos de hora.
4. Regla de lint contra cadenas literales.

---

## Plan de pruebas

- El mismo itinerario desde dispositivos en tres zonas horarias distintas muestra la misma hora local del evento.
- Formateo de `BOB` y de `USD` en ambos locales.
- Cambio de idioma en caliente sin recargar.
- La regla de lint detecta una cadena escrita a mano.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] No hay ni una cadena visible escrita directamente en una pantalla.
- [ ] Añadir `pt-BR` es crear una carpeta de catálogo, nada más.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F06/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Formatear horas con la zona del dispositivo es el bug clásico: solo lo ven los usuarios de otro huso y nadie lo reproduce localmente.

---

## Cómo se activa

```
/rsvp-master Ejecuta el carril F06 completo
```
