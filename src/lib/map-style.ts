import { layers, namedFlavor, type Flavor } from "@protomaps/basemaps";
import type { LayerSpecification, LineLayerSpecification, StyleSpecification } from "maplibre-gl";

type LineWidth = NonNullable<LineLayerSpecification["paint"]>["line-width"];

/**
 * The lean package (scripts/map/lean_filter.py) is read as three sources over the same PMTiles file:
 * landuse exists only up to z12, buildings only at z15, everything else up to z14. MapLibre overzooms each
 * source past its maxzoom, so a z17 view draws z12 forests, z14 roads and z15 buildings together.
 */
const SOURCE_BY_LAYER: Record<string, "ctx" | "base" | "detail"> = { landuse: "ctx", buildings: "detail" };

/** Glyph folders without spaces keep MapLibre's glyph URLs identical to the precached paths (review F5). */
const FONTS = { regular: "noto-sans-regular", bold: "noto-sans-medium", italic: "noto-sans-italic" } as const;

/** Execution Mode tokens the map is drawn with — read from CSS custom properties, never hard-coded. */
export interface MapPalette {
  background: string;
  surface: string;
  road: string;
  label: string;
  foreground: string;
  guidance: string;
  safe: string;
}

export const PALETTE_TOKENS: Record<keyof MapPalette, string> = {
  background: "--background",
  // Buildings: one surface level above the background, still darker than roads (--secondary-pressed).
  surface: "--surface-secondary",
  road: "--secondary-pressed",
  label: "--muted-foreground",
  foreground: "--foreground",
  guidance: "--guidance",
  safe: "--safe",
};

/** The stock dark flavor is too dim on the Execution background: roads and labels move to token colours. */
function executionFlavor(palette: MapPalette): Flavor {
  const roads = [
    "other",
    "minor_service",
    "minor_a",
    "minor_b",
    "link",
    "major",
    "highway",
    "bridges_other",
    "bridges_minor",
    "bridges_link",
    "bridges_major",
    "bridges_highway",
  ] as const;
  const casings = [
    "minor_service_casing",
    "minor_casing",
    "link_casing",
    "major_casing_late",
    "highway_casing_late",
    "major_casing_early",
    "highway_casing_early",
  ] as const;
  const labels = ["roads_label_minor", "roads_label_major", "subplace_label", "city_label", "address_label"] as const;
  const halos = [
    "roads_label_minor_halo",
    "roads_label_major_halo",
    "subplace_label_halo",
    "city_label_halo",
    "address_label_halo",
  ] as const;
  const flavor: Flavor = {
    ...namedFlavor("dark"),
    ...FONTS,
    background: palette.background,
    earth: palette.background,
  };
  flavor.buildings = palette.surface;
  for (const key of roads) flavor[key] = palette.road;
  for (const key of casings) flavor[key] = palette.background;
  for (const key of labels) flavor[key] = palette.label;
  for (const key of halos) flavor[key] = palette.background;
  return flavor;
}

const sourceLayerOf = (layer: LayerSpecification) =>
  "source-layer" in layer && typeof layer["source-layer"] === "string" ? layer["source-layer"] : null;

const usesIcons = (layer: LayerSpecification) => layer.type === "symbol" && layer.layout?.["icon-image"] !== undefined;

const ROUND_LINE = { "line-cap": "round", "line-join": "round" } as const;
// Widths grow with zoom like in walking navigation: readable at z14, a broad band at z18.
const ROUTE_WIDTH: LineWidth = ["interpolate", ["exponential", 1.5], ["zoom"], 13, 4, 16, 9, 18, 16];
const ROUTE_CASING_WIDTH: LineWidth = ["interpolate", ["exponential", 1.5], ["zoom"], 13, 7, 16, 14, 18, 23];

export function buildMapStyle(fileKey: string, palette: MapPalette): StyleSpecification {
  const tiles = [`pmtiles://${fileKey}/{z}/{x}/{y}`];
  const basemap = layers("base", executionFlavor(palette), { lang: "pl" })
    // No sprite ships offline: POIs are not in the package and icon layers would request images.
    .filter((layer) => sourceLayerOf(layer) !== "pois" && !usesIcons(layer))
    .map((layer) => {
      const sourceLayer = sourceLayerOf(layer);
      if (sourceLayer === null) return layer;
      return { ...layer, source: SOURCE_BY_LAYER[sourceLayer] ?? "base" } as LayerSpecification;
    });

  const empty = { type: "FeatureCollection" as const, features: [] };
  return {
    version: 8,
    glyphs: "/map/fonts/{fontstack}/{range}.pbf",
    sources: {
      ctx: { type: "vector", tiles, maxzoom: 12, attribution: "© OpenStreetMap, Protomaps" },
      base: { type: "vector", tiles, maxzoom: 14 },
      detail: { type: "vector", tiles, minzoom: 15, maxzoom: 15 },
      route: { type: "geojson", data: empty },
      "route-walked": { type: "geojson", data: empty },
      destination: { type: "geojson", data: empty },
      user: { type: "geojson", data: empty },
    },
    layers: [
      ...basemap,
      // Whole route, faint: the part already walked stays as context without competing with the way ahead.
      {
        id: "route-walked",
        type: "line",
        source: "route-walked",
        layout: ROUND_LINE,
        paint: { "line-color": palette.guidance, "line-opacity": 0.3, "line-width": ROUTE_WIDTH },
      },
      // The way ahead, navigation-style: dark casing + wide guidance line, on top of streets and labels.
      {
        id: "route-casing",
        type: "line",
        source: "route",
        layout: ROUND_LINE,
        paint: { "line-color": palette.background, "line-width": ROUTE_CASING_WIDTH },
      },
      {
        id: "route",
        type: "line",
        source: "route",
        layout: ROUND_LINE,
        paint: { "line-color": palette.guidance, "line-width": ROUTE_WIDTH },
      },
      {
        id: "destination",
        type: "circle",
        source: "destination",
        paint: {
          "circle-radius": 11,
          "circle-color": palette.safe,
          "circle-stroke-color": palette.background,
          "circle-stroke-width": 3,
        },
      },
      {
        id: "user",
        type: "circle",
        source: "user",
        paint: {
          // Lies flat on the tilted map like a navigation puck.
          "circle-pitch-alignment": "map",
          "circle-radius": 9,
          "circle-color": palette.foreground,
          "circle-stroke-color": palette.background,
          "circle-stroke-width": 3,
          "circle-opacity": ["case", ["get", "stale"], 0.5, 1],
          "circle-stroke-opacity": ["case", ["get", "stale"], 0.5, 1],
        },
      },
    ],
  };
}
