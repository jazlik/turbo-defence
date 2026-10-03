#!/usr/bin/env bash
# Builds the lean evacuation basemap for one region from an official Protomaps daily build.
# usage: scripts/map/build-region.sh <region> <protomaps-build-date YYYYMMDD>
# Needs: pmtiles CLI (go-pmtiles) on PATH or in $PMTILES, Python venv with requirements.txt (see README.md).
set -euo pipefail

region="${1:?region, e.g. malopolska}"
build="${2:?Protomaps build date, e.g. 20261003}"
here="$(cd "$(dirname "$0")" && pwd)"
pmtiles="${PMTILES:-pmtiles}"
python="${PYTHON:-python3}"
out_dir="${here}/../../dist-map"
mkdir -p "${out_dir}"

raw="${out_dir}/${region}-${build}-raw.pmtiles"
lean="${out_dir}/${region}-${build}-lean2.pmtiles"

"${pmtiles}" extract "https://build.protomaps.com/${build}.pmtiles" "${raw}" \
  --region="${here}/regions/${region}.geojson" --maxzoom=15
"${python}" "${here}/lean_filter.py" "${raw}" "${lean}"
"${pmtiles}" verify "${lean}"

bytes="$(wc -c < "${lean}" | tr -d ' ')"
echo "region=${region} build=${build} file=$(basename "${lean}") bytes=${bytes}"
