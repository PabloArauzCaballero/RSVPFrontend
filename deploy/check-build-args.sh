#!/bin/sh
# M9 · Build arguments are baked into the bundle. An empty or relative value used to produce relative canonical, Open Graph,
# sitemap and invitation URLs without any warning. Every name given must hold an absolute http(s) origin or URL without a
# trailing slash; otherwise the image build stops here and names the argument (values are public, but only names are printed).
#   sh deploy/check-build-args.sh EXPO_PUBLIC_API_URL EXPO_PUBLIC_SITE_URL ...
set -eu
failed=0
for name in "$@"; do
  value=$(printenv "$name" || true)
  case "$value" in
    "") echo "build arg $name is empty: set it as a buildtime variable in Coolify" >&2; failed=1 ;;
    *[[:space:]]*) echo "build arg $name contains whitespace" >&2; failed=1 ;;
    */) echo "build arg $name must not end with /" >&2; failed=1 ;;
    http://?*|https://?*) ;;
    *) echo "build arg $name must be an absolute http(s) URL" >&2; failed=1 ;;
  esac
done
exit "$failed"
