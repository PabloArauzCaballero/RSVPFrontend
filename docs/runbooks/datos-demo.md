# Datos de demostración (Bolivia) para el entorno local

Poblador reproducible para que cualquier pantalla tenga contenido real al evaluar la experiencia. Corre **solo por HTTP a través del gateway** (Kong, `http://localhost:28000`), con cuentas registradas por la API. Es solo para desarrollo local: no lo apuntes a un entorno compartido.

## Requisitos

- Stack local arriba: Postgres (5445), RabbitMQ, Redis, Kong en 28000 y los servicios (identity, celebration, guest, notification, gift, provider). `template-media` y el almacenamiento de objetos no hacen falta, pero sin ellos no hay fotos ni plantillas.
- Cuenta ADMIN `e2e-admin@example.test` / `Correct-horse-9battery` (Identity arrancado con `IDENTITY_BOOTSTRAP_ADMIN_EMAIL=e2e-admin@example.test`; el poblador la registra si falta). Con ella se verifican, rechazan y suspenden proveedores y se decide la moderación, todo por HTTP.
- Provider Catalog con `PROVIDER_ANON_QUOTES=open` para cotizaciones sin sesión.
- Node 22. No necesita instalar nada (usa `fetch`).

## Cómo ejecutarlo

```
node apps/universal/scripts/seed/demo.mjs                  # familia "dbo"
SEED_FAMILY=otra node apps/universal/scripts/seed/demo.mjs # otra familia completa, sin colisiones
API_URL=http://localhost:28000 SEED_RSVP_GAP_MS=2400 ...    # opciones
```

- **Primera corrida de una familia:** unos 130 s (el tope de Kong de 30/min en `/rsvp` obliga a espaciar las ~40 respuestas a 2,4 s). **Re-ejecutarla:** unos 35 s, sin duplicar nada.
- **Idempotente:** cuentas (409 de registro pasa a login), celebraciones por `slug`, invitados por nombre, regalos por título, ofertas por título, leads y reservas de fecha solo si faltan. Las decisiones del anfitrión (aprobar/rechazar reservas de regalo y solicitudes de acompañante) se toman solo en la corrida que crea las respuestas, para no vaciar lo pendiente en las siguientes. Comprobado: dos corridas seguidas dejan exactamente los mismos conteos.
- Cada **familia** (`SEED_FAMILY`) prefija todos los correos (`<familia>.anfitrion.boda@example.com`) y los `slug`.
- Al terminar escribe `apps/universal/scripts/seed/.last-run.json` (gitignorado; ids útiles, cuentas y conteos verificados con GET; **sin tokens**). Los tokens nunca se imprimen.
- Cotizaciones anónimas: el servicio las limita por IP y hora (Retry-After de ~50 min). Por defecto todas las cotizaciones se hacen con sesión de visitante; `SEED_ANON_QUOTE=1` añade una anónima. Cualquier espera de más de 90 s se omite en vez de bloquear la corrida.
- `apps/universal/scripts/seed/review.mjs` recorre las pantallas clave con Chrome real (360/768/1280) sobre estos datos y guarda capturas y un informe; ver la revisión funcional.

## Qué crea (familia `dbo`, contraseña local **`Demo-Bolivia-2026!`**)

Contraseña **solo de desarrollo local** (no es un secreto real). Todos los correos son `@example.com` y los teléfonos `+5917000xxxx`, de prueba.

| Cuenta | Rol | Qué ve |
|---|---|---|
| `dbo.anfitrion.boda@example.com` | HOST | Boda **publicada** "Lucía Flores y Daniel Choque" (slug `dbo-boda-flores-choque`, fecha hoy + 75 días) |
| `dbo.anfitrion.borrador@example.com` | HOST | Cumpleaños **borrador** casi vacío (solo título) |
| `dbo.anfitrion.archivada@example.com` | HOST | Quince años **archivados** |
| `dbo.colaborador.lector@example.com` | HOST (VIEWER de la boda) | Solo lectura en la boda |
| `dbo.planificadora@example.com` | PLANNER | Organización "Ch'aska Eventos (dbo)"; agrega al anfitrión del borrador como miembro |
| `dbo.visitante1..3@example.com` | HOST | Piden cotizaciones a proveedores |
| `dbo.proveedor01..10@example.com` | PROVIDER | Un proveedor cada una (ver abajo) |
| `e2e-admin@example.test` / `Correct-horse-9battery` | ADMIN | Verificación, moderación, catálogos |

**Boda publicada (verificado con GET):** 63 invitados en 15 grupos familiares (60 invitados de la lista más 3 registros públicos sin invitación); 30 confirmaron, 11 no asisten, 22 sin responder; 16 acompañantes; 2 solicitudes de acompañante abiertas (otras se aprobaron/rechazaron); dietas y mensajes; contenido con anfitriones, 2 lugares, historia, itinerario de 5 pasos, 4 preguntas frecuentes, 3 recomendaciones, traducción parcial a en-US; ajustes en modo RESTRINGIDO; colaborador VIEWER; preferencias de avisos; avisos del anfitrión generados por las respuestas y reservas.
**Regalos:** 17 ítems: 7 catalogados de proveedores verificados (3 comprometidos, 3 con reserva pendiente de revisión, 1 disponible) y 10 externos (5 disponibles tras aprobarlos, 1 con reserva pendiente, 3 propuestos sin aprobar, 1 rechazado). Reservas de invitados: 3 comprometidas, 4 pendientes, 1 rechazada. Precios de Bs 150 a Bs 9.876.543,21 (cifra extrema a propósito) y un título de más de 120 caracteres.
**Proveedores (10):** salón (La Paz, VERIFICADO, PREMIUM), catering (Cochabamba, VERIFICADO, FEATURED), fotografía (Sucre, VERIFICADO), pastelería (Tarija, VERIFICADO), música (El Alto, VERIFICADO), planificación (Santa Cruz, VERIFICADO, PREMIUM), decoración (Santa Cruz, EN VERIFICACIÓN), maquillaje (Oruro, BORRADOR), transporte (Potosí, RECHAZADO con motivo), invitaciones (La Paz, SUSPENDIDO con motivo). 1 a 3 ofertas publicadas cada uno con condiciones de entrega bilingües, agenda con bloqueos, destinos de contacto, configuración de leads, microsite (horarios, redes, dirección con coordenadas). Cada verificado tiene 4 a 5 cotizaciones con sesión (FORM) y 4 clics (REDIRECT) y las reservas de fecha de la boda: confirmadas (salón, catering), rechazada (pastelería), cancelada (música) y pendientes (fotografía x2, planificación).
**Admin:** categoría nueva "Pastelería" (`PASTRY`), ciudad Yacuiba, tipo de evento "Primera comunión"; cola de moderación con aprobadas y rechazadas de ejemplo (la cola ya contiene entradas de pruebas anteriores).

## Usos de SQL

**Ninguno.** Verificar, rechazar y suspender proveedores lo hace el ADMIN por HTTP; la moderación se alimenta sola (guardar microsite y proponer regalos externos); las respuestas de invitados usan el enlace personal (`access-token`) por HTTP. Una corrida directa a Postgres (5445, roles propietarios de `RSVPBackend/infra/postgres/init`) solo haría falta para **retrofechar** leads o métricas, y no se hace (ver límites).

## Qué no se puebla y por qué

- **Galería, portada, plantillas, documentos del proveedor:** dependen de `template-media` y almacenamiento de objetos, que no están levantados (`/media` y `/templates` dan 502/503).
- **Estado "quizá":** el backend solo conoce `CONFIRMED`, `DECLINED` y sin respuesta.
- **Métricas con varios días:** las métricas se cuentan al momento de la siembra; no hay ruta HTTP para retrofechar. Todo cae en el día de hoy.
- **Push y dispositivos:** necesitan un teléfono real y servicios no desplegados.
- **Editar o borrar** invitados, regalos u ofertas: el backend no lo ofrece (ver `docs/progress/evidence/botones-crud-2026-11-06.md`), así que el poblador solo crea.

## Reiniciar la base limpia

Los datos están en el volumen de Postgres. Para empezar de cero (**destruye todo el entorno local**):

```
cd ../RSVPBackend
docker compose -f infra/docker-compose.yml down -v      # borra los volúmenes
docker compose -f infra/docker-compose.yml up -d        # recrea con infra/postgres/init
# reinicia los servicios de host (migran solos con *_AUTO_MIGRATE=true) y Identity con el admin de arranque
node ../RSVPFrontend/apps/universal/scripts/seed/demo.mjs
```

Sin borrar nada, `SEED_FAMILY=otra` crea una segunda familia completa al lado.
