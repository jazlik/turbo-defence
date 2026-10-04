import { bearingDegrees, distanceMeters, relativeBearing } from "@/lib/geo";
import { CHECKPOINT_LOOKAHEAD_METERS, progressOnRoute, type PreparedRoute } from "@/lib/route-progress";
import type { Coordinates } from "@/types";

/** S-01 arrival radius: covers typical GPS error (5–20 m) and gives the scenario an end. */
export const ARRIVAL_RADIUS_METERS = 25;
/** Beyond this distance from the saved route, offline guidance gives up on the route and points at the destination. */
export const DIRECT_FALLBACK_METERS = 300;
// Hysteresis: leaving the route needs a clear margin, rejoining needs to be clearly back — no flicker at the edge.
const OFF_ROUTE_ENTER_MIN_METERS = 35;
const OFF_ROUTE_EXIT_MIN_METERS = 25;
const DIRECT_EXIT_METERS = 250;

/** route: follow the saved route · rejoin: walk back to it · direct: S-01 bearing straight at the destination. */
export type GuidanceMode = "route" | "rejoin" | "direct";
export type DistanceKind = "route" | "to-route" | "straight";

export interface GuidanceInput {
  destination: Coordinates;
  route: PreparedRoute | null;
  /** Live fix, else this session's stale fix, else the position saved before the alarm (S-01 rules). */
  origin: Coordinates | null;
  accuracyMeters: number | null;
  heading: number | null;
  liveFix: boolean;
  previousMode: GuidanceMode | null;
}

export interface Guidance {
  mode: GuidanceMode;
  target: Coordinates | null;
  distanceMeters: number | null;
  distanceKind: DistanceKind;
  rotation: number | null;
  /** Straight line to the destination — S-01 arrival and stale-data rules use it. */
  straightDistanceMeters: number | null;
  /** Only a live fix can confirm arrival: the last known position may be hours old. */
  arrived: boolean;
}

function pickMode(offRouteMeters: number, accuracyMeters: number | null, previousMode: GuidanceMode | null) {
  const accuracy = accuracyMeters ?? 0;
  if (previousMode === "direct" ? offRouteMeters > DIRECT_EXIT_METERS : offRouteMeters > DIRECT_FALLBACK_METERS) {
    return "direct";
  }
  const wasOffRoute = previousMode === "rejoin" || previousMode === "direct";
  const threshold = wasOffRoute
    ? Math.max(OFF_ROUTE_EXIT_MIN_METERS, accuracy)
    : Math.max(OFF_ROUTE_ENTER_MIN_METERS, 1.5 * accuracy);
  return offRouteMeters > threshold ? "rejoin" : "route";
}

export function deriveGuidance(input: GuidanceInput): Guidance {
  const { destination, route, origin, heading } = input;
  const idleMode: GuidanceMode = route ? "route" : "direct";
  if (!origin) {
    return {
      mode: idleMode,
      target: null,
      distanceMeters: null,
      distanceKind: route ? "route" : "straight",
      rotation: null,
      straightDistanceMeters: null,
      arrived: false,
    };
  }

  const straightDistanceMeters = distanceMeters(origin, destination);
  const arrived = input.liveFix && straightDistanceMeters < ARRIVAL_RADIUS_METERS;
  const rotationTo = (target: Coordinates) =>
    heading === null ? null : relativeBearing(bearingDegrees(origin, target), heading);
  const direct = (): Guidance => ({
    mode: "direct",
    target: destination,
    distanceMeters: straightDistanceMeters,
    distanceKind: "straight",
    rotation: rotationTo(destination),
    straightDistanceMeters,
    arrived,
  });

  if (!route) return direct();

  const progress = progressOnRoute(route, origin);
  const mode = pickMode(progress.offRouteMeters, input.accuracyMeters, input.previousMode);
  if (mode === "direct") return direct();
  if (mode === "rejoin") {
    return {
      mode,
      target: progress.snapped,
      distanceMeters: progress.offRouteMeters,
      distanceKind: "to-route",
      rotation: rotationTo(progress.snapped),
      straightDistanceMeters,
      arrived,
    };
  }
  // Last leg: the route ends where the router snapped the destination; aim at the destination itself from there.
  const target = progress.remainingOnLineMeters <= CHECKPOINT_LOOKAHEAD_METERS ? destination : progress.checkpoint;
  return {
    mode,
    target,
    distanceMeters: progress.remainingMeters,
    distanceKind: "route",
    rotation: rotationTo(target),
    straightDistanceMeters,
    arrived,
  };
}
