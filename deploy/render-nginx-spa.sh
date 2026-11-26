#!/bin/sh
# L19 · Renders nginx-spa.conf for one API URL (EXPO_PUBLIC_API_URL): splits it into the origin, which nginx resolves per
# request through a variable, and the base path that replaces /api. Only those two names are substituted, never nginx's own
# variables ($uri, $1, $proxy_host...). Used by Dockerfile.universal and nginx-check.sh. Writes the config to stdout.
# L20 · Renders deploy/nginx-api-proxy.conf (the /api/ proxy snippet) the same way, with the same URL.
#   sh deploy/render-nginx-spa.sh https://api.example.com[/base] deploy/nginx-spa.conf > default.conf
#   sh deploy/render-nginx-spa.sh https://api.example.com[/base] deploy/nginx-api-proxy.conf > snippets/api-proxy.conf
set -eu
[ "$#" -eq 2 ] || { echo "usage: render-nginx-spa.sh <api-url> <template>" >&2; exit 2; }
url=${1%/}
case "$url" in
  http://?*|https://?*) ;;
  *) echo "API upstream must be an absolute http(s) URL" >&2; exit 1 ;;
esac
scheme=${url%%://*}
rest=${url#*://}
authority=${rest%%/*}
base_path=${rest#"$authority"}
# Both values are written into nginx directives: anything beyond a plain host[:port] and path segments is refused.
case "$authority" in
  ""|*[!]A-Za-z0-9.:[-]*) echo "API upstream host is not a plain host[:port]" >&2; exit 1 ;;
esac
case "$base_path" in
  *[!A-Za-z0-9._~/-]*|*//*) echo "API upstream path must be plain segments, without query or fragment" >&2; exit 1 ;;
esac
# shellcheck disable=SC2016 # literal names: envsubst's list of the only variables to replace
RSVP_API_ORIGIN="$scheme://$authority" RSVP_API_BASE_PATH="$base_path" \
  envsubst '${RSVP_API_ORIGIN} ${RSVP_API_BASE_PATH}' < "$2"
