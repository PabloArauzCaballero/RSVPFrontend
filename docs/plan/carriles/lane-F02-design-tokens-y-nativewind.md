# Carril F02 · Design tokens y NativeWind

| | |
|---|---|
| **Responsable** | [Pablo](../equipo/pablo.md) |
| **Semana** | [06](../calendario/semana-06.md) · 23 de noviembre al 27 de noviembre de 2026 |
| **Componente** | `packages/design-tokens` |
| **Predecesores** | F01 |
| **Estado inicial** | `NOT_STARTED` |

---

## Objetivo

Una sola fuente de verdad visual para las cuatro superficies. Los tokens se consumen con NativeWind en React Native y con Tailwind en Next. Cambiar un color se propaga a iOS, Android, web y la isla SEO sin tocar nada más.

---

## Requisitos

Cada requisito es falsable: o pasa su prueba, o no pasa. No hay interpretación.

| ID | Requisito | Cómo se demuestra |
|---|---|---|
| `REQ-F02-01` | Tokens de color, tipografía, espaciado, radio y sombra | Definidos una sola vez en el package |
| `REQ-F02-02` | **Un token cambia y se refleja en las cuatro plataformas** | Verificado con una captura por plataforma |
| `REQ-F02-03` | Modo oscuro con los mismos tokens redefinidos | El cambio de tema no exige componentes distintos |
| `REQ-F02-04` | NativeWind configurado en `apps/universal` | Las clases de utilidad funcionan en componentes nativos |
| `REQ-F02-05` | Tailwind configurado en `apps/seo-web` leyendo el mismo package | Los dos preset comparten origen |
| `REQ-F02-06` | **Frontera arquitectónica**: `seo-web` no importa `packages/ui` | Un test de imports falla si alguien lo intenta |

---

## Qué se construye

- `packages/design-tokens/src/colors.ts`
- `packages/design-tokens/src/typography.ts`
- `packages/design-tokens/src/spacing.ts`
- `packages/design-tokens/tailwind-preset.js`
- `packages/config-tailwind/`
- `apps/universal/tailwind.config.js`
- `apps/seo-web/tailwind.config.js`

---

## Plan por slices

Cada slice es vertical y termina con sus pruebas en verde. No se pasa al siguiente con el anterior rojo.

1. Definición de tokens y escalas.
2. Preset de Tailwind derivado de los tokens.
3. NativeWind en la app universal y Tailwind en la isla SEO.
4. Modo oscuro y test de frontera entre packages.

---

## Plan de pruebas

- Test de propagación: cambiar un token y verificar el valor resuelto en las cuatro plataformas.
- **Test de frontera**: un import de `packages/ui` desde `seo-web` hace fallar el lint.
- Test de contraste de la paleta en claro y oscuro.

---

## Definition of Done

Además del [DoD general](../README.md#reglas-que-no-se-negocian), este carril exige:

- [ ] Ningún color, tamaño o espaciado está escrito a mano fuera del package.
- [ ] La paleta cumple el contraste mínimo en ambos temas.

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
- [ ] Evidencia en `docs/progress/evidence/lane-F02/` con capturas por breakpoint y plataforma.
- [ ] Revisión de código por otro eje aprobada.
- [ ] Estado final `REGRESSION_VERIFIED` antes de `DONE`.

---

## Riesgos y trampas conocidas

- Si los tokens no se adoptan desde el primer componente, aparecen valores sueltos y después nadie los unifica.

---

## Preguntas abiertas

Lo que no se puede resolver sin el propietario no se inventa.

- No hay manual de marca del cliente. Los tokens iniciales los define el equipo; si llega una identidad visual, hay que incorporarla antes de que se construyan las pantallas.

---

## Cómo se activa

```
/rsvp-master Ejecuta el carril F02 completo
```
