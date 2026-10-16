# RSVP Frontend

Monorepo Yarn 4 para la experiencia universal (Expo Router) y las rutas SEO (Next.js).

Para trabajar un carril, consulta [las instrucciones obligatorias](AGENTS.md), [las skills](.agents/skills/rsvp-frontend-lane/SKILL.md) y [las convenciones de código](docs/engineering/convenciones.md).
Codex y Gemini CLI descubren las skills compartidas en `.agents/skills/`; Claude Code usa las entradas de `.claude/skills/`. `CLAUDE.md` y `GEMINI.md` importan el mismo `AGENTS.md`. La [política de skills](docs/engineering/skills.md) exige recarga en cada prompt y documenta las 50 skills de marketing y las nuevas skills de diseño.

La [replanificación vigente](docs/plan/revision-vertical-slice-2026-10-16.md) define el primer slice de los 28 carriles y los gates de UX/UI y animación. CodeGraph está fijado en el proyecto: `corepack yarn graph:init` crea el índice local y `corepack yarn graph:status` comprueba su estado.

## Requisitos

- Node `24.18.1` (ver `.nvmrc`)
- Corepack habilitado: `corepack enable`
- `GITHUB_TOKEN` con permiso `read:packages` si se instala `@rsvp/contracts`

## Inicio

```sh
yarn install
yarn workspace @rsvp/universal start
yarn workspace @rsvp/seo-web dev
yarn verify
```

`@rsvp/contracts` se declara como dependencia opcional hasta que el backend publique la primera versión en GitHub Packages; el resto del monorepo no depende de que exista para compilar.
