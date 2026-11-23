#!/bin/sh
# A6/B1 · Real nginx (the pinned image of Dockerfile.universal) with the rendered nginx-spa.conf: config test plus the headers
# each kind of path must carry. Own container name, loopback port; removes the container. Used by CI (job deploy-config).
#   sh deploy/nginx-check.sh
set -eu
IMAGE=$(sed -n 's/^FROM \(nginx:[^ ]*\).*/\1/p' deploy/Dockerfile.universal)
NAME="rsvp-nginx-check-$$"
WORK=$(mktemp -d)
PORT=${NGINX_CHECK_PORT:-18089}
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true; rm -rf "$WORK"' EXIT
# An IP upstream: nginx resolves proxy_pass hosts at load time and the check must not depend on DNS.
# shellcheck disable=SC2016 # the literal ${RSVP_API_UPSTREAM} is envsubst's variable list, same as Dockerfile.universal
RSVP_API_UPSTREAM=https://127.0.0.1:9 envsubst '${RSVP_API_UPSTREAM}' < deploy/nginx-spa.conf > "$WORK/default.conf"
mkdir -p "$WORK/html/_expo"
printf '<!doctype html><title>app</title>%02000d' 0 > "$WORK/html/index.html"
docker run -d --name "$NAME" -p "127.0.0.1:$PORT:80" \
  -v "$WORK/default.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$PWD/deploy/nginx-security-headers.conf:/etc/nginx/snippets/security-headers.conf:ro" \
  -v "$WORK/html:/usr/share/nginx/html:ro" "$IMAGE" >/dev/null
docker exec "$NAME" nginx -t
i=0; until curl -fs "http://127.0.0.1:$PORT/health" >/dev/null; do i=$((i+1)); [ "$i" -lt 30 ] || exit 1; sleep 1; done

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
[ "$fail" -eq 0 ] && echo "nginx-check: config valid, headers, gzip and redacted access log as expected"
exit "$fail"
