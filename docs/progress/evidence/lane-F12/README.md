## REQ-F12-02/05/06 · 2026-11-05

Pruebas nuevas en `apps/universal/test/host-requirements.test.tsx`:
- F12-02 ida y vuelta de template (A→B→A): solo viajan `{templateId}` en dos PUT, ningún PATCH, y el `content` es idéntico al final.
- F12-05 despublicar (nada sale hasta confirmar; el motivo opcional y `If-Match` viajan; cancelar no envía) y archivar (aviso de que es definitivo, luego POST `/archive`).
- F12-06 copiar enlace: `navigator.clipboard.writeText` recibe la URL pública y se muestra "Enlace copiado". Solo la ruta web; `Share` nativo no probado.
Resultado: PASS en vitest (universal 148 verdes). La tarjeta de WhatsApp sigue siendo maqueta, no el Open Graph real.
