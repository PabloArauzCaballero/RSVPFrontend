# Auditoría previa a publicación · 2026-11-17

Alcance: verificar las tres correcciones del commit `52af3eb9e918766b0c77ddcfceee59dd264ca694`, sin merge, PR ni despliegue. Esta auditoría corrige el diagnóstico inicial de los supuestos fallos generales del repositorio.

## Diagnóstico corregido

El checkout de Windows usa `core.autocrlf=true`. Los comprobadores de generados y de metadatos comparan texto literalmente con LF; algunos archivos locales tenían CRLF. Además, el generador de contratos detectaba el backend hermano de otra rama, que no es el snapshot congelado de este frontend.

La primera extracción con `git archive` también heredó esa conversión, por lo que repetir allí el error no demostraba un defecto versionado. La extracción con `git -c core.autocrlf=false archive --format=tar -o source.tar 52af3eb` sí conserva LF. Con Node 24.18.1:

| Comando desde la extracción LF | Resultado observado |
| --- | --- |
| `node packages/design-tokens/scripts/generate.mjs --check` | PASS, exit 0, los dos generados coinciden. |
| `node packages/contracts/scripts/generate.mjs --check` | PASS, exit 0, ocho contratos coinciden con el snapshot versionado; el checkout hermano no participa. |
| `node scripts/validate-harness.mjs` | PASS, exit 0, 28 carriles, 61 skills y recarga por prompt. |

No se cambiaron ni regeneraron tokens, contratos, skills o adaptadores. El YAML multilínea de `minimalist-ui` es aceptado por los comprobadores; el fallo local era el delimitador CRLF. La comparación del backend hermano requiere un checkout de la versión coordinada; importar su rama actual ampliaría el alcance sin justificación.

## Prueba real con Chrome

`CHROMIUM_PATH` apunta al Chrome instalado en `%LOCALAPPDATA%/Google/Chrome/Application/chrome.exe`, versión **157.0.8103.79**. Es un perfil de automatización nuevo, sin acceder al perfil personal del usuario. No se instaló software ni se cambiaron opciones de seguridad.

Comando: `APP=http://localhost:8340 BROWSER_ORIGIN=https://dev.done.arauzsoftware.com EVIDENCE_DIR=docs/progress/evidence/session-refresh/publication-audit/chrome-real CHROMIUM_PATH=<Chrome instalado> node --use-system-ca apps/universal/scripts/verify-session-refresh.mjs`.

Resultado: **PASS, exit 0, 19 comprobaciones**, incluidas subida real con procesamiento, altas reales de invitado/regalo, recarga y cookie enviada por el propio navegador, pérdida de conexión y reintento, cancelación por botón/Escape, foco/Tab, movimiento reducido/normal y cierre confirmado 204. La matriz usa 360/768/1280, claro/oscuro y es-BO/en-US, con cero infracciones axe serias/críticas. [Resultados](chrome-real/live-results.json).

Se inspeccionaron el diálogo móvil claro en español y el de escritorio oscuro en inglés: título completo y botones visibles; también la lista móvil oscura de invitados. No se acredita lector de pantalla ni dispositivo físico iOS/Android a partir de este recorrido web.

## Comparación visual antes/después

Comando: `CHROMIUM_PATH=<Chrome instalado> node --use-system-ca apps/universal/scripts/verify-session-refresh-visual.mjs`.

La referencia es la web actualmente desplegada en `https://dev.done.arauzsoftware.com`; el candidato es la imagen de release local, `sha256:e5131f8a07fffaba6c72091afbdb671be028547c9c9c80285481ed7109d80a81`. Ambos se abren en Chrome de Windows, con los mismos datos sintéticos sin publicar, idioma, tema y tamaño. La comparación no intercepta respuestas, no enmascara contenido y conserva los PNG de ambos lados. No se identifica el SHA del servidor remoto a partir de una captura ni se sustituye la aprobación humana del cambio intencional del diálogo.

Resultado: **PASS, exit 0, 36 comparaciones** (galería, invitados y regalos × 12 combinaciones). Se cuenta cualquier píxel RGB diferente; el límite de proporción 0.002 coincide con el gate visual existente del repositorio. [Resultados y diferencias medidas](visual/results.json). El nuevo diálogo se acredita con las capturas y la interacción de la matriz Chrome; su aparición es el cambio funcional intencional.

33 pares coinciden píxel a píxel. Los otros tres son 768 px/claro/en-US: galería 0.1714 %, invitados 0.1617 % y regalos 0.1318 %, todos por debajo de 0.2 %. Se inspeccionó el par de galería con mayor diferencia: conserva disposición, texto, controles e ilustración, con diferencias pequeñas en rasterización del texto.

## Compilación y regresión completas

La ejecución en Linux usa Node 24.18.1, dependencias instaladas con `yarn install --immutable` y fuente LF limpia, sin junctions a los módulos del equipo. **PASS completo**, finalizado a las 20:22 UTC. [Comandos y códigos de salida](linux-results.json):

| Validación | Resultado |
| --- | --- |
| Harness, lint raíz y contratos | Tres comandos, exit 0. |
| `yarn turbo run build lint typecheck --concurrency=1 --output-logs=errors-only` | 54/54 tareas PASS, exit 0, sin caché. Incluye las dos apps. [Salida](build-lint-typecheck.txt). |
| Comando `test` de cada workspace | 18/18 comandos PASS, exit 0. Vitest ejecutado con un worker; configuraciones sin suite mantienen su comando original. |
| `yarn turbo run test:coverage --concurrency=1 --output-logs=errors-only -- --maxWorkers=1 --no-file-parallelism` | 21/21 tareas PASS, exit 0, sin caché, con los umbrales existentes. [Salida](coverage.txt). |

No se cambiaron aserciones, umbrales, exclusiones o skips. El live test de auth que ya estaba omitido no acredita integración; el recorrido Chrome contra los servicios reales sí aporta la evidencia funcional correspondiente.

Los intentos auxiliares desde la extracción Windows compartiendo node_modules tuvieron límites del entorno: Turbo filtraba la opción de certificados de confianza al descargar Google Fonts; al pasarla, Next compiló. Metro rechazó resolver paquetes por fuera de la extracción mediante junctions. Esos intentos no se presentan como compilación completa ni como defectos del código; motivan la verificación independiente en Linux.

Para reproducir la validación Linux, exportar el commit a una carpeta nueva con LF, extraerlo y construir desde esa carpeta (sin node_modules del host):

```sh
git -c core.autocrlf=false archive --format=tar -o source.tar 52af3eb
tar -xf source.tar -C <carpeta-fuente-limpia>
docker build -f <auditoria>/Dockerfile.validation -t rsvp-publication-validation:52af3eb <carpeta-fuente-limpia>
docker run --rm --mount type=bind,source=<auditoria>,target=/evidence rsvp-publication-validation:52af3eb node /evidence/run-linux-validations.mjs
```

`<auditoria>` es la ruta absoluta de esta carpeta. El [runner](run-linux-validations.mjs) ejecuta los comandos originales de cada workspace, limita a un worker los tests Vitest por memoria, conserva sus aserciones y umbrales y registra comandos/códigos de salida. No se modifica el backend ni se realizan migraciones. La publicación evaluada es la imagen web universal; no se publica un binario móvil en este trabajo.

## Conclusión y límites de publicación

Las verificaciones de código y los recorridos web de esta entrega están completos. La rama queda preparada para revisión humana hacia `chore/deploy-contabo-coolify`; no se abrió PR, no se hizo merge y no se modificó Coolify ni la web desplegada. Los cambios añadidos durante esta auditoría son scripts y evidencia, sin código de producción adicional.

El nuevo diálogo y las capturas se ofrecen para revisión; no se inventa una aprobación humana de diseño. No se ejecutó un binario móvil ni un lector de pantalla. Tras un eventual despliegue corresponde comprobar el login y la recarga en el dominio HTTPS final. El cambio de origen de la cookie requiere iniciar sesión una vez; las siguientes recargas la conservan. El plan de reversión sigue siendo desplegar la imagen anterior, sin migraciones.

## Branch integration check - 2026-11-17

After `git fetch origin`, the deployment base `origin/chore/deploy-contabo-coolify` is `669547884aabaf6cf625ce91a0fccb44676312e9`. Both `git merge-base --is-ancestor origin/chore/deploy-contabo-coolify HEAD` and `git merge-tree --write-tree HEAD origin/chore/deploy-contabo-coolify` exit 0: no merge conflicts. The intended PR base is `chore/deploy-contabo-coolify`, with head `fix/invitation-refresh-and-session`.

An exploratory merge-tree against `origin/dev` (`a392529`) exits 1, with conflicts in the F23 evidence and `packages/query-hooks/src/gift/{api,index}.ts`. Integration into dev is outside this deployment change.

Restoring LF only in the local minimalist-ui skill allows `node scripts/reload-skills.mjs cli` to exit 0 without changing its versioned content. Trailing spaces were removed from two Turbo logs; recorded results are unchanged. Complete test results above refer to production commit `52af3eb`; they are not presented as new executions. No additional production changes were made.
