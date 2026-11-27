# Estabilidad de miniaturas y tope de polling en la galería del anfitrión

Validación del 27 de noviembre de 2026 sobre `chore/deploy-contabo-coolify` en `d6d4aef8` (rama `fix/gallery-processing-polling-and-flicker`).

## Causa raíz observada en TEST

Cuando una foto quedaba detenida en `status: "PROCESSING"` en el servidor (complemento backend en `RSVPBackend` PR #172):

1. `useMediaAssets` seguía consultando `GET /media/celebrations/{id}/assets` cada `2 000 ms` indefinidamente, sin backoff ni tope.
2. El backend firma URLs presignadas nuevas (`X-Amz-Signature`) en cada respuesta, por lo que `<Image source={{ uri: asset.variants.thumb }} />` recibía una URL distinta cada 2 segundos y el navegador recargaba en bucle todas las fotos ya procesadas (`PROCESSED`).
3. `GalleryEditorScreen` no ofrecía acciones para reintentar la comprobación ni eliminar un archivo atascado en `PROCESSING`.

## Solución de largo plazo

- **`packages/query-hooks/src/celebration/index.ts`**:
  - `structuralSharing` conserva estable la URL ya cargada de cada variante de un asset `PROCESSED` mientras no cambie su ruta de objeto (`origin + pathname`) dentro de una ventana segura (`5 min`), evitando recargas y parpadeos de las fotos ya listas durante cualquier refetch o polling.
  - `useMediaAssets` mantiene polling rápido (`2 s`) el primer minuto, aplica backoff a `5 s` entre 1 y 3 minutos y se detiene automáticamente al superar `MEDIA_PROCESSING_STALE_MS` (`3 min`), usando `createdAt` del servidor cuando está presente o el instante de observación local. Si se sube una foto nueva mientras otra antigua sigue atascada, se toma la edad mínima para acompañar la nueva subida.
- **`apps/universal/src/host/gallery-editor.tsx`** y **`packages/i18n/locales/{es-BO,en-US}/host.ts`**:
  - Para un asset en `PROCESSING` que superó el umbral, muestra aviso claro (`host.gallery.processingSlow`) junto a los botones **Comprobar de nuevo / Check again** y **Eliminar / Delete** (con diálogo de confirmación `ConfirmDialog`).

## Verificaciones observadas

| Verificación | Resultado |
| --- | --- |
| `node scripts/validate-harness.mjs` | 28 carriles, 61 skills y recarga por prompt válidos, salida `0` |
| `corepack yarn workspace @rsvp/contracts check:generated` | 8 contratos verificados (`RSVPBackend@68c2b25b8e9c`), salida `0` |
| `corepack yarn lint:code` | Limpio, salida `0` |
| `corepack yarn workspace @rsvp/i18n typecheck`, `@rsvp/query-hooks typecheck`, `@rsvp/universal typecheck` | Limpios (incluido `contract-conformance.ts`), salida `0` |
| `corepack yarn workspace @rsvp/i18n test` | 3 archivos, 16 pruebas, salida `0` |
| `corepack yarn workspace @rsvp/query-hooks test` | 15 archivos, 151 pruebas (incluye regresiones de estabilidad de URLs presignadas y tope de polling en `resource-refresh.test.tsx`), salida `0` |
| `corepack yarn workspace @rsvp/universal test` | 61 archivos, 727 pruebas (incluye regresión de aviso stale + Comprobar de nuevo + Eliminar con confirmación en `host.test.tsx`), salida `0` |
| `corepack yarn workspace @rsvp/universal build --clear` | Exportación web (`web-build`), salida `0` |
| Playwright con Chrome `158.0.8127.88` sobre Expo web local conectado al gateway real de QA en `/editor/galeria` con asset real atascado en `PROCESSING` | 12 combinaciones (`360`, `768` y `1280` px × claro y oscuro × `es-BO` y `en-US`), todas `APROBADO`, salida `0`. Comprobados: `0` llamadas de polling automático en `4.5 s`, botones **Comprobar de nuevo / Check again** y **Eliminar / Delete** visibles, `src` de las fotos `PROCESSED` idéntico tras refresco manual pese a la rotación real de `X-Amz-Signature` en el servidor, y `axe` con `0` violaciones. Capturas de QA archivadas fuera de Git; credenciales fuera del informe y de Git |
| `gitleaks stdin` sobre el diff de la rama | `0` secretos, salida `0` |

## Nivel alcanzado, límites y reversión

- **Nivel:** `VERIFIED` en Expo web (`@rsvp/universal` en Chrome real contra el gateway real de QA en `es-BO` y `en-US`).
- **Fuera de alcance local:** binarios nativos iOS/Android (se compilan por EAS; el cambio usa únicamente hooks React Query y primitivas estándar de React Native ya compartidas).
- **Reversión:** revertir este PR en frontend; sin cambios de contrato ni migraciones.
