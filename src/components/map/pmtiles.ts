import { addProtocol, setWorkerUrl } from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";

import { PALETTE_TOKENS, type MapPalette } from "@/lib/map-style";

// MapLibre 6 resolves its worker from a runtime URL Vite cannot see; hand it the worker Vite bundled.
setWorkerUrl(maplibreWorkerUrl);
/**
 * The one `pmtiles://` protocol for every map view. A second `addProtocol` would replace this instance and
 * drop the files the other view already added, so map components import it from here and never register.
 */
export const protocol = new Protocol();
addProtocol("pmtiles", protocol.tile);

/** The current mode's tokens, so the map follows Preparation or Execution colours without hex values. */
export function readMapPalette(): MapPalette {
  const css = getComputedStyle(document.documentElement);
  const read = (key: keyof MapPalette) => css.getPropertyValue(PALETTE_TOKENS[key]).trim();
  return {
    background: read("background"),
    surface: read("surface"),
    road: read("road"),
    label: read("label"),
    foreground: read("foreground"),
    guidance: read("guidance"),
    safe: read("safe"),
  };
}
