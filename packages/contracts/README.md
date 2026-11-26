# @rsvp/contracts

Copia vendorizada de los OpenAPI 3.1 del backend (`specs/`) y los tipos generados desde ellos (`src/generated/`, con `openapi-typescript` 7.9.1).

## De dónde sale la copia

`backend.lock.json` fija **un commit** del repositorio del backend (`ref`, sha completo) y la versión y el sha256 de cada spec. Ese commit tiene que ser el del backend **desplegado** junto con este frontend. Ningún chequeo lee el árbol de trabajo de un `../RSVPBackend`, así que cambiar de rama en el backend ya no cambia el resultado.

| Comando | Qué comprueba | Dónde corre |
|---|---|---|
| `yarn workspace @rsvp/contracts check:generated` | `specs/` es byte a byte lo que fija `backend.lock.json` y `src/generated/` está al día. Sin red | CI y `test` |
| `yarn workspace @rsvp/contracts check:source` | `backend.lock.json` coincide con el backend en el commit fijado (misma lista de specs, mismos bytes) | CI, con un clon del backend hecho con la deploy key de solo lectura `RSVP_BACKEND_CONTRACTS_DEPLOY_KEY` |
| `yarn workspace @rsvp/contracts generate [--ref <sha\|rama\|tag>]` | Vendoriza los specs de ese commit, reescribe el lock y regenera los tipos | Local, al subir de versión |

El origen de los specs se elige por variables de entorno, sin valores por defecto:
- `RSVP_BACKEND_REPO=<clon del backend>`: lee los objetos git del commit fijado (`git show <sha>:...`), no el árbol de trabajo. El clon tiene que tener el commit (`git fetch`).
- `RSVP_BACKEND_TOKEN` (o `GH_TOKEN`/`GITHUB_TOKEN`): API REST de GitHub, contenido en el commit fijado. Necesita permiso de lectura de contenido del repositorio del backend, que es privado.

Sin ninguna de las dos, `check:source` **falla**. Nunca se salta.

## Subir la versión

1. El cambio de contrato se mergea y se despliega en el backend.
2. `RSVP_BACKEND_REPO=../RSVPBackend yarn workspace @rsvp/contracts generate --ref <sha desplegado>`, o con `RSVP_BACKEND_TOKEN=$(gh auth token)`.
3. `yarn typecheck`. El tipado detecta lo que cambió en el frontend.
4. Un PR con el lock, `specs/` y `src/generated/`.
