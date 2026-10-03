import { useEffect, useState } from "react";
import { CheckCircle2, Compass, MapPinOff, Route, Satellite } from "lucide-react";

import DirectionArrow from "@/components/DirectionArrow";
import { useGuidance } from "@/components/hooks/useGuidance";
import { useScreenWakeLock } from "@/components/hooks/useScreenWakeLock";
import { Button } from "@/components/ui/button";
import { headingPermissionRequired, requestHeadingPermission } from "@/components/hooks/useHeading";
import { formatClockTime } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import { ARRIVAL_RADIUS_METERS, type DistanceKind } from "@/lib/navigation";

// iOS forgets the motion permission between PWA launches; after this much compass silence offer to re-enable it.
const COMPASS_SILENCE_MS = 1000;

// Waiting for the sky does not help when the browser has no permission or location is off — say what to do instead.
const LOCATION_PROBLEMS = {
  denied: {
    title: "Brak zgody na lokalizację",
    instruction:
      "Otwórz ustawienia strony w przeglądarce (ikona obok adresu), zezwól na lokalizację i odśwież tę stronę.",
  },
  unavailable: {
    title: "Telefon nie podaje pozycji",
    instruction: "Sprawdź, czy usługi lokalizacji są włączone w ustawieniach systemu, i wyjdź pod otwarte niebo.",
  },
} as const;

const DISTANCE_CAPTIONS: Record<DistanceKind, string> = {
  route: "trasą",
  "to-route": "do trasy",
  straight: "w linii prostej",
};

function ExitLink() {
  return (
    <Button asChild variant="link" className="text-muted-foreground hover:text-muted-foreground text-base">
      <a href="/">Wyjdź z trybu alarmu</a>
    </Button>
  );
}

export default function GuidanceScreen() {
  const {
    destination,
    route,
    guidance,
    headingSource: source,
    isStale,
    staleSince,
    locationProblem: problem,
  } = useGuidance();
  const [compassSilent, setCompassSilent] = useState(false);

  useScreenWakeLock();

  useEffect(() => {
    if (!headingPermissionRequired()) return;
    const timer = window.setTimeout(() => {
      setCompassSilent(true);
    }, COMPASS_SILENCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (!destination || !guidance) {
    return (
      <main className="flex min-h-screen flex-col justify-between gap-8 px-4 py-8">
        <div>
          <MapPinOff className="text-guidance size-12" strokeWidth={2} aria-hidden="true" />
          <h1 className="font-heading mt-6 text-3xl">Nie wskazano punktu ewakuacji</h1>
          <p className="text-muted-foreground mt-3 text-lg">
            Bez zapisanego punktu nie mogę prowadzić. Wróć do planu i ustaw punkt — zajmie to chwilę.
          </p>
        </div>
        <Button asChild size="lg" className="min-h-14 w-full text-lg font-semibold">
          <a href="/">Ustaw punkt ewakuacji</a>
        </Button>
      </main>
    );
  }

  const locationProblem = problem ? LOCATION_PROBLEMS[problem] : null;
  const { arrived, distanceMeters: distance, straightDistanceMeters, rotation, mode, distanceKind } = guidance;
  // A stale position near the point must not show a "0 m" arrow — only a live fix can confirm arrival.
  const nearOnStaleData = isStale && straightDistanceMeters !== null && straightDistanceMeters < ARRIVAL_RADIUS_METERS;
  const guiding = distance !== null && !arrived && !nearOnStaleData;
  const isShelter = destination.source === "psp";
  const showCompassButton = compassSilent && source !== "compass" && !arrived;

  return (
    <main className="flex min-h-screen flex-col gap-6 px-4 py-6">
      <header>
        <p className="text-guidance text-lg font-semibold">
          {isShelter ? "Idź do schronu" : "Idź do punktu ewakuacji"}
        </p>
        <h1 className="font-heading mt-1 text-3xl break-words">{destination.label}</h1>
        {route && (
          <p className="text-muted-foreground mt-1 flex items-center gap-2 text-base">
            <Route className="size-4" strokeWidth={2} aria-hidden="true" />
            Trasa z {formatClockTime(Date.parse(route.createdAt))}
          </p>
        )}
      </header>

      <section aria-live="polite" className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        {arrived && (
          <>
            <CheckCircle2 className="text-safe size-24" strokeWidth={2} aria-hidden="true" />
            <p className="font-heading text-display text-safe">Jesteś na miejscu</p>
            <p className="text-muted-foreground text-lg">Zostań tutaj i czekaj na pozostałych domowników.</p>
          </>
        )}

        {guiding && (
          <>
            {mode === "rejoin" && <p className="font-heading text-guidance text-2xl">Wróć na trasę</p>}
            <div className="w-3/5 max-w-64">
              {rotation !== null ? (
                <DirectionArrow rotationDegrees={rotation} dimmed={isStale} />
              ) : (
                <p className="text-muted-foreground text-lg">Ustalam kierunek — zrób kilka kroków.</p>
              )}
            </div>
            <p className="font-operational text-display text-guidance">{formatDistance(distance)}</p>
            <p className="text-muted-foreground text-lg">{DISTANCE_CAPTIONS[distanceKind]}</p>
            {mode === "direct" && route && (
              <p className="text-muted-foreground text-base">Jesteś daleko od zapisanej trasy — idź w kierunku celu.</p>
            )}
            {isStale && (
              <p className="text-muted-foreground flex items-center gap-2 text-base">
                <Satellite className="size-5" strokeWidth={2} aria-hidden="true" />
                Dane z {staleSince === null ? "—" : formatClockTime(staleSince)} —{" "}
                {locationProblem ? locationProblem.title.toLowerCase() : "czekam na sygnał GPS"}
              </p>
            )}
            {locationProblem && <p className="text-muted-foreground text-base">{locationProblem.instruction}</p>}
            {rotation !== null && source === "movement" && (
              <p className="text-muted-foreground text-base">Kierunek liczony z marszu</p>
            )}
          </>
        )}

        {!arrived && !guiding && locationProblem && (
          <>
            <MapPinOff className="text-guidance size-16" strokeWidth={2} aria-hidden="true" />
            <p className="font-heading text-2xl">{locationProblem.title}</p>
            <p className="text-muted-foreground text-lg">{locationProblem.instruction}</p>
          </>
        )}

        {!arrived && !guiding && !locationProblem && (
          <>
            <Satellite className="text-guidance size-16" strokeWidth={2} aria-hidden="true" />
            <p className="font-heading text-2xl">Szukam sygnału GPS</p>
            <p className="text-muted-foreground text-lg">
              Wyjdź pod otwarte niebo. Strzałka pojawi się po ustaleniu pozycji.
            </p>
          </>
        )}
      </section>

      <footer className="flex flex-col items-center gap-3">
        {showCompassButton && (
          <Button
            type="button"
            variant="secondary"
            className="w-full text-base"
            onClick={() => {
              // Must stay inside the click handler: iOS only grants motion access to a user gesture.
              void requestHeadingPermission();
            }}
          >
            <Compass className="size-5" strokeWidth={2} aria-hidden="true" />
            Włącz kompas
          </Button>
        )}
        <ExitLink />
      </footer>
    </main>
  );
}
