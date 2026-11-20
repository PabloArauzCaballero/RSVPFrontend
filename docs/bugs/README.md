# `bugs/catalogo` (frontend): puntero al catálogo canónico

El catálogo de bugs de RSVP es **uno solo, para backend y frontend**. Vive en la rama
`bugs/catalogo` del repo **RSVPBackend**, en la carpeta `docs/bugs/`.

**Regla obligatoria:** antes de planificar, escribir código, revisar o mergear en RSVPFrontend, hay
que consultar:

```sh
gh api repos/PabloArauzCaballero/RSVPBackend/contents/docs/bugs/CATALOGO.md?ref=bugs/catalogo -H "Accept: application/vnd.github.raw"
gh api repos/PabloArauzCaballero/RSVPBackend/contents/docs/bugs/PUNTOS-FUNDAMENTALES.md?ref=bugs/catalogo -H "Accept: application/vnd.github.raw"
gh api repos/PabloArauzCaballero/RSVPBackend/contents/docs/bugs/CONTRATOS.md?ref=bugs/catalogo -H "Accept: application/vnd.github.raw"
```

Si ya tienes el repo del backend clonado al lado, también sirve `git -C ../RSVPBackend show origin/bugs/catalogo:docs/bugs/CATALOGO.md`.

- Los bugs del frontend llevan el prefijo «FE» en la columna de repo del catálogo.
- La copia de los contratos del frontend es `packages/contracts`, que tiene que coincidir con el backend (PF-6, bug M8).
- No se agregan bugs en esta rama: se agregan en el catálogo canónico.
