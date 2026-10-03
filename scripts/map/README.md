# Offline map package

The app downloads one PMTiles file per region from R2 into OPFS (`src/workers/map-download.worker.ts`) and renders it
with MapLibre (`src/lib/map-style.ts`). The package is a **lean evacuation basemap** cut from the official Protomaps
daily build. It is never part of `dist/`: Workers assets cap files at 25 MiB.

## What the package keeps

| Zoom | Content                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------ |
| ≤ 12 | landuse limited to orientation kinds (forest, wood, park, cemetery, pedestrian, hospital, school…) plus everything below |
| ≤ 14 | roads and paths (incl. footway, sidewalk, crossing, steps), water, earth, place/street labels, country/region boundaries |
| 15   | buildings only, with house numbers (`kind: address`, `addr_housenumber`)                                                 |

Dropped: POIs, farmland/meadow/residential/scrub/grass landuse, municipal boundaries, landuse above z12, buildings
below z15 (the style draws buildings only from the z15 source, so lower-zoom copies were dead weight).

MapLibre reads the same file as three sources (`ctx` maxzoom 12, `base` maxzoom 14, `detail` z15) and overzooms each,
so a z18 view shows z12 forests, z14 roads and z15 buildings together. Verified on desktop in the Phase 1 spike.

## Sizes (Protomaps build 20261003, Małopolska boundary)

| Variant                                                  | Size                                        |
| -------------------------------------------------------- | ------------------------------------------- |
| Standard Protomaps extract, z0–15                        | 245.2 MB                                    |
| Standard without POIs                                    | 234.9 MB                                    |
| Lean v1 (landuse/boundaries filtered, z15 = buildings)   | 111.1 MB                                    |
| **Lean v2 = shipped (v1 + no buildings below z15)**      | **99.1 MB**                                 |
| Lean v2 + attribute whitelist (`--strip-attrs`)          | 97.2 MB — not adopted (−1.9 MB < 5 MB rule) |
| Lean v1 + streams only from z13 (`--streams-minzoom 13`) | 111.1 MB — no effect, not adopted           |

Rule from the plan: an extra cut ships only if it saves ≥ 5 MB without losing roads, paths, steps, crossings,
buildings, house numbers, street names, place names or water.

## Build

Tools (not part of the app build or CI):

- `pmtiles` CLI from [go-pmtiles releases](https://github.com/protomaps/go-pmtiles/releases) (tested 1.31.2), on `PATH` or in `$PMTILES`
- Python 3.9+ with `requirements.txt` (`python3 -m venv .venv && .venv/bin/pip install -r scripts/map/requirements.txt`), in `$PYTHON`

```sh
PMTILES=/path/to/pmtiles PYTHON=.venv/bin/python scripts/map/build-region.sh malopolska 20261003
# → dist-map/malopolska-20261003-lean2.pmtiles (gitignored)
```

Pick a recent build date from https://build-metadata.protomaps.dev/builds.json — Protomaps deletes old daily builds.
`regions/malopolska.geojson` is the voivodeship boundary from OSM via Nominatim (`polygon_threshold=0.005`), © OpenStreetMap contributors, ODbL.

## Upload and CORS (Cloudflare account that owns bucket `turbo-defence-maps`)

```sh
npx wrangler r2 bucket cors set turbo-defence-maps --file scripts/map/r2-cors.json
npx wrangler r2 object put turbo-defence-maps/malopolska-20261003-lean2.pmtiles \
  --file dist-map/malopolska-20261003-lean2.pmtiles --remote \
  --content-type application/vnd.pmtiles --cache-control "public, max-age=31536000, immutable"
```

`--remote` is required: Wrangler 4 writes R2 objects to local storage by default. File names carry the version and
are never overwritten; a new package gets a new name and a new entry in the app's region manifest.

CORS must allow exactly `https://w-razie-w.jzogala.workers.dev` and `http://localhost:4321` (no trailing slash),
methods GET/HEAD, request header `range`, and expose `Content-Range, Content-Length, Accept-Ranges, ETag`.

Check after upload:

```sh
URL=https://pub-52c8b7e32b42466d9dc408ed80a9241c.r2.dev/malopolska-20261003-lean2.pmtiles
curl -sI "$URL"                                                    # 200, Content-Length, Accept-Ranges: bytes
curl -s -D - -o /dev/null -H "Range: bytes=0-16383" "$URL"         # 206, Content-Range
curl -s -D - -o /dev/null -X OPTIONS -H "Origin: http://localhost:4321" \
  -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: range" "$URL"   # 204
```

## Attribution

Map data © OpenStreetMap contributors (ODbL); basemap schema and build © Protomaps. Glyphs in `public/map/fonts/` are
Noto Sans (SIL OFL 1.1, `public/map/fonts/OFL.txt`) from `protomaps/basemaps-assets`.
