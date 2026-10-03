import { CheckCircle2, Download, Map as MapIcon, Smartphone, TriangleAlert } from "lucide-react";

import { useMapPackage } from "@/components/hooks/useMapPackage";
import { Button } from "@/components/ui/button";

const megabytes = (bytes: number) => `${Math.round(bytes / 1e6)} MB`;
const formatDay = (isoDate: string) =>
  new Date(isoDate).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function MapPackageCard() {
  const { state, region, covers, supported, needsInstall, error, start } = useMapPackage();
  const ready = state?.status === "ready";
  const downloading = state?.status === "downloading";
  const progress = state && state.bytes > 0 ? state.receivedBytes / state.bytes : 0;

  return (
    <section
      aria-labelledby="map-card-title"
      className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-start gap-4">
        <div
          className="bg-core-steel-soft text-core-steel-deep flex size-11 shrink-0 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <MapIcon className="size-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h2 id="map-card-title" className="font-heading text-2xl tracking-[-0.015em]">
            Mapa offline
          </h2>
          <p className="text-muted-foreground mt-1">
            Mapa regionu na telefonie: w kryzysie pokaże trasę i Twoją pozycję bez internetu.
          </p>
        </div>
      </div>

      <div role="status" aria-live="polite" className="mt-6 space-y-4">
        {!supported && (
          <p className="text-muted-foreground">
            Ta przeglądarka nie zapisze mapy offline. Prowadzenie strzałką działa bez niej.
          </p>
        )}

        {supported && ready && (
          <p className="text-safe flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
            <span>
              Mapa offline gotowa · {region.name} · dane OpenStreetMap z {formatDay(region.osmDate)}
            </span>
          </p>
        )}

        {supported && !ready && needsInstall && (
          <div className="space-y-3">
            <p className="flex items-start gap-2 font-medium">
              <Smartphone className="mt-0.5 size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
              Mapę offline pobierzesz w aplikacji na ekranie początkowym
            </p>
            <ol className="text-muted-foreground list-decimal space-y-1 pl-6 text-sm">
              <li>Stuknij „Udostępnij” (kwadrat ze strzałką) na dole Safari.</li>
              <li>Wybierz „Do ekranu początkowego” i potwierdź „Dodaj”.</li>
              <li>Otwórz „W razie W” z ekranu początkowego — tam pojawi się „Pobierz mapę”.</li>
            </ol>
            <p className="text-muted-foreground text-sm">
              Alarm działa także tutaj, w przeglądarce — prowadzi strzałką, bez mapy.
            </p>
          </div>
        )}

        {supported && !ready && !needsInstall && downloading && (
          <div className="space-y-2">
            <div
              className="bg-core-steel-soft h-2 w-full overflow-hidden rounded-full"
              role="progressbar"
              aria-label="Pobieranie mapy"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <div className="bg-primary h-full" style={{ width: `${(progress * 100).toFixed(1)}%` }} />
            </div>
            <p className="text-muted-foreground text-sm">
              Pobieram {region.name}: {megabytes(state.receivedBytes)} z {megabytes(state.bytes)}. Możesz zamknąć
              aplikację — dokończę przy następnym otwarciu.
            </p>
          </div>
        )}

        {supported && !ready && !needsInstall && !downloading && (
          <div className="space-y-4">
            <p>
              <span className="font-medium">{region.name}</span>
              <span className="text-muted-foreground"> · {megabytes(region.bytes)} · najlepiej przez Wi-Fi</span>
            </p>
            {covers === false && (
              <p className="text-muted-foreground text-sm">
                Mapa offline jest na razie dostępna tylko dla Małopolski — Twoja ostatnia pozycja leży poza nią.
              </p>
            )}
            <Button type="button" size="lg" className="w-full sm:w-auto" onClick={() => void start()}>
              <Download strokeWidth={2} aria-hidden="true" />
              {state?.status === "failed" ? "Dokończ pobieranie mapy" : "Pobierz mapę"}
            </Button>
          </div>
        )}

        {error && (
          <p className="text-attention-foreground flex items-start gap-2 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
            {error}
          </p>
        )}
      </div>

      <p className="text-muted-foreground mt-4 text-xs">Dane mapy © OpenStreetMap, Protomaps.</p>
    </section>
  );
}
