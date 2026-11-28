#!/usr/bin/env bash
# Rebuilds the F6 screenshots on Linux. Run from the repository root:
#   CHROMIUM_PATH=/usr/bin/google-chrome bash docs/progress/evidence/plantillas-f6/harness/build.sh
# 1) bundles entry.tsx with esbuild, 2) writes a stand-in photo (a mid-grey gradient, the hardest case for the veil is covered by the unit tests with black and white),
# 3) runs shoot.mjs, which writes the PNGs next to this folder and prints the requests made before any tap (must be 0 to the network).
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
export HARNESS_DIR="${HARNESS_DIR:-$(mktemp -d)}"
node_modules/.bin/esbuild "$here/entry.tsx" --bundle --outfile="$HARNESS_DIR/bundle.js" --jsx=automatic --define:process.env.NODE_ENV='"production"' --loader:.css=empty >/dev/null
node --input-type=module - "$HARNESS_DIR" <<'JS'
import sharp from "sharp";
const [dir] = process.argv.slice(2);
const w = 1600, h = 900, raw = Buffer.alloc(w * h * 3);
for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) { const i = (y * w + x) * 3; raw[i] = 90 + Math.floor(80 * x / w); raw[i + 1] = 100 + Math.floor(60 * y / h); raw[i + 2] = 120; }
const image = sharp(raw, { raw: { width: w, height: h, channels: 3 } });
await image.clone().webp().toFile(`${dir}/bg.webp`);
await image.clone().avif().toFile(`${dir}/bg.avif`);
JS
node "$here/shoot.mjs" "$here/.."
