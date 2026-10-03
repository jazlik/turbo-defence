import { useId, useState, type SyntheticEvent } from "react";
import { CheckCircle2, LocateFixed, MapPin, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { requestCurrentPosition, type GeolocationStatus } from "@/components/hooks/useGeolocation";
import { parseCoordinates } from "@/lib/geo";
import { readPlan, writePlan } from "@/lib/services/plan-storage";
import type { Coordinates, HouseholdPlan, PlaceKind } from "@/types";

const DEFAULT_LABELS: Record<PlaceKind, string> = {
  meeting: "Miejsce spotkania",
  backup: "Miejsce zapasowe",
  shelter: "Punkt ewakuacji",
};

const formatCoordinates = ({ latitude, longitude }: Coordinates) => `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

const LOCATION_ERRORS: Partial<Record<GeolocationStatus, string>> = {
  denied:
    "Brak zgody na lokalizację. Zezwól na nią w ustawieniach przeglądarki dla tej strony i spróbuj ponownie albo wpisz współrzędne.",
  unavailable:
    "Nie udało się ustalić pozycji. Wyjdź pod otwarte niebo i spróbuj ponownie albo wpisz współrzędne ręcznie.",
};

// Cicha awaria zapisu jest gorsza niż brak zapisu: użytkownik odchodzi przekonany, że plan jest na urządzeniu.
const STORAGE_ERROR =
  "Nie udało się zapisać na tym urządzeniu. Wyłącz tryb prywatny albo odblokuj dane witryny w ustawieniach przeglądarki i spróbuj ponownie.";

type Feedback = { kind: "saved"; text: string } | { kind: "error"; text: string } | null;

interface PlaceCardProps {
  kind: PlaceKind;
  title: string;
  description: string;
  /** Steruje wyłącznie wariantem „Ustaw tutaj”: trzy wypełnione przyciski obok siebie łamią §3 JV. */
  emphasis: "primary" | "secondary";
}

export default function PlaceCard({ kind, title, description, emphasis }: PlaceCardProps) {
  const [plan, setPlan] = useState<HouseholdPlan>(readPlan);
  const [label, setLabel] = useState(plan.places[kind]?.label ?? DEFAULT_LABELS[kind]);
  const [coordinatesInput, setCoordinatesInput] = useState("");
  const [locating, setLocating] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const ids = { title: useId(), label: useId(), coordinates: useId(), coordinatesError: useId() };

  /** `false`, gdy urządzenie odmówiło zapisu — wołający nie może wtedy potwierdzić zapisania. */
  const savePlace = (coords: Coordinates, withPosition: boolean): boolean => {
    const recordedAt = new Date().toISOString();
    // Trzy wyspy zapisują ten sam klucz: czytaj tuż przed zapisem, inaczej nadpiszesz miejsce z innej karty.
    const stored = readPlan();
    const next: HouseholdPlan = {
      ...stored,
      places: { ...stored.places, [kind]: { label: label.trim() || DEFAULT_LABELS[kind], coords } },
    };
    if (withPosition) next.lastKnownPosition = { coords, recordedAt };
    const saved = writePlan(next);
    setPlan(next);
    return saved;
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
    if (!savePlace(result.fix.coords, true)) {
      setFeedback({ kind: "error", text: STORAGE_ERROR });
      return;
    }
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
    if (!savePlace(parsed.coords, false)) {
      setFeedback({ kind: "error", text: STORAGE_ERROR });
      return;
    }
    setCoordinatesInput("");
    setFeedback({ kind: "saved", text: "Zapisano miejsce ze wpisanych współrzędnych." });
  };

  const place = plan.places[kind];

  return (
    <section aria-labelledby={ids.title} className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <div
          className="bg-core-steel-soft text-core-steel-deep flex size-11 shrink-0 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <MapPin className="size-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h3 id={ids.title} className="font-heading text-xl tracking-[-0.015em]">
            {title}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          {place ? (
            <p className="text-muted-foreground mt-2">
              <span className="text-foreground font-medium">{place.label}</span>
              <br />
              <span className="font-operational text-sm">{formatCoordinates(place.coords)}</span>
            </p>
          ) : (
            <p className="text-muted-foreground mt-2">Nie wskazano</p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <label htmlFor={ids.label} className="block text-sm font-medium">
          Nazwa miejsca
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
        variant={emphasis === "primary" ? "default" : "outline"}
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
