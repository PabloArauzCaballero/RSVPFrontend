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
for p in / /index.html /rsvp/token-123 /c/boda/rsvp/token-123; do
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
[ "$fail" -eq 0 ] && echo "nginx-check: config valid, headers and gzip as expected"
exit "$fail"
