# F01 · exportación web de Expo

Fecha: 2026-10-11.

La configuración, los grupos de Expo Router y el typecheck están verdes. La exportación `expo export --platform web --output-dir web-build --max-workers 1` inicia Metro y queda en `0.0% (0/1)` sin producir archivos ni error, aun con `CI=1`; el proceso termina con código 0 y deja el directorio vacío en este Windows/Node local.

Esto no invalida la compilación TypeScript ni el build de Next, pero impide declarar verificada la salida web universal hasta reproducirlo en un runner Linux de CI o con una versión de Node compatible con Metro/Expo. Se mantiene como bloqueo local verificable, no como éxito.
