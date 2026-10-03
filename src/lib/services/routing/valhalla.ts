import { decode } from "@googlemaps/polyline-codec";

import { isRecord } from "@/lib/services/plan-storage";
import type { Coordinates, LngLat } from "@/types";

import { RoutingError, type WalkingRoute, type WalkingRouter } from "./types";

/** FOSSGIS public Valhalla, pedestrian costing — backup when OSRM fails. Same policy: ≤ 1 request/s. */
const BASE_URL = "https://valhalla1.openstreetmap.de";
const TIMEOUT_MS = 10_000;
/** Valhalla encodes shapes as polyline with 6 decimal places. */
const SHAPE_PRECISION = 6;

const location = ({ latitude, longitude }: Coordinates) => ({ lat: latitude, lon: longitude });

export const valhallaMatrixBody = (origin: Coordinates, targets: Coordinates[]) => ({
  sources: [location(origin)],
  targets: targets.map(location),
  costing: "pedestrian",
});

export const valhallaRouteBody = (origin: Coordinates, target: Coordinates) => ({
  locations: [location(origin), location(target)],
  costing: "pedestrian",
  directions_type: "none",
  units: "kilometers",
});

export function parseValhallaMatrix(json: unknown, targetCount: number): (number | null)[] {
  if (!isRecord(json) || !Array.isArray(json.sources_to_targets)) {
    throw new RoutingError("Serwis tras nie zwrócił czasów dojścia.");
  }
  const row: unknown = json.sources_to_targets[0];
  if (!Array.isArray(row) || row.length !== targetCount) throw new RoutingError("Niepełna macierz czasów.");
  return row.map((cell) => (isRecord(cell) && typeof cell.time === "number" ? cell.time : null));
}

export function parseValhallaRoute(json: unknown): WalkingRoute {
  const trip = isRecord(json) ? json.trip : null;
  if (!isRecord(trip) || !isRecord(trip.summary) || !Array.isArray(trip.legs)) {
    throw new RoutingError("Serwis tras nie wyznaczył trasy.");
  }
  const leg: unknown = trip.legs[0];
  const { length, time } = trip.summary;
  if (!isRecord(leg) || typeof leg.shape !== "string" || typeof length !== "number" || typeof time !== "number") {
    throw new RoutingError("Trasa bez geometrii.");
  }
  const geometry = decode(leg.shape, SHAPE_PRECISION).map(([lat, lng]): LngLat => [lng, lat]);
  if (geometry.length < 2) throw new RoutingError("Trasa bez geometrii.");
  return { geometry, distanceMeters: length * 1000, durationSeconds: time };
}

async function postJson(path: string, body: unknown): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new RoutingError(`Serwis tras odpowiedział błędem ${response.status}.`);
    return await response.json();
  } catch (error) {
    if (error instanceof RoutingError) throw error;
    throw new RoutingError("Serwis tras nie odpowiada.");
  } finally {
    clearTimeout(timer);
  }
}

export const valhallaRouter: WalkingRouter = {
  id: "valhalla-fossgis-pedestrian",
  async matrix(origin, targets) {
    return parseValhallaMatrix(
      await postJson("/sources_to_targets", valhallaMatrixBody(origin, targets)),
      targets.length,
    );
  },
  async route(origin, target) {
    return parseValhallaRoute(await postJson("/route", valhallaRouteBody(origin, target)));
  },
};
