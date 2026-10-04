import type { EvacuationStep } from "@/lib/evacuation-steps";
import type { Coordinates, HouseholdPlan, NavigationState, RouteRole, SavedRoute } from "@/types";

/** Where the shelter step leads: the saved PSP route (S-04), or the organiser's own shelter. */
export interface StepTarget {
  label: string;
  coords: Coordinates;
  source: "psp" | "manual";
  route: SavedRoute | null;
  role: RouteRole | null;
}

/** The shelter step can switch to the prepared route B with "niedostępne" — only when both routes exist. */
export const shelterAlternateAvailable = (navigation: NavigationState) =>
  navigation.primary !== null && navigation.alternate !== null;

/**
 * Team decision (S-04 merge with S-02): the shelter step follows the automatically chosen PSP shelter — route A,
 * route B after "niedostępne" — and falls back to the organiser's own shelter when no route was prepared.
 */
export function resolveStepTarget(
  plan: HouseholdPlan,
  navigation: NavigationState,
  fallbackActive: boolean,
): StepTarget | null {
  const role: RouteRole = fallbackActive && navigation.alternate !== null ? "alternate" : "primary";
  const route = role === "alternate" ? navigation.alternate : navigation.primary;
  if (route) {
    const { label, coords } = route.destination;
    return { label, coords, source: "psp", route, role };
  }
  const place = plan.shelter;
  return place ? { label: place.label, coords: place.coords, source: "manual", route: null, role: null } : null;
}

/** On the shelter step with route B active, the screen and the voice say so (S-03 announces title changes). */
export function shelterFallbackContent(
  step: EvacuationStep,
  target: StepTarget | null,
): { title: string; instruction: string } | null {
  if (step.kind !== "navigate" || target?.role !== "alternate") return null;
  return {
    title: "Idź do zapasowego schronu",
    instruction: "Schron jest niedostępny. Idź do zapasowego schronu wybranego przy przygotowaniu trasy.",
  };
}
