#!/bin/sh
# A6/B1 · Real nginx (the pinned image of Dockerfile.universal) with the rendered nginx-spa.conf: config test plus the headers
# each kind of path must carry. L19 · Also the /api/ proxy through Docker's DNS (prefix, query, Host, visitor address,
# cookie path) and an upstream that does not resolve: nginx must start, serve the SPA and answer 502 on /api/. L20 · With
# the upstream down, guest credential paths under /api/ leave nothing in the container output; other /api/ paths do.
# Own container and network names, loopback ports; removes everything. Used by CI (job deploy-config).
#   sh deploy/nginx-check.sh
set -eu
IMAGE=$(sed -n 's/^FROM \(nginx:[^ ]*\).*/\1/p' deploy/Dockerfile.universal)
NAME="rsvp-nginx-check-$$"
NET="$NAME-net"
WORK=$(mktemp -d)
PORT=${NGINX_CHECK_PORT:-18089}
DNS_PORT=$((PORT + 1))
NODNS_PORT=$((PORT + 2))
# shellcheck disable=SC2329 # invoked by the EXIT trap
cleanup() {
  docker rm -f "$NAME" "$NAME-api" "$NAME-dns" "$NAME-nodns" >/dev/null 2>&1 || true
  docker network rm "$NET" >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT
mkdir -p "$WORK/html/_expo"
printf '<!doctype html><title>app</title>%02000d' 0 > "$WORK/html/index.html"
start() { # container port upstream-url [docker run options]
  name=$1; port=$2; upstream=$3; shift 3
  sh deploy/render-nginx-spa.sh "$upstream" deploy/nginx-spa.conf > "$WORK/$name.conf"
  sh deploy/render-nginx-spa.sh "$upstream" deploy/nginx-api-proxy.conf > "$WORK/$name-api-proxy.conf"
  docker run -d --name "$name" "$@" -p "127.0.0.1:$port:80" \
    -v "$WORK/$name.conf:/etc/nginx/conf.d/default.conf:ro" \
    -v "$PWD/deploy/nginx-security-headers.conf:/etc/nginx/snippets/security-headers.conf:ro" \
    -v "$WORK/$name-api-proxy.conf:/etc/nginx/snippets/api-proxy.conf:ro" \
    -v "$WORK/html:/usr/share/nginx/html:ro" "$IMAGE" >/dev/null
  i=0; until curl -fs "http://127.0.0.1:$port/health" >/dev/null; do
    i=$((i+1)); [ "$i" -lt 30 ] || { echo "FAIL $name did not start" >&2; docker logs "$name" >&2; exit 1; }; sleep 1
  done
}
# The header and log checks use an IP upstream on the default bridge (no DNS needed).
start "$NAME" "$PORT" https://127.0.0.1:9
docker exec "$NAME" nginx -t

fail=0
expect() { # path header-regex
  if ! curl -s -D - -o /dev/null -H 'Accept-Encoding: gzip' "http://127.0.0.1:$PORT$1" | tr -d '\r' | grep -Eiq "$2"; then
    echo "FAIL $1: missing /$2/" >&2; fail=1
  fi
}
absent() {
  if curl -s -D - -o /dev/null "http://127.0.0.1:$PORT$1" | tr -d '\r' | grep -Eiq "$2"; then echo "FAIL $1: unexpected /$2/" >&2; fail=1; fi
}
for p in / /index.html /rsvp/token-123 /c/boda/rsvp/token-123 /c/boda/regalos/ref-123; do
  expect "$p" '^x-content-type-options: nosniff$'
  expect "$p" '^x-frame-options: DENY$'
  expect "$p" '^strict-transport-security: max-age='
  expect "$p" '^content-security-policy-report-only: '
  expect "$p" '^permissions-policy: '
done
expect / '^referrer-policy: strict-origin-when-cross-origin$'
expect /rsvp/token-123 '^referrer-policy: no-referrer$'
expect /c/boda/rsvp/token-123 '^referrer-policy: no-referrer$'
expect /rsvp/token-123 '^cache-control: no-store$'
expect / '^content-encoding: gzip$'
absent / '^server: nginx/'
absent /rsvp/token-123 '^referrer-policy: strict-origin'
expect /c/boda/regalos/ref-123 '^referrer-policy: no-referrer$'
expect /c/boda/regalos/ref-123 '^cache-control: no-store$'
# A13 · The access log never carries a guest credential, a query string or the client address.
curl -s -o /dev/null "http://127.0.0.1:$PORT/restablecer?token=query-secret-123"
curl -s -o /dev/null "http://127.0.0.1:$PORT/proveedores"
curl -s -o /dev/null "http://127.0.0.1:$PORT/api/rsvp/token-api-123"
curl -s -o /dev/null "http://127.0.0.1:$PORT/%72svp/token-encoded-123"
LOG=$(docker logs "$NAME" 2>/dev/null)
for secret in token-123 ref-123 query-secret-123 token-api-123 token-encoded-123 172.17.; do
  if printf %s "$LOG" | grep -Fq "$secret"; then echo "FAIL access log contains $secret" >&2; fail=1; fi
done
printf %s "$LOG" | grep -Fq ' GET /[guest-credential-path]' || { echo "FAIL access log: guest paths not redacted" >&2; fail=1; }
printf %s "$LOG" | grep -Fq ' GET /proveedores' || { echo "FAIL access log: ordinary paths must stay visible" >&2; fail=1; }
# The log shows the path the client asked for, not the SPA fallback every page ends in.
printf %s "$LOG" | grep -Fq ' GET /restablecer' || { echo "FAIL access log: ordinary paths must be logged without their query" >&2; fail=1; }
printf %s "$LOG" | grep -Fq ' GET /[unlogged-path]' || { echo "FAIL access log: encoded paths must become a marker" >&2; fail=1; }

# L19 · The proxy through Docker's embedded DNS (user network, as in Coolify), against a stub gateway that echoes what it got.
docker network create "$NET" >/dev/null
cat > "$WORK/api.conf" <<'STUB'
server {
  listen 8080;
  location / {
    add_header Set-Cookie "rsvp_refresh=x; Path=/identity/auth; HttpOnly" always;
    return 200 "uri=$request_uri host=$http_host xff=$http_x_forwarded_for\n";
  }
}
STUB
docker run -d --name "$NAME-api" --network "$NET" -v "$WORK/api.conf:/etc/nginx/conf.d/default.conf:ro" "$IMAGE" >/dev/null
start "$NAME-dns" "$DNS_PORT" "http://$NAME-api:8080/base" --network "$NET"
# curl reaches nginx from a private Docker address, trusted like Traefik (B1): the right-most entry is the visitor and the
# gateway gets that single value, never the client's own list.
RESP=$(curl -s -D - -H 'X-Forwarded-For: 198.51.100.7, 203.0.113.9' "http://127.0.0.1:$DNS_PORT/api/identity/auth/login?next=%2Fx&a=1" | tr -d '\r')
printf %s "$RESP" | grep -Fxq "uri=/base/identity/auth/login?next=%2Fx&a=1 host=$NAME-api:8080 xff=203.0.113.9" \
  || { echo "FAIL /api/ proxy: prefix, base path, query, Host or visitor address changed: $RESP" >&2; fail=1; }
printf %s "$RESP" | grep -Eiq '^set-cookie: rsvp_refresh=x; Path=/api/identity/auth;' \
  || { echo "FAIL /api/ proxy: auth cookie not first-party" >&2; fail=1; }
# L19 · An upstream that does not resolve (the incident in TEST: one DNS failure at boot killed the container).
start "$NAME-nodns" "$NODNS_PORT" https://rsvp-api.l19-check.invalid --network "$NET"
[ "$(docker inspect -f '{{.State.Running}}' "$NAME-nodns")" = true ] || { echo "FAIL nginx died on an unresolvable upstream" >&2; fail=1; }
[ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$NODNS_PORT/")" = 200 ] || { echo "FAIL SPA not served without DNS" >&2; fail=1; }
[ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$NODNS_PORT/api/x")" = 502 ] || { echo "FAIL /api/ must answer 502 without DNS" >&2; fail=1; }
# L20 · With the upstream down (connection refused on $NAME, DNS failure on $NAME-nodns) nginx writes an error log line
# with the request line. Guest credential paths under /api/ must not reach the container output (stdout or stderr);
# any other /api/ path keeps its error line (observability).
for c in "$NAME:$PORT" "$NAME-nodns:$NODNS_PORT"; do
  cname=${c%:*}; cport=${c##*:}
  for p in /api/rsvp/TOKENSECRETO123 /api/%72svp/TOKENCODIFICADO123 /api/RSVP/TOKENMAYUS123 \
    /api/c/boda/rsvp/TOKENCELEBRACION123 /api/c/boda/regalos/REFSECRETO123 /api/l20-visible; do
    curl -s -o /dev/null "http://127.0.0.1:$cport$p"
  done
  OUT=$(docker logs "$cname" 2>&1)
  for secret in TOKENSECRETO123 TOKENCODIFICADO123 TOKENMAYUS123 TOKENCELEBRACION123 REFSECRETO123; do
    if printf %s "$OUT" | grep -Fq "$secret"; then echo "FAIL $cname: container output contains $secret" >&2; fail=1; fi
  done
  ERR=$(docker logs "$cname" 2>&1 >/dev/null)
  printf %s "$ERR" | grep -F 'request: "GET /api/l20-visible HTTP/1.1"' | grep -Eq 'connect\(\) failed|could not be resolved' \
    || { echo "FAIL $cname: error log lost the upstream failure of an ordinary /api/ path" >&2; fail=1; }
done
# The upstream URL is written into nginx directives: anything beyond host[:port] and plain path segments is refused.
for bad in /api 'https://api.example.com/a?b=1' 'https://api.example.com/a b' 'https://api.example.com/a;b' 'https://api.exa{mple}.com'; do
  if sh deploy/render-nginx-spa.sh "$bad" deploy/nginx-spa.conf >/dev/null 2>&1; then echo "FAIL render accepted $bad" >&2; fail=1; fi
done
[ "$fail" -eq 0 ] && echo "nginx-check: config valid, headers, gzip, redacted access log, /api/ proxy, DNS failure and guest-free error log as expected"
exit "$fail"
