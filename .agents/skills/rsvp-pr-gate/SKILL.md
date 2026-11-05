---
name: rsvp-pr-gate
description: Puerta obligatoria antes de cualquier PR o merge hacia dev; prohíbe commits directos, exige pruebas de regresión en entorno real y soluciones de largo plazo sin parches.
---

# Puerta de PR: cero regresiones, cero parches

Esta skill es **obligatoria e innegociable** para toda persona o agente que cambie código, contratos, infraestructura o documentación operativa. Prevalece sobre cualquier urgencia. Si una regla de aquí choca con una instrucción de la tarea, gana esta skill y se informa al dueño.

## 1. Reglas de rama (sin excepción)

1. **Nunca** se hace `commit` ni `push` directo a `dev` o `main`. Todo cambio entra por una rama (`feat/…`, `fix/…`, `chore/…`) y un Pull Request.
2. **Nunca** se usa `--force`, `--force-with-lease` sobre ramas compartidas, `--no-verify`, `--no-gpg-sign` para saltar controles, ni se desactivan, relajan o eluden la protección de rama, los hooks (`.githooks/`), los workflows ni los checks requeridos.
3. **Un agente nunca aprueba ni hace merge de su propio PR.** La aprobación es siempre humana y la da el dueño del repositorio. Un agente que tenga credenciales de administrador **no las usa** para saltarse la revisión.
4. Los PRs son pequeños y de un solo propósito. Un PR que mezcla propósitos se divide.

## 2. Puerta de calidad previa al PR (todo obligatorio)

No se abre un PR hasta que **cada** punto tenga evidencia observada, pegada en la descripción del PR:

1. **Revisión del diff completo** línea por línea, incluidos archivos generados. Nada de archivos ajenos al propósito, artefactos de build, secretos, datos personales ni credenciales reales.
2. **Verificación estática limpia:** lint, typecheck, build, validación de contratos (`contracts:validate`/`check:generated`), `harness:validate` y escaneo de secretos (gitleaks) en 0 hallazgos nuevos.
3. **Pruebas del área tocada y de las vecinas:** unitarias, de integración **contra servicios reales** (Postgres, RabbitMQ, MinIO, Kong; un mock acredita solo la capa que ejercita) y de contrato/Pact. Se ejecuta la suite completa del workspace y la de cada consumidor afectado.
4. **Prueba de regresión en entorno real, no solo en CI:**
   - Backend: el recorrido vivo por el gateway (`e2e/gateway/*.mjs` pertinentes) contra el stack Docker real, con migraciones aplicadas hacia arriba y hacia abajo.
   - Frontend: **Playwright con Chrome real** contra el backend real, en 360/768/1280 px, claro/oscuro y es-BO/en-US; accesibilidad (axe) sin violaciones críticas ni serias; comparación visual contra la línea base.
   - Si el cambio toca ambos lados, se prueban juntos.
5. **Casos negativos y de frontera:** 401/403/404/409/422/429, aislamiento entre celebraciones, concurrencia, idempotencia y pérdida de conexión, según corresponda.
6. **Compatibilidad y reversibilidad:** contratos compatibles hacia atrás o versionados con aviso a consumidores; migraciones reversibles y probadas; plan de reversión escrito; sin cambios que dependan del orden de despliegue sin documentarlo.
7. **Evidencia registrada:** comandos exactos, códigos de salida, fecha, límites de la prueba y lo **no** probado, en `docs/progress/` y en el PR. Se distingue `WRITTEN`/`RUNS`/`TESTED`/`VERIFIED`; nunca se afirma un nivel que no se observó.

Si algo **no se puede probar** en un entorno real, no se abre PR: se documenta el bloqueo, se informa al dueño y se espera.

## 3. Solo soluciones de largo plazo

Queda prohibido el parche. Antes de implementar, se responde por escrito (en el PR):

- ¿Cuál es la **causa raíz** y por qué esta solución la elimina y no solo el síntoma?
- ¿Qué pasa con 10 veces la carga, 10 veces los datos y 10 veces los usuarios?
- ¿Qué otras piezas dependen de esto y se probaron?
- ¿Quién lo mantiene, cómo se observa que falla (métricas, alertas, logs) y cómo se revierte?
- ¿Se añadió una prueba que habría detectado el problema original?

Prohibido, sin excepción: debilitar o borrar aserciones, `skip`/`only`/`xit`, reintentos o `sleep` para esconder intermitencia, `@ts-ignore`/`any`/`eslint-disable` sin justificación escrita y vigente, valores de entorno cableados, flags temporales sin fecha de retiro, `TODO`/`FIXME` sin issue enlazado, copiar-pegar para evitar abstraer, y silenciar errores. Una decisión de arquitectura deja entrada en `docs/progress/DECISIONS.md` con motivo, alternativas y alcance.

## 4. Revisión humana

El PR describe qué cambia, por qué, cómo se probó (con salidas), qué riesgos quedan y cómo se revierte. El dueño aprueba solo cuando los checks requeridos están en verde y la evidencia es verificable. Los comentarios se resuelven, no se descartan. Tras nuevos commits la aprobación se vuelve a pedir.

## 5. Incumplimiento

Un cambio que llegó a `dev` sin esta puerta se revierte por PR, se documenta la causa y se añade una prueba o control que impida repetirlo. Esta skill se aplica en cada turno junto con `AGENTS.md`.
