## Qué cambia y por qué

<!-- Una sola finalidad. Enlaza el carril/REQ o el motivo fuera de carril. -->

## Causa raíz y solución de largo plazo

- Causa raíz (no el síntoma):
- Por qué esta solución es definitiva y no un parche:
- Comportamiento con 10× carga/datos/usuarios y dependientes revisados:
- Cómo se observa un fallo (métricas, alertas, logs) y quién lo mantiene:
- Prueba nueva que habría detectado el problema original:

## Evidencia de regresión

Pegue comandos, códigos de salida y fecha. Lo no probado se declara aquí.

```
<salida de lint, typecheck, build, contracts:validate, harness:validate, gitleaks>
<salida de pruebas unitarias e integración reales>
<recorrido vivo (e2e/gateway) o Playwright con Chrome real>
```

- [ ] Revisé el diff completo: sin artefactos, secretos, datos personales ni archivos ajenos al propósito.
- [ ] Lint, typecheck, build, validación de contratos, `harness:validate` y gitleaks pasan (código de salida 0).
- [ ] Pruebas del área y de los consumidores/vecinos pasan, con integración contra servicios reales y no solo mocks.
- [ ] Probé en un entorno real (stack Docker/gateway o Playwright con Chrome real contra el backend real) y adjunto la salida.
- [ ] Probé casos negativos, de frontera, concurrencia e idempotencia donde aplican.
- [ ] Frontend: probé 360/768/1280, claro/oscuro, es-BO/en-US, axe sin críticos/serios y comparación visual.
- [ ] Contratos compatibles o versionados con aviso a consumidores; migraciones reversibles y probadas arriba y abajo.
- [ ] No debilité aserciones, no añadí skip/only, ignores sin justificación, TODO sin issue ni soluciones temporales.
- [ ] Registré evidencia y decisiones en `docs/progress/` y no afirmo un nivel de verificación que no observé.

## Reversión

- Cómo se revierte este cambio y qué hay que revertir en consumidores/datos:

## Lista específica del carril (previa a esta puerta)

## Carril y alcance

- Carril `FNN` o motivo de cambio fuera de carril:
- REQs, pantallas y plataformas afectadas:

### Evidencia obligatoria

- [ ] Apliqué `AGENTS.md`, `$rsvp-frontend-lane` y `docs/engineering/convenciones.md` al carril.
- [ ] Apliqué `$rsvp-frontend-visual-proof` si cambié pantallas, navegación, estilo o SEO.
- [ ] Recargué el catálogo en cada prompt y apliqué `$rsvp-evidence`; usé `$rsvp-accessible-states` y `$rsvp-motion-design` cuando correspondía.
- [ ] Registré por REQ `PASS`, `FAIL` o `BLOCKED-EXTERNAL`, con comando/artefacto y resultado observado.
- [ ] Verifiqué estados de carga, vacío, éxito y errores contractuales pertinentes.
- [ ] Revisé i18n, zona horaria, accesibilidad y enlaces `/r/{listingId}` cuando aplican.
- [ ] Distinguí evidencia web, iOS, Android y backend real de mocks.

Comandos ejecutados y resultados:

Bloqueos y verificación pendiente:
