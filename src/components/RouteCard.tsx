import { CheckCircle2, LoaderCircle, Route, TriangleAlert, WifiOff } from "lucide-react";

import { useRouteRefresh } from "@/components/hooks/useRouteRefresh";
import { Button } from "@/components/ui/button";
import { formatClockTime } from "@/lib/format";
import { formatDistance } from "@/lib/geo";
import type { RouteRefreshFailure, SavedRoute } from "@/types";

const FAILURES: Record<RouteRefreshFailure, string> = {
  offline: "Brak internetu — trasę przygotuję, gdy wróci sieć.",
  "no-position": "Nie udało się ustalić pozycji. Sprawdź zgodę na lokalizację i spróbuj ponownie na zewnątrz.",
  "no-candidates":
    "W promieniu 15 km nie ma punktu schronienia z danych PSP (na razie Małopolska). Prowadzenie użyje Twojego punktu zapasowego.",
  "routing-error": "Serwis tras nie odpowiedział. Spróbuję ponownie przy następnym otwarciu aplikacji.",
};

const formatWalk = (route: SavedRoute) =>
  route.durationSeconds === null
    ? formatDistance(route.distanceMeters)
    : `${formatDistance(route.distanceMeters)} · ${Math.max(1, Math.round(route.durationSeconds / 60))} min pieszo`;

function RouteSummary({ route, role }: { route: SavedRoute; role: "primary" | "alternate" }) {
  const { destination } = route;
  return (
    <div>
      <p className="text-muted-foreground text-sm">{role === "primary" ? "Schron" : "Zapasowy"}</p>
      <p className="font-medium">{destination.address ?? destination.label}</p>
      <p className="text-muted-foreground text-sm">
        {formatWalk(route)}
        {destination.availability ? ` · dostępność: ${destination.availability.toLowerCase()}` : ""}
      </p>
    </div>
  );
}

export default function RouteCard() {
  const { state, refreshing, online, consentAndRefresh } = useRouteRefresh();
  const { primary, alternate, lastRefresh } = state;
  const failure = lastRefresh && !lastRefresh.ok ? lastRefresh.reason : undefined;

  return (
    <section
      aria-labelledby="route-card-title"
      className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-start gap-4">
        <div
          className="bg-core-steel-soft text-core-steel-deep flex size-11 shrink-0 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <Route className="size-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h2 id="route-card-title" className="font-heading text-2xl tracking-[-0.015em]">
            Schron i trasa
          </h2>
          <p className="text-muted-foreground mt-1">
            Aplikacja sama wybierze najbliższy punkt schronienia i przygotuje trasę pieszą, która zadziała bez
            internetu.
          </p>
        </div>
      </div>

      {primary ? (
        <div className="mt-6 space-y-4">
          <RouteSummary route={primary} role="primary" />
          {alternate && <RouteSummary route={alternate} role="alternate" />}
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <CheckCircle2 className="text-safe size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            Trasa przygotowana o {formatClockTime(Date.parse(primary.createdAt))}
          </p>
        </div>
      ) : (
        !state.routingConsent && (
          <div className="mt-6 space-y-4">
            <p className="text-muted-foreground text-sm">
              Do serwisu tras trafiają tylko współrzędne: Twoja pozycja i pobliskie punkty schronienia. Plan rodziny
              zostaje na telefonie.
            </p>
            <Button type="button" size="lg" className="w-full sm:w-auto" onClick={() => void consentAndRefresh()}>
              <Route strokeWidth={2} aria-hidden="true" />
              Wybierz schron i przygotuj trasę
            </Button>
          </div>
        )
      )}

      <div role="status" aria-live="polite" className="mt-4 space-y-2 text-sm empty:hidden">
        {refreshing && (
          <p className="text-muted-foreground flex items-center gap-2">
            <LoaderCircle
              className="size-4 animate-spin motion-reduce:animate-none"
              strokeWidth={2}
              aria-hidden="true"
            />
            Szukam najbliższego schronu i przygotowuję trasę…
          </p>
        )}
        {!online && state.routingConsent && (
          <p className="text-muted-foreground flex items-start gap-2">
            <WifiOff className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            {primary
              ? `Bez internetu — używam trasy z ${formatClockTime(Date.parse(primary.createdAt))}.`
              : FAILURES.offline}
          </p>
        )}
        {online && !refreshing && failure && (
          <p className="text-attention-foreground flex items-start gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            {FAILURES[failure]}
          </p>
        )}
      </div>

      {online && !refreshing && state.routingConsent && (failure !== undefined || !primary) && (
        <Button type="button" variant="outline" className="mt-4" onClick={() => void consentAndRefresh()}>
          <Route strokeWidth={2} aria-hidden="true" />
          Spróbuj ponownie
        </Button>
      )}

      {state.routingConsent && (
        <p className="text-muted-foreground mt-4 text-xs">
          Punkty schronienia: KG PSP, dane.gov.pl (CC BY 4.0). Trasy: © OpenStreetMap, FOSSGIS.{" "}
          <a className="underline" href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer">
            Zgłoś błąd mapy
          </a>
        </p>
      )}
    </section>
  );
}
