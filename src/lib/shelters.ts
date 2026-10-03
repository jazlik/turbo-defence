import { distanceMeters } from "@/lib/geo";
import type { Coordinates, Destination } from "@/types";

/** Snapshot produced by scripts/prepare-shelters.mjs: [id, latitude, longitude, address, availability]. */
export type ShelterRow = [string, number, number, string, string];

export interface ShelterPoint {
  id: string;
  coords: Coordinates;
  address: string;
  availability: string;
}

export interface ShelterCandidate extends ShelterPoint {
  straightMeters: number;
}

export const SHORTLIST_SIZE = 5;
export const SHORTLIST_RADIUS_METERS = 15_000;
/** B must be a real alternative, not the next entrance of the same building. */
export const ALTERNATE_MIN_SEPARATION_METERS = 150;
// Stickiness (review F6): routing times jitter between refreshes; the family's target must not flip on noise.
const SWITCH_MIN_GAIN_RATIO = 0.1;
const SWITCH_MIN_GAIN_SECONDS = 60;

export function parseShelterRows(rows: unknown): ShelterPoint[] {
  if (!Array.isArray(rows)) return [];
  const points: ShelterPoint[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    const [id, latitude, longitude, address, availability] = row as unknown[];
    if (typeof id !== "string" || typeof latitude !== "number" || typeof longitude !== "number") continue;
    points.push({
      id,
      coords: { latitude, longitude },
      address: typeof address === "string" ? address : "",
      availability: typeof availability === "string" ? availability : "",
    });
  }
  return points;
}

export const SHORTLIST_SPREAD_SIZE = 3;

/**
 * Local, offline pre-selection by straight-line distance; the routing matrix decides among these. Dense city centres
 * put the nearest five points within one block, so the list also takes the nearest few at least 150 m from the
 * nearest one — otherwise there is no candidate for route B.
 */
export function shortlist(
  points: ShelterPoint[],
  origin: Coordinates,
  { size = SHORTLIST_SIZE, spread = SHORTLIST_SPREAD_SIZE, radiusMeters = SHORTLIST_RADIUS_METERS } = {},
): ShelterCandidate[] {
  const sorted = points
    .map((point) => ({ ...point, straightMeters: distanceMeters(origin, point.coords) }))
    .filter((candidate) => candidate.straightMeters <= radiusMeters)
    .sort((a, b) => a.straightMeters - b.straightMeters);
  const nearest = sorted.slice(0, size);
  const anchor = nearest.at(0);
  if (!anchor) return [];
  const spreadOut = sorted
    .slice(size)
    .filter((candidate) => distanceMeters(candidate.coords, anchor.coords) >= ALTERNATE_MIN_SEPARATION_METERS)
    .slice(0, spread);
  return [...nearest, ...spreadOut];
}

export interface PickedDestinations {
  primary: ShelterCandidate;
  alternate: ShelterCandidate | null;
  primarySeconds: number;
}

/**
 * A = shortest walk (team decision: walking time only, every availability category allowed), but the current A stays
 * unless the new best is ≥ 10 % and ≥ 60 s faster. B = next best at least 150 m away from A.
 */
export function pickDestinations(
  candidates: ShelterCandidate[],
  walkingSeconds: (number | null)[],
  previousPrimaryId: string | null,
): PickedDestinations | null {
  const reachable = candidates
    .map((candidate, index) => ({ candidate, seconds: walkingSeconds[index] ?? null }))
    .filter((entry): entry is { candidate: ShelterCandidate; seconds: number } => entry.seconds !== null)
    .sort((a, b) => a.seconds - b.seconds);
  const best = reachable.at(0);
  if (!best) return null;

  const previous = reachable.find((entry) => entry.candidate.id === previousPrimaryId);
  const gain = previous ? previous.seconds - best.seconds : 0;
  const keepPrevious =
    previous !== undefined && !(gain >= SWITCH_MIN_GAIN_SECONDS && gain >= previous.seconds * SWITCH_MIN_GAIN_RATIO);
  const primary = keepPrevious ? previous : best;

  const alternate = reachable.find(
    (entry) =>
      entry.candidate.id !== primary.candidate.id &&
      distanceMeters(entry.candidate.coords, primary.candidate.coords) >= ALTERNATE_MIN_SEPARATION_METERS,
  );
  return { primary: primary.candidate, alternate: alternate?.candidate ?? null, primarySeconds: primary.seconds };
}

export function toDestination(point: ShelterPoint): Destination {
  return {
    id: point.id,
    label: point.address || "Punkt schronienia",
    coords: point.coords,
    source: "psp",
    address: point.address,
    availability: point.availability,
  };
}
