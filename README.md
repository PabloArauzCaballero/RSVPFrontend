# RSVP Frontend

Monorepo Yarn 4 para la experiencia universal (Expo Router) y las rutas SEO (Next.js).

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
