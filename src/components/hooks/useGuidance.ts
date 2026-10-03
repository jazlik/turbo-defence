import { useEffect, useRef, useState } from "react";

import { useGeolocation } from "@/components/hooks/useGeolocation";
import { useHeading, type HeadingSource } from "@/components/hooks/useHeading";
import { useNow } from "@/components/hooks/useNow";
import { deriveGuidance, type Guidance, type GuidanceMode } from "@/lib/navigation";
import { prepareRoute } from "@/lib/route-progress";
import { activeRoute, readNavigation, writeNavigation } from "@/lib/services/navigation-storage";
import { REROUTE_AFTER_OFF_ROUTE_MS, REROUTE_MIN_INTERVAL_MS, rerouteActive } from "@/lib/services/route-refresh";
import { walkingRouter } from "@/lib/services/routing";
import { readPlan, saveLastKnownPosition } from "@/lib/services/plan-storage";
import type { Coordinates, Destination, NavigationState, SavedRoute } from "@/types";

// watchPosition goes silent when the signal is lost; a fix older than this is shown as stale, not live.
const FIX_STALE_MS = 20_000;

export type LocationProblem = "denied" | "unavailable";

export interface UseGuidanceResult {
  /** null → nothing to guide to (S-01 "Nie wskazano punktu ewakuacji"). */
  destination: Destination | null;
  route: SavedRoute | null;
  guidance: Guidance | null;
  /** Position the guidance is computed from: live fix ?? this session's stale fix ?? saved last known position. */
  position: Coordinates | null;
  accuracyMeters: number | null;
  heading: number | null;
  headingSource: HeadingSource | null;
  isStale: boolean;
  /** Epoch ms of the stale data, for "Dane z …". */
  staleSince: number | null;
  locationProblem: LocationProblem | null;
}

/**
 * The single navigation core for Execution Mode: the arrow screen and the map both consume this result.
 * Plan and routes are read synchronously so the target is on screen before any sensor answers.
 */
export function useGuidance(): UseGuidanceResult {
  const [plan] = useState(readPlan);
  // Routes are read once per /alarm visit (and replaced only by an online reroute), so the Turf line is built
  // once per route, not on every GPS fix.
  const [{ navigation, prepared }, setRouteState] = useState(() => withPrepared(readNavigation()));
  const route = activeRoute(navigation);
  const manualPoint = plan.evacuationPoint;
  // The organiser's own point is the fallback when no PSP route was prepared (S-04 team decision).
  const destination: Destination | null =
    route?.destination ??
    (manualPoint ? { id: "manual", label: manualPoint.label, coords: manualPoint.coords, source: "manual" } : null);

  const { coords, accuracyMeters, fixedAt, status } = useGeolocation({ watch: destination !== null });
  const { heading, source } = useHeading(coords, accuracyMeters);
  const now = useNow(5_000);
  const [previousMode, setPreviousMode] = useState<GuidanceMode | null>(null);
  const [offRouteSince, setOffRouteSince] = useState<number | null>(null);
  const lastReroute = useRef<number | null>(null);

  useEffect(() => {
    if (coords) saveLastKnownPosition(coords);
  }, [coords]);

  const liveFix = coords !== null && fixedAt !== null && now - fixedAt < FIX_STALE_MS ? coords : null;
  const lastKnown = plan.lastKnownPosition;
  const staleFix =
    coords !== null && fixedAt !== null
      ? { coords, recordedAt: fixedAt }
      : lastKnown
        ? { coords: lastKnown.coords, recordedAt: Date.parse(lastKnown.recordedAt) }
        : null;
  const position = liveFix ?? staleFix?.coords ?? null;
  const isStale = liveFix === null && staleFix !== null;
  const locationProblem = liveFix === null && (status === "denied" || status === "unavailable") ? status : null;

  const guidance = destination
    ? deriveGuidance({
        destination: destination.coords,
        route: prepared,
        origin: position,
        accuracyMeters,
        heading,
        liveFix: liveFix !== null,
        previousMode,
      })
    : null;
  // Derived from the previous render (hysteresis), same pattern as useHeading's movement reference.
  if (guidance && guidance.distanceMeters !== null && guidance.mode !== previousMode) setPreviousMode(guidance.mode);
  const offRoute = route !== null && liveFix !== null && guidance !== null && guidance.mode !== "route";
  if (offRoute && offRouteSince === null) setOffRouteSince(now);
  if (!offRoute && offRouteSince !== null) setOffRouteSince(null);

  // P1: online, after a sustained deviation, a new route to the same destination. Offline nothing changes.
  useEffect(() => {
    if (offRouteSince === null || liveFix === null || !navigator.onLine) return;
    if (now - offRouteSince < REROUTE_AFTER_OFF_ROUTE_MS) return;
    if (lastReroute.current !== null && now - lastReroute.current < REROUTE_MIN_INTERVAL_MS) return;
    lastReroute.current = now;
    void rerouteActive({ previous: navigation, origin: liveFix, router: walkingRouter }).then((next) => {
      writeNavigation(next);
      if (next.lastRefresh?.ok) setRouteState(withPrepared(next));
    });
  }, [now, offRouteSince, liveFix, navigation]);

  return {
    destination,
    route,
    guidance,
    position,
    accuracyMeters,
    heading,
    headingSource: source,
    isStale,
    staleSince: isStale ? staleFix.recordedAt : null,
    locationProblem,
  };
}

function withPrepared(navigation: NavigationState) {
  const route = activeRoute(navigation);
  return { navigation, prepared: route ? prepareRoute(route) : null };
}
