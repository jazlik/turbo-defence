import { useEffect, useState } from "react";
import { CheckCircle2, Compass, MapPinOff, Satellite } from "lucide-react";

import DirectionArrow from "@/components/DirectionArrow";
import { useGeolocation } from "@/components/hooks/useGeolocation";
import { headingPermissionRequired, requestHeadingPermission, useHeading } from "@/components/hooks/useHeading";
import { bearingDegrees, distanceMeters, formatDistance, relativeBearing } from "@/lib/geo";
import { readPlan, saveLastKnownPosition } from "@/lib/services/plan-storage";

const ARRIVAL_RADIUS_METERS = 25;
// iOS forgets the motion permission between PWA launches; after this much compass silence offer to re-enable it.
const COMPASS_SILENCE_MS = 1000;

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });

function useScreenWakeLock() {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let active = true;

    const acquire = async () => {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (active) sentinel = next;
        else void next.release();
      } catch {
        // Unsupported or refused (e.g. battery saver) — guidance works without it.
      }
    };

    // The lock is dropped whenever the page is hidden; take it again on return.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void sentinel?.release();
    };
  }, []);
}

function ExitLink() {
  return (
    <a
      href="/"
      className="text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-background inline-flex min-h-11 items-center justify-center rounded-md px-4 text-base font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-offset-2"
    >
      Wyjdź z trybu alarmu
    </a>
  );
}

export default function GuidanceScreen() {
  // Synchronous read: the target and instruction are on screen before any sensor answers.
  const [plan] = useState(readPlan);
  const point = plan.evacuationPoint;

  const { coords, accuracyMeters } = useGeolocation({ watch: point !== null });
  const { heading, source } = useHeading(coords, accuracyMeters);
  const [compassSilent, setCompassSilent] = useState(false);

  useScreenWakeLock();

  useEffect(() => {
    if (coords) saveLastKnownPosition(coords);
  }, [coords]);

  useEffect(() => {
    if (!headingPermissionRequired()) return;
    const timer = window.setTimeout(() => {
      setCompassSilent(true);
    }, COMPASS_SILENCE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  if (!point) {
    return (
      <main className="flex min-h-screen flex-col justify-between gap-8 px-4 py-8">
        <div>
          <MapPinOff className="text-guidance size-12" strokeWidth={2} aria-hidden="true" />
          <h1 className="font-heading mt-6 text-3xl">Nie wskazano punktu ewakuacji</h1>
          <p className="text-muted-foreground mt-3 text-lg">
            Bez zapisanego punktu nie mogę prowadzić. Wróć do planu i ustaw punkt — zajmie to chwilę.
          </p>
        </div>
        <a
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-pressed focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-14 w-full items-center justify-center rounded-md px-6 text-lg font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2"
        >
          Ustaw punkt ewakuacji
        </a>
      </main>
    );
  }

  const lastKnown = plan.lastKnownPosition;
  const origin = coords ?? lastKnown?.coords ?? null;
  const isStale = coords === null && lastKnown !== null;
  const distance = origin ? distanceMeters(origin, point.coords) : null;
  // Only a live fix can confirm arrival — "Ustaw tutaj" stores the point itself as the last known position.
  const arrived = coords !== null && distance !== null && distance < ARRIVAL_RADIUS_METERS;
  const guiding = distance !== null && !arrived && !(isStale && distance < ARRIVAL_RADIUS_METERS);
  const rotation = origin && heading !== null ? relativeBearing(bearingDegrees(origin, point.coords), heading) : null;
  const showCompassButton = compassSilent && source !== "compass" && !arrived;

  return (
    <main className="flex min-h-screen flex-col gap-6 px-4 py-6">
      <header>
        <p className="text-guidance text-lg font-semibold">Idź do punktu ewakuacji</p>
        <h1 className="font-heading mt-1 text-3xl break-words">{point.label}</h1>
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
            <div className="w-3/5 max-w-64">
              {rotation !== null ? (
                <DirectionArrow rotationDegrees={rotation} dimmed={isStale} />
              ) : (
                <p className="text-muted-foreground text-lg">Ustalam kierunek — zrób kilka kroków.</p>
              )}
            </div>
            <p className="font-operational text-display text-guidance">{formatDistance(distance)}</p>
            <p className="text-muted-foreground text-lg">w linii prostej</p>
            {isStale && (
              <p className="text-muted-foreground flex items-center gap-2 text-base">
                <Satellite className="size-5" strokeWidth={2} aria-hidden="true" />
                Dane z {formatTime(lastKnown.recordedAt)} — czekam na sygnał GPS
              </p>
            )}
            {rotation !== null && source === "movement" && (
              <p className="text-muted-foreground text-base">Kierunek liczony z marszu</p>
            )}
          </>
        )}

        {!arrived && !guiding && (
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
          <button
            type="button"
            onClick={() => {
              // Must stay inside the click handler: iOS only grants motion access to a user gesture.
              void requestHeadingPermission();
            }}
            className="bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-pressed focus-visible:ring-ring focus-visible:ring-offset-background flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-base font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2"
          >
            <Compass className="size-5" strokeWidth={2} aria-hidden="true" />
            Włącz kompas
          </button>
        )}
        <ExitLink />
      </footer>
    </main>
  );
}
