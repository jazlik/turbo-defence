import { useEffect, useRef, useState } from "react";
import { addProtocol, Map as MapLibreMap, setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { FileSource, PMTiles, Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";

import { distanceMeters } from "@/lib/geo";
import { buildMapStyle, PALETTE_TOKENS, type MapPalette } from "@/lib/map-style";
import { openMapFile, type MapPackageState } from "@/lib/services/map-storage";
import type { Coordinates, Destination, SavedRoute } from "@/types";

// MapLibre 6 resolves its worker from a runtime URL Vite cannot see; hand it the worker Vite bundled.
setWorkerUrl(maplibreWorkerUrl);
const protocol = new Protocol();
addProtocol("pmtiles", protocol.tile);

const FOLLOW_ZOOM = 16.5;
// useHeading updates at sensor rate (S-01 impl-review F8d): move the camera only on a visible change.
const MIN_BEARING_DELTA = 3;
const MIN_MOVE_METERS = 2;
/** The user sits in the lower third of the screen, so most of the view shows the way ahead. */
const FOLLOW_TOP_PADDING_RATIO = 0.35;

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

const pointFeature = (coords: Coordinates, properties: Record<string, unknown> = {}) => ({
  type: "Feature" as const,
  properties,
  geometry: { type: "Point" as const, coordinates: [coords.longitude, coords.latitude] },
});

const turn = (from: number, to: number) => Math.abs(((to - from + 540) % 360) - 180);

export interface ExecutionMapProps {
  mapPackage: MapPackageState;
  route: SavedRoute | null;
  destination: Destination;
  position: Coordinates | null;
  /** null → north-up: no compass and no movement yet. */
  heading: number | null;
  isStale: boolean;
  onError: () => void;
}

/** Secondary guidance view: the same navigation result as the arrow, drawn on the offline package. */
export default function ExecutionMap({
  mapPackage,
  route,
  destination,
  position,
  heading,
  isStale,
  onError,
}: ExecutionMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const camera = useRef<{ bearing: number; center: Coordinates } | null>(null);
  const onErrorRef = useRef(onError);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let cancelled = false;
    void openMapFile(mapPackage).then((file) => {
      if (cancelled || !container.current) return;
      if (!file) {
        onErrorRef.current();
        return;
      }
      protocol.add(new PMTiles(new FileSource(file)));
      const start = position ?? destination.coords;
      const map = new MapLibreMap({
        container: container.current,
        style: buildMapStyle(file.name, readMapPalette()),
        center: [start.longitude, start.latitude],
        zoom: FOLLOW_ZOOM,
        bearing: heading ?? 0,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        attributionControl: { compact: true },
      });
      // Heading drives rotation; a stray two-finger twist must not fight it.
      map.touchZoomRotate.disableRotation();
      map.keyboard.disableRotation();
      map.on("load", () => {
        setLoaded(true);
      });
      mapRef.current = map;
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      camera.current = null;
    };
    // The map is created once per package; position and heading flow in through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapPackage.fileName]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    void map.getSource<GeoJSONSource>("destination")?.setData(pointFeature(destination.coords));
    void map
      .getSource<GeoJSONSource>("route")
      ?.setData(
        route
          ? { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.geometry } }
          : { type: "FeatureCollection", features: [] },
      );
  }, [loaded, route, destination]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    void map
      .getSource<GeoJSONSource>("user")
      ?.setData(position ? pointFeature(position, { stale: isStale }) : { type: "FeatureCollection", features: [] });

    const center = position ?? destination.coords;
    const bearing = heading ?? 0;
    const previous = camera.current;
    if (
      previous &&
      turn(previous.bearing, bearing) < MIN_BEARING_DELTA &&
      distanceMeters(previous.center, center) < MIN_MOVE_METERS
    ) {
      return;
    }
    camera.current = { bearing, center };
    const height = map.getContainer().clientHeight;
    const options = {
      center: [center.longitude, center.latitude] as [number, number],
      bearing,
      padding: { top: Math.round(height * FOLLOW_TOP_PADDING_RATIO), bottom: 0, left: 0, right: 0 },
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) map.jumpTo(options);
    else map.easeTo({ ...options, duration: 160 });
  }, [loaded, position, heading, isStale, destination]);

  return <div ref={container} className="h-full w-full" aria-label="Mapa z trasą do celu" role="img" />;
}
