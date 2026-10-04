import { useEffect, useRef, useState } from "react";
import { Map as MapLibreMap, type GeoJSONSource } from "maplibre-gl";
import { FileSource, PMTiles } from "pmtiles";

import { protocol, readMapPalette } from "@/components/map/pmtiles";
import { distanceMeters } from "@/lib/geo";
import { buildMapStyle } from "@/lib/map-style";
import { prepareRoute, progressOnRoute, remainingGeometry, type PreparedRoute } from "@/lib/route-progress";
import { openMapFile, type MapPackageState } from "@/lib/services/map-storage";
import type { Coordinates, Destination, SavedRoute } from "@/types";

interface CameraMode {
  zoom: number;
  pitch: number;
  /** Share of the height padded at the top: 0.5 puts the user at about three quarters of the screen height. */
  topPaddingRatio: number;
}

/** Default walking view, like pedestrian navigation in Google/Apple Maps: heading up, moderate tilt, user low. */
const NAVIGATION_CAMERA: CameraMode = { zoom: 17, pitch: 45, topPaddingRatio: 0.5 };
/** Plain fallback — the toggle, or no heading yet: flat, north up, user centred. */
const NORTH_UP_CAMERA: CameraMode = { zoom: 16.5, pitch: 0, topPaddingRatio: 0 };
const MAX_PITCH = 50;
// useHeading updates at sensor rate (S-01 impl-review F8d). A tilted, rotating view amplifies jitter, so the
// camera favours a stable image over following every degree of heading.
const MIN_BEARING_DELTA = 5;
const MIN_MOVE_METERS = 2;
const EASE_MS = 250;
/** The highlighted remainder is re-cut every few metres walked, not on every GPS fix. */
const REMAINING_STEP_METERS = 5;

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
  /** User toggle: flat north-up instead of the heading-up navigation view. */
  northUp: boolean;
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
  northUp,
  isStale,
  onError,
}: ExecutionMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const camera = useRef<{ bearing: number; center: Coordinates; mode: CameraMode } | null>(null);
  const onErrorRef = useRef(onError);
  const [loaded, setLoaded] = useState(false);
  // Built once per route (a reroute brings a new one), not on every fix.
  const [prepared, setPrepared] = useState<{ route: SavedRoute | null; line: PreparedRoute | null }>(() => ({
    route,
    line: route ? prepareRoute(route) : null,
  }));
  if (prepared.route !== route) setPrepared({ route, line: route ? prepareRoute(route) : null });
  const traveledMeters = prepared.line && position ? progressOnRoute(prepared.line, position).traveledMeters : 0;
  const traveledStep = Math.floor(traveledMeters / REMAINING_STEP_METERS) * REMAINING_STEP_METERS;

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    let cancelled = false;
    // Any start-up failure (missing file, no WebGL, bad package) hands guidance back to the arrow view.
    const fail = () => {
      if (!cancelled) onErrorRef.current();
    };
    void openMapFile(mapPackage)
      .then((file) => {
        if (cancelled || !container.current) return;
        if (!file) {
          fail();
          return;
        }
        protocol.add(new PMTiles(new FileSource(file)));
        const start = position ?? destination.coords;
        const mode = !northUp && heading !== null ? NAVIGATION_CAMERA : NORTH_UP_CAMERA;
        const map = new MapLibreMap({
          container: container.current,
          style: buildMapStyle(file.name, readMapPalette()),
          center: [start.longitude, start.latitude],
          zoom: mode.zoom,
          pitch: mode.pitch,
          maxPitch: MAX_PITCH,
          bearing: mode === NAVIGATION_CAMERA ? (heading ?? 0) : 0,
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
        map.on("webglcontextlost", fail);
        mapRef.current = map;
      })
      .catch(fail);
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
    const line = (coordinates: [number, number][]) => ({
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates },
    });
    const empty = { type: "FeatureCollection" as const, features: [] };
    const { line: routeLine } = prepared;
    void map.getSource<GeoJSONSource>("route-walked")?.setData(routeLine ? line(routeLine.route.geometry) : empty);
    void map
      .getSource<GeoJSONSource>("route")
      ?.setData(routeLine ? line(remainingGeometry(routeLine, traveledStep)) : empty);
  }, [loaded, prepared, traveledStep, destination]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    void map
      .getSource<GeoJSONSource>("user")
      ?.setData(position ? pointFeature(position, { stale: isStale }) : { type: "FeatureCollection", features: [] });

    const center = position ?? destination.coords;
    const mode = !northUp && heading !== null ? NAVIGATION_CAMERA : NORTH_UP_CAMERA;
    const bearing = mode === NAVIGATION_CAMERA ? (heading ?? 0) : 0;
    const previous = camera.current;
    if (
      previous?.mode === mode &&
      turn(previous.bearing, bearing) < MIN_BEARING_DELTA &&
      distanceMeters(previous.center, center) < MIN_MOVE_METERS
    ) {
      return;
    }
    const modeChanged = previous?.mode !== mode;
    camera.current = { bearing, center, mode };
    const height = map.getContainer().clientHeight;
    const options = {
      center: [center.longitude, center.latitude] as [number, number],
      bearing,
      pitch: mode.pitch,
      // Zoom is set only when the mode changes, so a user's pinch zoom survives the follow updates.
      ...(modeChanged ? { zoom: mode.zoom } : {}),
      padding: { top: Math.round(height * mode.topPaddingRatio), bottom: 0, left: 0, right: 0 },
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) map.jumpTo(options);
    else map.easeTo({ ...options, duration: EASE_MS });
  }, [loaded, position, heading, northUp, isStale, destination]);

  return <div ref={container} className="h-full w-full" aria-label="Mapa z trasą do celu" role="img" />;
}
