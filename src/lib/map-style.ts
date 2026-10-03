import { layers, namedFlavor } from "@protomaps/basemaps";
import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

/**
 * The lean package (scripts/map/lean_filter.py) is read as three sources over the same PMTiles file:
 * landuse exists only up to z12, buildings only at z15, everything else up to z14. MapLibre overzooms each
 * source past its maxzoom, so a z17 view draws z12 forests, z14 roads and z15 buildings together.
 */
const SOURCE_BY_LAYER: Record<string, "ctx" | "base" | "detail"> = { landuse: "ctx", buildings: "detail" };

/** Glyph folders without spaces keep MapLibre's glyph URLs identical to the precached paths. */
const FONTS = { regular: "noto-sans-regular", bold: "noto-sans-medium", italic: "noto-sans-italic" } as const;

const sourceLayerOf = (layer: LayerSpecification) =>
  "source-layer" in layer && typeof layer["source-layer"] === "string" ? layer["source-layer"] : null;

const usesIcons = (layer: LayerSpecification) => layer.type === "symbol" && layer.layout?.["icon-image"] !== undefined;

export function buildMapStyle(fileKey: string): StyleSpecification {
  const tiles = [`pmtiles://${fileKey}/{z}/{x}/{y}`];
  const basemap = layers("base", { ...namedFlavor("dark"), ...FONTS }, { lang: "pl" })
    // No sprite ships offline: POIs are not in the package and icon layers would request images.
    .filter((layer) => sourceLayerOf(layer) !== "pois" && !usesIcons(layer))
    .map((layer) => {
      const sourceLayer = sourceLayerOf(layer);
      if (sourceLayer === null) return layer;
      return { ...layer, source: SOURCE_BY_LAYER[sourceLayer] ?? "base" } as LayerSpecification;
    });

  return {
    version: 8,
    glyphs: "/map/fonts/{fontstack}/{range}.pbf",
    sources: {
      ctx: { type: "vector", tiles, maxzoom: 12, attribution: "© OpenStreetMap, Protomaps" },
      base: { type: "vector", tiles, maxzoom: 14 },
      detail: { type: "vector", tiles, minzoom: 15, maxzoom: 15 },
    },
    layers: basemap,
  };
}
