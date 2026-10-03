import { isRecord } from "@/lib/services/plan-storage";
import type { Coordinates, LngLat } from "@/types";

import { RoutingError, type WalkingRoute, type WalkingRouter } from "./types";

/** FOSSGIS public OSRM, foot profile. Policy: ≤ 1 request/s, OSM attribution — callers pace their requests. */
const BASE_URL = "https://routing.openstreetmap.de/routed-foot";
const TIMEOUT_MS = 10_000;

const pair = ({ latitude, longitude }: Coordinates) => `${longitude.toFixed(6)},${latitude.toFixed(6)}`;

export const osrmTableUrl = (origin: Coordinates, targets: Coordinates[]) =>
  `${BASE_URL}/table/v1/foot/${[origin, ...targets].map(pair).join(";")}?sources=0&annotations=duration`;

export const osrmRouteUrl = (origin: Coordinates, target: Coordinates) =>
  `${BASE_URL}/route/v1/foot/${pair(origin)};${pair(target)}?overview=full&geometries=geojson&steps=false`;

/** Durations from the origin (row 0) to each target; OSRM puts the origin itself in column 0. */
export function parseOsrmTable(json: unknown, targetCount: number): (number | null)[] {
  if (!isRecord(json) || json.code !== "Ok" || !Array.isArray(json.durations)) {
    throw new RoutingError("Serwis tras nie zwrócił czasów dojścia.");
  }
  const row: unknown = json.durations[0];
  if (!Array.isArray(row) || row.length !== targetCount + 1) throw new RoutingError("Niepełna macierz czasów.");
  return row.slice(1).map((value) => (typeof value === "number" && Number.isFinite(value) ? value : null));
}

const isLngLat = (value: unknown): value is LngLat =>
  Array.isArray(value) && value.length >= 2 && value.every((n) => typeof n === "number" && Number.isFinite(n));

export function parseOsrmRoute(json: unknown): WalkingRoute {
  if (!isRecord(json) || json.code !== "Ok" || !Array.isArray(json.routes)) {
    throw new RoutingError("Serwis tras nie wyznaczył trasy.");
  }
  const route: unknown = json.routes[0];
  if (!isRecord(route) || !isRecord(route.geometry) || !Array.isArray(route.geometry.coordinates)) {
    throw new RoutingError("Trasa bez geometrii.");
  }
  const geometry = route.geometry.coordinates.filter(isLngLat).map(([lng, lat]): LngLat => [lng, lat]);
  if (geometry.length < 2 || typeof route.distance !== "number" || typeof route.duration !== "number") {
    throw new RoutingError("Trasa bez geometrii.");
  }
  return { geometry, distanceMeters: route.distance, durationSeconds: route.duration };
}

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new RoutingError(`Serwis tras odpowiedział błędem ${response.status}.`);
    return await response.json();
  } catch (error) {
    if (error instanceof RoutingError) throw error;
    throw new RoutingError("Serwis tras nie odpowiada.");
  } finally {
    clearTimeout(timer);
  }
}

export const osrmRouter: WalkingRouter = {
  id: "osrm-fossgis-foot",
  async matrix(origin, targets) {
    return parseOsrmTable(await getJson(osrmTableUrl(origin, targets)), targets.length);
  },
  async route(origin, target) {
    return parseOsrmRoute(await getJson(osrmRouteUrl(origin, target)));
  },
};
