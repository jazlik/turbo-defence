import { useEffect, useState } from "react";
import { CheckCircle2, Compass, MapPinOff, Satellite, Volume2, VolumeX } from "lucide-react";

import DirectionArrow from "@/components/DirectionArrow";
import { useGeolocation } from "@/components/hooks/useGeolocation";
import { useNow } from "@/components/hooks/useNow";
import { useScreenWakeLock } from "@/components/hooks/useScreenWakeLock";
import { useVoiceGuidance } from "@/components/hooks/useVoiceGuidance";
import { Button } from "@/components/ui/button";
import { headingPermissionRequired, requestHeadingPermission, useHeading } from "@/components/hooks/useHeading";
import { bearingDegrees, distanceMeters, formatDistance, relativeBearing } from "@/lib/geo";
import { LOCATION_PROBLEMS } from "@/lib/guidance-copy";
import { readPlan, saveLastKnownPosition } from "@/lib/services/plan-storage";
import type { GuidanceVoiceState } from "@/lib/voice";

const ARRIVAL_RADIUS_METERS = 25;
// iOS forgets the motion permission between PWA launches; after this much compass silence offer to re-enable it.
const COMPASS_SILENCE_MS = 1000;

// watchPosition goes silent when the signal is lost; a fix older than this is shown as stale, not live.
const FIX_STALE_MS = 20_000;

/** "14:32" for today, "12.09, 14:32" otherwise — a position from weeks ago must not read as current. */
function formatFixTime(timestamp: number): string {
  const date = new Date(timestamp);
  const time = date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })}, ${time}`;
}

function ExitLink() {
  return (
    <Button asChild variant="link" className="text-muted-foreground hover:text-muted-foreground text-base">
      <a href="/">Wyjdź z trybu alarmu</a>
    </Button>
  );
}

function VoiceToggle({ voice }: { voice: ReturnType<typeof useVoiceGuidance> }) {
  if (voice.status === "unavailable") {
    return (
      <p className="text-muted-foreground flex items-center gap-2 text-base">
        <VolumeX className="size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
        Głos niedostępny na tym telefonie — prowadzenie tylko na ekranie
      </p>
    );
  }
  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full text-base"
      aria-pressed={voice.enabled}
      onClick={voice.toggle}
    >
      {voice.enabled ? (
        <Volume2 className="size-5" strokeWidth={2} aria-hidden="true" />
      ) : (
        <VolumeX className="size-5" strokeWidth={2} aria-hidden="true" />
      )}
      {voice.enabled ? "Głos: włączony" : "Głos: wyłączony"}
    </Button>
  );
}

export default function GuidanceScreen() {
  // Synchronous read: the target and instruction are on screen before any sensor answers.
  const [plan] = useState(readPlan);
  const point = plan.evacuationPoint;

  const { coords, accuracyMeters, fixedAt, status } = useGeolocation({ watch: point !== null });
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
  const distance = origin && point ? distanceMeters(origin, point.coords) : null;
  const locationProblemKind = liveFix === null && (status === "denied" || status === "unavailable") ? status : null;
  const locationProblem = locationProblemKind ? LOCATION_PROBLEMS[locationProblemKind] : null;
  // Only a live fix can confirm arrival — "Ustaw tutaj" stores the point itself as the last known position.
  const arrived = liveFix !== null && distance !== null && distance < ARRIVAL_RADIUS_METERS;
  const guiding = distance !== null && !arrived && !(isStale && distance < ARRIVAL_RADIUS_METERS);
  const rotation =
    origin && point && heading !== null ? relativeBearing(bearingDegrees(origin, point.coords), heading) : null;
  const showCompassButton = compassSilent && source !== "compass" && !arrived;

  let voiceState: GuidanceVoiceState;
  if (!point) voiceState = { kind: "noPoint" };
  else if (arrived) voiceState = { kind: "arrived", label: point.label };
  else if (guiding) voiceState = { kind: "guiding", label: point.label, meters: distance, live: !isStale };
  else if (locationProblemKind)
    voiceState = { kind: "locationProblem", label: point.label, problem: locationProblemKind };
  else voiceState = { kind: "searching", label: point.label };

  const voice = useVoiceGuidance(voiceState);

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
        <div className="flex flex-col items-center gap-3">
          <Button asChild size="lg" className="min-h-14 w-full text-lg font-semibold">
            <a href="/">Ustaw punkt ewakuacji</a>
          </Button>
          <VoiceToggle voice={voice} />
        </div>
      </main>
    );
  }

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
        {voice.status === "blocked" && (
          <Button
            type="button"
            size="lg"
            className="min-h-14 w-full text-lg font-semibold"
            // Must stay inside the click handler: browsers only start speech from a user gesture.
            onClick={voice.unlock}
          >
            <Volume2 className="size-6" strokeWidth={2} aria-hidden="true" />
            Włącz głos
          </Button>
        )}
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
        <VoiceToggle voice={voice} />
        <ExitLink />
      </footer>
    </main>
  );
}
