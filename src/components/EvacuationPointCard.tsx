import { useId, useState, type SyntheticEvent } from "react";
import { CheckCircle2, LocateFixed, MapPin, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requestCurrentPosition, type GeolocationStatus } from "@/components/hooks/useGeolocation";
import { parseCoordinates } from "@/lib/geo";
import { readPlan, writePlan } from "@/lib/services/plan-storage";
import type { Coordinates, HouseholdPlan } from "@/types";

const DEFAULT_LABEL = "Punkt ewakuacji";

const formatCoordinates = ({ latitude, longitude }: Coordinates) => `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

const LOCATION_ERRORS: Partial<Record<GeolocationStatus, string>> = {
  denied:
    "Brak zgody na lokalizację. Zezwól na nią w ustawieniach przeglądarki dla tej strony i spróbuj ponownie albo wpisz współrzędne.",
  unavailable:
    "Nie udało się ustalić pozycji. Wyjdź pod otwarte niebo i spróbuj ponownie albo wpisz współrzędne ręcznie.",
};

type Feedback = { kind: "saved"; text: string } | { kind: "error"; text: string } | null;

export default function EvacuationPointCard() {
  const [plan, setPlan] = useState<HouseholdPlan>(readPlan);
  const [label, setLabel] = useState(plan.evacuationPoint?.label ?? DEFAULT_LABEL);
  const [coordinatesInput, setCoordinatesInput] = useState("");
  const [locating, setLocating] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const ids = { label: useId(), coordinates: useId(), coordinatesError: useId() };

  const savePoint = (coords: Coordinates, withPosition: boolean) => {
    const recordedAt = new Date().toISOString();
    const next: HouseholdPlan = {
      ...readPlan(),
      evacuationPoint: { label: label.trim() || DEFAULT_LABEL, coords },
    };
    if (withPosition) next.lastKnownPosition = { coords, recordedAt };
    writePlan(next);
    setPlan(next);
  };

  const setHere = async () => {
    setLocating(true);
    setFeedback(null);
    const result = await requestCurrentPosition();
    setLocating(false);
    if (!result.ok) {
      setFeedback({ kind: "error", text: LOCATION_ERRORS[result.status] ?? LOCATION_ERRORS.unavailable ?? "" });
      return;
    }
    savePoint(result.fix.coords, true);
    setFeedback({
      kind: "saved",
      text: `Zapisano bieżącą pozycję (dokładność ±${Math.round(result.fix.accuracyMeters)} m).`,
    });
  };

  const saveTyped = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseCoordinates(coordinatesInput);
    if (!parsed.ok) {
      setInputError(
        parsed.reason === "format"
          ? "Wpisz dwie liczby oddzielone przecinkiem, np. 52.2297, 21.0122."
          : "Szerokość musi mieścić się w zakresie od −90 do 90, a długość od −180 do 180.",
      );
      return;
    }
    setInputError(null);
    savePoint(parsed.coords, false);
    setCoordinatesInput("");
    setFeedback({ kind: "saved", text: "Zapisano punkt ze wpisanych współrzędnych." });
  };

  const point = plan.evacuationPoint;

  return (
    <section
      aria-labelledby="evacuation-point-title"
      className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-start gap-4">
        <div
          className="bg-core-steel-soft text-core-steel-deep flex size-11 shrink-0 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <MapPin className="size-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h2 id="evacuation-point-title" className="font-heading text-2xl tracking-[-0.015em]">
            Punkt ewakuacji
          </h2>
          {point ? (
            <p className="text-muted-foreground mt-1">
              <span className="text-foreground font-medium">{point.label}</span>
              <br />
              <span className="font-operational text-sm">{formatCoordinates(point.coords)}</span>
            </p>
          ) : (
            <p className="text-muted-foreground mt-1">Punkt ewakuacji: nie wskazano</p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <label htmlFor={ids.label} className="block text-sm font-medium">
          Nazwa punktu
        </label>
        <input
          id={ids.label}
          type="text"
          value={label}
          onChange={(event) => {
            setLabel(event.target.value);
          }}
          className="border-input bg-surface focus-visible:ring-ring focus-visible:ring-offset-background h-11 w-full rounded-md border px-3 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2"
        />
      </div>

      <Button
        type="button"
        size="lg"
        className="mt-4 w-full sm:w-auto"
        aria-busy={locating}
        onClick={() => void setHere()}
      >
        <LocateFixed strokeWidth={2} aria-hidden="true" />
        {locating ? "Ustalam pozycję…" : "Ustaw tutaj"}
      </Button>

      <form onSubmit={saveTyped} noValidate className="border-border mt-6 space-y-2 border-t pt-6">
        <label htmlFor={ids.coordinates} className="block text-sm font-medium">
          Albo wpisz współrzędne
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id={ids.coordinates}
            type="text"
            autoComplete="off"
            placeholder="52.2297, 21.0122"
            value={coordinatesInput}
            aria-invalid={inputError !== null}
            aria-describedby={inputError ? ids.coordinatesError : undefined}
            onChange={(event) => {
              setCoordinatesInput(event.target.value);
            }}
            className="font-operational border-input bg-surface focus-visible:ring-ring focus-visible:ring-offset-background aria-invalid:border-destructive h-11 w-full min-w-0 rounded-md border px-3 text-base outline-none focus-visible:ring-[3px] focus-visible:ring-offset-2"
          />
          <Button type="submit" variant="outline">
            Zapisz współrzędne
          </Button>
        </div>
        {inputError && (
          <p id={ids.coordinatesError} className="text-destructive flex items-start gap-2 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            {inputError}
          </p>
        )}
      </form>

      <div role="status" aria-live="polite" className="mt-4 empty:hidden">
        {feedback?.kind === "saved" && (
          <p className="text-safe flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            {feedback.text}
          </p>
        )}
        {feedback?.kind === "error" && (
          <p className="text-attention-foreground flex items-start gap-2 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            {feedback.text}
          </p>
        )}
      </div>
    </section>
  );
}
