import type { Coordinates } from "@/types";

const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;
const normalizeDegrees = (degrees: number) => ((degrees % 360) + 360) % 360;

/** Great-circle (straight-line) distance, haversine formula. */
export function distanceMeters(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLon = toRadians(to.longitude - from.longitude);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Initial bearing from `from` to `to`, 0–360, 0 = north, clockwise. */
export function bearingDegrees(from: Coordinates, to: Coordinates): number {
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return normalizeDegrees(toDegrees(Math.atan2(y, x)));
}

/** On-screen arrow rotation, 0–360: the target bearing as seen from the device heading. */
export function relativeBearing(targetBearing: number, deviceHeading: number): number {
  return normalizeDegrees(targetBearing - deviceHeading);
}

const kilometerFormat = new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatDistance(meters: number): string {
  const roundedMeters = Math.round(meters / 10) * 10;
  if (roundedMeters < 1000) return `${roundedMeters} m`;
  return `${kilometerFormat.format(meters / 1000)} km`;
}

export type ParsedCoordinates = { ok: true; coords: Coordinates } | { ok: false; reason: "format" | "range" };

/**
 * Accepts "52.2297, 21.0122" (also separated by a semicolon or whitespace) and Polish decimal commas
 * such as "52,2297; 21,0122" or "52,2297 21,0122".
 */
export function parseCoordinates(input: string): ParsedCoordinates {
  const match = /^\s*(-?\d+(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d+(?:[.,]\d+)?)\s*$/.exec(input);
  if (!match) return { ok: false, reason: "format" };
  const latitude = Number(match[1].replace(",", "."));
  const longitude = Number(match[2].replace(",", "."));
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return { ok: false, reason: "range" };
  return { ok: true, coords: { latitude, longitude } };
}
