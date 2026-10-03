import { useEffect, useState } from "react";
import { ArrowRight, Backpack, Check, CheckCircle2, Compass, MapPinOff, Satellite, TriangleAlert } from "lucide-react";

import DirectionArrow from "@/components/DirectionArrow";
import HoldButton from "@/components/HoldButton";
import { useGeolocation } from "@/components/hooks/useGeolocation";
import { useNow } from "@/components/hooks/useNow";
import { useScreenWakeLock } from "@/components/hooks/useScreenWakeLock";
import { Button } from "@/components/ui/button";
import { headingPermissionRequired, requestHeadingPermission, useHeading } from "@/components/hooks/useHeading";
import { buildSteps, resumeIndex, stepContent, targetPlaceKind } from "@/lib/evacuation-steps";
import { bearingDegrees, distanceMeters, formatDistance, relativeBearing } from "@/lib/geo";
import { readPlan, saveLastKnownPosition } from "@/lib/services/plan-storage";
import { clearRun, readRun, writeRun } from "@/lib/services/run-storage";
import type { EvacuationRun } from "@/types";

const ARRIVAL_RADIUS_METERS = 25;
// iOS forgets the motion permission between PWA launches; after this much compass silence offer to re-enable it.
const COMPASS_SILENCE_MS = 1000;

// watchPosition goes silent when the signal is lost; a fix older than this is shown as stale, not live.
const FIX_STALE_MS = 20_000;

// Ten sam czas co alarm: jeden wyuczony gest dla akcji, których nie da się cofnąć.
const HOLD_MS = 2000;

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

/** "14:32" for today, "12.09, 14:32" otherwise — a position from weeks ago must not read as current. */
function formatFixTime(timestamp: number): string {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}, ${time}`;
}

function MissingPlaceScreen() {
  return (
    <main className="flex min-h-screen flex-col justify-between gap-8 px-4 py-8">
      <div>
        <MapPinOff className="text-guidance size-12" strokeWidth={2} aria-hidden="true" />
        <h1 className="font-heading mt-6 text-3xl">Nie wskazano żadnego miejsca</h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Bez zapisanego miejsca nie mogę prowadzić. Wróć do planu i ustaw miejsce spotkania albo punkt ewakuacji —
          zajmie to chwilę.
        </p>
      </div>
      <Button asChild size="lg" className="min-h-14 w-full text-lg font-semibold">
        <a href="/">Ustaw miejsca w planie</a>
      </Button>
    </main>
  );
}

function ExitLink() {
  return (
    <Button asChild variant="link" className="text-muted-foreground hover:text-muted-foreground text-base">
      <a href="/">Wyjdź z trybu alarmu</a>
    </Button>
  );
}

/**
 * Jeden synchroniczny odczyt planu i przebiegu. Musi dołączyć do pierwszego przebiegu renderowania:
 * `useEffect` pokazałby na moment krok pierwszy, a potem przeskoczył na wznowiony.
 */
function readSession() {
  const plan = readPlan();
  const steps = buildSteps(plan);
  const run = readRun();
  return { plan, steps, run, stepIndex: resumeIndex(steps, run) };
}

export default function GuidanceScreen() {
  const [session] = useState(readSession);
  const { plan, steps } = session;
  const [run, setRun] = useState(session.run);
  const [stepIndex, setStepIndex] = useState(session.stepIndex);
  // Dwustopniowe wyjście bez potwierdzenia GPS: przytrzymanie, a potem dotknięcie potwierdzenia.
  const [confirming, setConfirming] = useState(false);
  const [confirmedArrival, setConfirmedArrival] = useState(false);

  // `at` zwraca `undefined` poza zakresem — indeksowanie nawiasem kłamałoby o typie przy pustej sekwencji.
  const step = steps.at(stepIndex);
  const nextStep = steps.at(stepIndex + 1);
  const targetKind = step ? targetPlaceKind(step, run) : null;
  const point = targetKind ? plan.places[targetKind] : null;

  const { coords, accuracyMeters, fixedAt, status } = useGeolocation({ watch: steps.length > 0 });
  const { heading, source } = useHeading(coords, accuracyMeters);
  const [compassSilent, setCompassSilent] = useState(false);
  const now = useNow(5_000);

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

  const runAt = (stepId: string, fallbackActive: boolean): EvacuationRun => {
    const timestamp = new Date().toISOString();
    return {
      schemaVersion: 1,
      stepId,
      fallbackActive,
      startedAt: run?.startedAt ?? timestamp,
      updatedAt: timestamp,
    };
  };

  const goToNextStep = () => {
    if (nextStep === undefined) return;
    // Zapis przebiegu i podmiana widoku w jednej aktualizacji stanu.
    const next = runAt(nextStep.id, false);
    writeRun(next);
    setRun(next);
    setStepIndex(stepIndex + 1);
    setConfirming(false);
    setConfirmedArrival(false);
  };

  const switchToFallback = () => {
    if (step?.kind !== "navigate" || step.fallback === null) return;
    // Flaga musi trafić do stanu w tym samym renderze co do localStorage: inaczej strzałka
    // pokazywałaby stary kierunek, czyli w kryzysie wskazywała w złe miejsce.
    const next = runAt(step.id, true);
    writeRun(next);
    setRun(next);
  };

  const confirmArrival = () => {
    setConfirming(false);
    if (nextStep !== undefined) goToNextStep();
    else setConfirmedArrival(true);
  };

  const finishRun = () => {
    clearRun();
    window.location.assign("/");
  };

  if (step === undefined) return <MissingPlaceScreen />;

  const content = stepContent(step, run);

  if (step.kind === "action") {
    return (
      <main className="flex min-h-screen flex-col gap-6 px-4 py-6">
        <header>
          <p className="text-guidance text-lg font-semibold">Następny krok</p>
          <h1 className="font-heading mt-1 text-3xl break-words">{content.title}</h1>
        </header>

        <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Backpack className="text-guidance size-24" strokeWidth={2} aria-hidden="true" />
          <p className="text-xl">{content.instruction}</p>
        </section>

        <footer className="flex flex-col items-center gap-3">
          <Button type="button" size="lg" className="min-h-14 w-full text-lg font-semibold" onClick={goToNextStep}>
            <Check strokeWidth={2} aria-hidden="true" />
            Zrobione — dalej
          </Button>
          <ExitLink />
        </footer>
      </main>
    );
  }

  // `buildSteps` tworzy krok `navigate` tylko dla ustawionego miejsca, więc to stan nieosiągalny
  // przy spójnym planie — ekran prowadzenia nigdy nie pokazuje kroku bez celu.
  if (point === null) return <MissingPlaceScreen />;

  const liveFix = coords !== null && fixedAt !== null && now - fixedAt < FIX_STALE_MS ? coords : null;
  // Without a live fix fall back to this session's last fix, then to the position saved before the alarm.
  const lastKnown = plan.lastKnownPosition;
  const staleFix =
    coords !== null && fixedAt !== null
      ? { coords, recordedAt: fixedAt }
      : lastKnown
        ? { coords: lastKnown.coords, recordedAt: Date.parse(lastKnown.recordedAt) }
        : null;
  const origin = liveFix ?? staleFix?.coords ?? null;
  const isStale = liveFix === null && staleFix !== null;
  const distance = origin ? distanceMeters(origin, point.coords) : null;
  const locationProblem =
    liveFix === null && (status === "denied" || status === "unavailable") ? LOCATION_PROBLEMS[status] : null;
  // Only a live fix can confirm arrival — "Ustaw tutaj" stores the point itself as the last known position.
  const arrived = liveFix !== null && distance !== null && distance < ARRIVAL_RADIUS_METERS;
  const showArrival = arrived || confirmedArrival;
  const guiding = !showArrival && distance !== null && !(isStale && distance < ARRIVAL_RADIUS_METERS);
  const rotation = origin && heading !== null ? relativeBearing(bearingDegrees(origin, point.coords), heading) : null;
  const showCompassButton = compassSilent && source !== "compass" && !showArrival;
  const fallbackAvailable = step.fallback !== null && !(run?.fallbackActive ?? false);

  return (
    <main className="flex min-h-screen flex-col gap-6 px-4 py-6">
      <header>
        <p className="text-guidance text-lg font-semibold">{content.title}</p>
        <h1 className="font-heading mt-1 text-3xl break-words">{point.label}</h1>
      </header>

      <section aria-live="polite" className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        {showArrival && (
          <>
            <CheckCircle2 className="text-safe size-24" strokeWidth={2} aria-hidden="true" />
            <p className="font-heading text-display text-safe">Jesteś na miejscu</p>
            <p className="text-muted-foreground text-lg">
              {nextStep !== undefined
                ? "Zostań tutaj i czekaj na pozostałych domowników."
                : "Dotarliście na miejsce. To koniec zaplanowanej drogi."}
            </p>
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
                Dane z {formatFixTime(staleFix.recordedAt)} —{" "}
                {locationProblem ? locationProblem.title.toLowerCase() : "czekam na sygnał GPS"}
              </p>
            )}
            {locationProblem && <p className="text-muted-foreground text-base">{locationProblem.instruction}</p>}
            {rotation !== null && source === "movement" && (
              <p className="text-muted-foreground text-base">Kierunek liczony z marszu</p>
            )}
          </>
        )}

        {!showArrival && !guiding && locationProblem && (
          <>
            <MapPinOff className="text-guidance size-16" strokeWidth={2} aria-hidden="true" />
            <p className="font-heading text-2xl">{locationProblem.title}</p>
            <p className="text-muted-foreground text-lg">{locationProblem.instruction}</p>
          </>
        )}

        {!showArrival && !guiding && !locationProblem && (
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
        {showArrival &&
          (nextStep !== undefined ? (
            <Button type="button" size="lg" className="min-h-14 w-full text-lg font-semibold" onClick={goToNextStep}>
              <ArrowRight strokeWidth={2} aria-hidden="true" />
              Dalej: {nextStep.title}
            </Button>
          ) : (
            <Button type="button" size="lg" className="min-h-14 w-full text-lg font-semibold" onClick={finishRun}>
              <Check strokeWidth={2} aria-hidden="true" />
              Zakończ tryb alarmu
            </Button>
          ))}

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

        {fallbackAvailable && (
          <HoldButton
            holdMs={HOLD_MS}
            onComplete={switchToFallback}
            label="Punkt niedostępny — idź do zapasowego"
            icon={TriangleAlert}
            hintId="hold-hint"
            className="border-destructive text-destructive focus-visible:ring-destructive active:bg-surface-secondary"
          />
        )}

        {!showArrival &&
          (confirming ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-14 w-full text-base font-semibold"
              onClick={confirmArrival}
            >
              <Check strokeWidth={2} aria-hidden="true" />
              Potwierdź: jestem na miejscu
            </Button>
          ) : (
            <HoldButton
              holdMs={HOLD_MS}
              onComplete={() => {
                setConfirming(true);
              }}
              label="Potwierdź dojście"
              icon={Check}
              hintId="hold-hint"
              className="border-input text-foreground focus-visible:ring-ring active:bg-surface-secondary"
            />
          ))}

        {(fallbackAvailable || (!showArrival && !confirming)) && (
          <p id="hold-hint" className="text-muted-foreground text-sm">
            Akcje z pierścieniem przytrzymaj przez 2 sekundy.
          </p>
        )}

        <ExitLink />
      </footer>
    </main>
  );
}
