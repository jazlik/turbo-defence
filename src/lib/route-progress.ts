import { along } from "@turf/along";
import { lineString } from "@turf/helpers";
import { length } from "@turf/length";
import { lineSliceAlong } from "@turf/line-slice-along";
import { nearestPointOnLine } from "@turf/nearest-point-on-line";
import type { Feature, LineString } from "geojson";

import { distanceMeters } from "@/lib/geo";
import type { Coordinates, LngLat, SavedRoute } from "@/types";

/** The arrow aims this far ahead along the route, so it turns with the street instead of at each vertex. */
export const CHECKPOINT_LOOKAHEAD_METERS = 40;

export interface PreparedRoute {
  route: SavedRoute;
  line: Feature<LineString>;
  lengthMeters: number;
  /**
   * Routers snap the destination to the nearest walkable way; PSP points often sit 20–60 m away inside a building
   * or courtyard. Counting this last leg keeps the remaining distance from reaching 0 m before arrival.
   */
  endGapMeters: number;
}

export interface RouteProgress {
  offRouteMeters: number;
  traveledMeters: number;
  /** Rest of the line plus the last leg to the destination. */
  remainingMeters: number;
  /** Rest of the line only — drives the switch to aiming at the destination itself. */
  remainingOnLineMeters: number;
  checkpoint: Coordinates;
  snapped: Coordinates;
}

const toLngLat = ({ latitude, longitude }: Coordinates): LngLat => [longitude, latitude];
const toCoordinates = ([longitude, latitude]: number[]): Coordinates => ({ latitude, longitude });

/** Built once per saved route (memoised by the caller), not on every GPS fix. */
export function prepareRoute(route: SavedRoute): PreparedRoute {
  const line = lineString(route.geometry);
  const end = route.geometry[route.geometry.length - 1];
  return {
    route,
    line,
    lengthMeters: length(line, { units: "meters" }),
    endGapMeters: distanceMeters(toCoordinates(end), route.destination.coords),
  };
}

export function progressOnRoute(prepared: PreparedRoute, position: Coordinates): RouteProgress {
  const nearest = nearestPointOnLine(prepared.line, toLngLat(position), { units: "meters" });
  const traveledMeters = Math.min(nearest.properties.totalDistance, prepared.lengthMeters);
  const remainingOnLineMeters = Math.max(prepared.lengthMeters - traveledMeters, 0);
  const checkpointAt = Math.min(traveledMeters + CHECKPOINT_LOOKAHEAD_METERS, prepared.lengthMeters);
  return {
    offRouteMeters: nearest.properties.pointDistance,
    traveledMeters,
    remainingMeters: remainingOnLineMeters + prepared.endGapMeters,
    remainingOnLineMeters,
    checkpoint: toCoordinates(along(prepared.line, checkpointAt, { units: "meters" }).geometry.coordinates),
    snapped: toCoordinates(nearest.geometry.coordinates),
  };
}

/** The part of the route still ahead — the highlighted line on the map; the walked part is drawn faintly. */
export function remainingGeometry(prepared: PreparedRoute, traveledMeters: number): LngLat[] {
  const { geometry } = prepared.route;
  if (traveledMeters <= 0) return geometry;
  if (traveledMeters >= prepared.lengthMeters) {
    const end = geometry[geometry.length - 1];
    return [end, end];
  }
  const slice = lineSliceAlong(prepared.line, traveledMeters, prepared.lengthMeters, { units: "meters" });
  return slice.geometry.coordinates.map(([longitude, latitude]): LngLat => [longitude, latitude]);
}
