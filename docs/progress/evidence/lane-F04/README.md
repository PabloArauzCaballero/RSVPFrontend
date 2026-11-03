# Evidencia F04 · API client y hooks (2026-11-03)

| REQ | Estado | Comando / artefacto | Resultado |
|---|---|---|---|
| REQ-F04-01 | PASS (contra specs vendorizados) / BLOCKED-EXTERNAL (paquete publicado) | `packages/contracts` + `api-client/src/contract.ts` + `query-hooks/src/celebration/contract-conformance.ts`; `api-client/test/contract.test.ts` | Rutas, parametros, query, body y respuesta tipados desde OpenAPI. Prueba negativa ejecutada: renombrar `/publish-check` en el spec y regenerar => `tsc` falla (TS2345, ver neg.txt abajo); restaurado y verde. Tipos manuales de celebracion/template/media: enums derivados y campos verificados contra el contrato en compilacion (agregar un campo inventado falla). Specs de guests/gifts/providers/notifications del backend no declaran cuerpos ni respuestas: ahi solo se tipan las rutas. |
| REQ-F04-02 | PASS (cliente) / FAIL en la app | `client.test.ts` (401 -> refresh unico -> reintento) | En `apps/universal/src/platform/providers.tsx` el refresh es de F05 (otro agente); no se verifico integrado. |
| REQ-F04-03 | PARTIAL | test x-correlation-id; `RSVPBackend/infra/kong/kong.yml:77-88` | Cabecera enviada y Kong la usa/expone; la traza real en backend no se verifico (BLOCKED-EXTERNAL: gateway no levantado). |
| REQ-F04-04 | PASS (rutas y comportamiento) | `query-hooks/test/domain-hooks.test.tsx` (11 tests) | Celebracion/template/media ya existian; ahora guest (3), gift (4), provider (7), notification (3) con rutas con prefijo de gateway tomadas del contrato; payloads genericos por falta de esquemas. |
| REQ-F04-05 | PASS | `policy.ts`, `keys.ts`, `invalidation.ts` + tests de invalidacion (spy sobre invalidateQueries) | Politica por dominio centralizada; nuevas claves `guestsChanged`, `provider.calendar`. |
| REQ-F04-06 | PARTIAL | tests por 401/403/409/422 en hooks de guest y gift (`rejects.toBeInstanceOf`) | Tipos de error y mapeo probados; tratamiento visual de 401 en la UI no existe. MSW no esta instalado (se usa fetch simulado). |

neg.txt (contrato roto): `test/contract.test.ts(14,77): error TS2345: Argument of type '"/celebrations/{celebrationId}/publish-check"' is not assignable to parameter of type 'PathsWith<paths, "get">'.`

## No cubierto
Migrar `celebrationApi` al cliente de contrato (usa rutas string); MSW; cobertura 85 %.
