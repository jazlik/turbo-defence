import { useEffect, useState } from "react";

import { useGeolocation } from "@/components/hooks/useGeolocation";
import { useHeading, type HeadingSource } from "@/components/hooks/useHeading";
import { useNow } from "@/components/hooks/useNow";
import { deriveGuidance, type Guidance, type GuidanceMode } from "@/lib/navigation";
import { prepareRoute } from "@/lib/route-progress";
import { activeRoute, readNavigation } from "@/lib/services/navigation-storage";
import { readPlan, saveLastKnownPosition } from "@/lib/services/plan-storage";
import type { Coordinates, Destination, SavedRoute } from "@/types";

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
  const [navigation] = useState(readNavigation);
  const route = activeRoute(navigation);
  const manualPoint = plan.evacuationPoint;
  // The organiser's own point is the fallback when no PSP route was prepared (S-04 team decision).
  const destination: Destination | null =
    route?.destination ??
    (manualPoint ? { id: "manual", label: manualPoint.label, coords: manualPoint.coords, source: "manual" } : null);
  // Routes are read once per /alarm visit, so the Turf line is built once, not on every GPS fix.
  const [prepared] = useState(() => (route ? prepareRoute(route) : null));

  const { coords, accuracyMeters, fixedAt, status } = useGeolocation({ watch: destination !== null });
  const { heading, source } = useHeading(coords, accuracyMeters);
  const now = useNow(5_000);
  const [previousMode, setPreviousMode] = useState<GuidanceMode | null>(null);

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
