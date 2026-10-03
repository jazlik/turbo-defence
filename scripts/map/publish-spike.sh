#!/usr/bin/env bash
# Phase 1 spike: publish the lean package to R2, fix bucket CORS, verify, and deploy an HTTPS preview for phones.
# Run from the repo root, logged into the Cloudflare account that owns bucket turbo-defence-maps and Worker w-razie-w.
# usage: scripts/map/publish-spike.sh [dist-map/<package>.pmtiles]
set -euo pipefail

file="${1:-dist-map/malopolska-20261003-lean2.pmtiles}"
name="$(basename "${file}")"
bucket="turbo-defence-maps"
url="https://pub-52c8b7e32b42466d9dc408ed80a9241c.r2.dev/${name}"

test -f "${file}" || { echo "Missing ${file} — build it with scripts/map/build-region.sh" >&2; exit 1; }

npx wrangler r2 bucket cors set "${bucket}" --file scripts/map/r2-cors.json --force
npx wrangler r2 object put "${bucket}/${name}" --file "${file}" --remote \
  --content-type application/vnd.pmtiles --cache-control "public, max-age=31536000, immutable"

echo "--- verify ${url}"
curl -sI "${url}" | grep -iE '^HTTP|content-length|accept-ranges|etag'
curl -s -D - -o /dev/null -H "Range: bytes=0-16383" "${url}" | grep -iE '^HTTP|content-range'
for origin in https://w-razie-w.jzogala.workers.dev http://localhost:4321 https://spike-w-razie-w.jzogala.workers.dev; do
  curl -s -D - -o /dev/null -X OPTIONS -H "Origin: ${origin}" -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: range" "${url}" | grep -iE '^HTTP|access-control-allow-origin'
done
curl -s -D - -o /dev/null -H "Origin: http://localhost:4321" -H "Range: bytes=0-1" "${url}" | grep -i 'access-control-expose-headers'

echo "--- preview deploy (https://spike-w-razie-w.jzogala.workers.dev/spike-mapa)"
npm run build
npx wrangler versions upload --preview-alias spike
