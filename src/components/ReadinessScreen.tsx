import { ArrowRight, CheckCircle2, Download, LoaderCircle, Route, TriangleAlert } from "lucide-react";

import AlarmButton from "@/components/AlarmButton";
import AreaStrip from "@/components/AreaStrip";
import { useReadiness } from "@/components/hooks/useReadiness";
import ReadinessLevel from "@/components/ReadinessLevel";
import { Button } from "@/components/ui/button";
import type { QuickWin } from "@/lib/readiness";
import { isStandaloneApp } from "@/lib/services/install";

const stepTitle = (quickWin: QuickWin) =>
  quickWin.progress
    ? `${quickWin.title} (${String(quickWin.progress.done)} z ${String(quickWin.progress.total)})`
    : quickWin.title;

export default function ReadinessScreen() {
  const { level, next, areas, notices, mapSetup, routeSetup } = useReadiness();
  const standalone = isStandaloneApp();
  const mapReady = mapSetup.state?.status === "ready";
  const mapDownloading = mapSetup.state?.status === "downloading";
  const showSetup = standalone && (!mapReady || !routeSetup.state.primary);
  // A plan that could not be read says nothing about the household: no level, no invitation to write over it.
  const unreadable = notices.some((notice) => notice.id === "plan-unreadable");

  return (
    <>
      <div className="space-y-6">
        {/* Ekran nie ma widocznego tytułu: nagłówek zostaje dla czytników i struktury strony. */}
        <h1 className="sr-only">Gotowość do ewakuacji</h1>

        <div role="status" aria-live="polite" className="space-y-3 empty:hidden">
          {notices.map((notice) => (
            <p
              key={notice.id}
              className="border-border bg-surface text-attention-foreground flex items-start gap-3 rounded-md border p-4 text-sm"
            >
              <TriangleAlert className="mt-0.5 size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
              {notice.text}
            </p>
          ))}
        </div>

        {!unreadable && (
          <>
            <ReadinessLevel level={level} />

            {showSetup && (
              <section
                aria-labelledby="quick-setup-title"
                className="border-border bg-surface rounded-lg border p-6 shadow-sm"
              >
                <h2 id="quick-setup-title" className="font-heading text-2xl">
                  Przygotowanie do alarmu
                </h2>
                {!mapReady && (
                  <div className="mt-3 space-y-3" role="status" aria-live="polite">
                    <p className="text-muted-foreground">
                      {mapDownloading
                        ? `Pobieram mapę ${mapSetup.region.name}: ${Math.round((mapSetup.state?.receivedBytes ?? 0) / 1e6)} z ${Math.round((mapSetup.state?.bytes ?? mapSetup.region.bytes) / 1e6)} MB.`
                        : `Mapa ${mapSetup.region.name} jest potrzebna do prowadzenia offline.`}
                    </p>
                    {mapDownloading && (
                      <progress
                        className="w-full"
                        aria-label="Pobieranie mapy"
                        value={mapSetup.state?.receivedBytes ?? 0}
                        max={mapSetup.state?.bytes ?? mapSetup.region.bytes}
                      />
                    )}
                    {mapSetup.error && <p className="text-attention-foreground">{mapSetup.error}</p>}
                    {!mapSetup.supported && (
                      <p className="text-attention-foreground">
                        Ten telefon nie zapisze mapy offline. Alarm nadal poprowadzi do celu strzałką.
                      </p>
                    )}
                    {!mapDownloading && mapSetup.supported && !mapSetup.needsInstall && mapSetup.covers !== false && (
                      <Button type="button" size="lg" className="w-full" onClick={() => void mapSetup.start()}>
                        <Download strokeWidth={2} aria-hidden="true" />
                        {mapSetup.state?.status === "failed" ? "Dokończ pobieranie mapy" : "Pobierz mapę"}
                      </Button>
                    )}
                    {mapSetup.covers === false && (
                      <p className="text-attention-foreground">Mapa offline obejmuje teraz tylko Małopolskę.</p>
                    )}
                  </div>
                )}
                {mapReady && !routeSetup.state.primary && (
                  <div className="mt-3 space-y-3" role="status" aria-live="polite">
                    <p className="text-muted-foreground">
                      Wybierzemy schron A i B z danych PSP i zapiszemy trasy piesze. Do serwisu tras trafią tylko
                      współrzędne.
                    </p>
                    {routeSetup.refreshing ? (
                      <p className="text-muted-foreground flex items-center gap-2">
                        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Przygotowuję trasy…
                      </p>
                    ) : (
                      <Button
                        type="button"
                        size="lg"
                        className="w-full"
                        disabled={!routeSetup.online}
                        onClick={() => void routeSetup.consentAndRefresh()}
                      >
                        <Route strokeWidth={2} aria-hidden="true" />
                        Przygotuj schron i trasy
                      </Button>
                    )}
                    {!routeSetup.online && (
                      <p className="text-muted-foreground">Połącz z internetem, aby przygotować trasy.</p>
                    )}
                    {routeSetup.state.lastRefresh?.ok === false && (
                      <p className="text-attention-foreground">
                        Nie udało się przygotować trasy. Sprawdź lokalizację i spróbuj ponownie.
                      </p>
                    )}
                  </div>
                )}
              </section>
            )}
            {next ? (
              <section
                aria-labelledby="next-title"
                className="border-border bg-surface rounded-lg border p-6 shadow-md"
              >
                <p className="text-muted-foreground text-sm font-medium">Następny krok</p>
                <h2 id="next-title" className="font-heading mt-1 text-xl tracking-[-0.015em]">
                  {stepTitle(next)}
                </h2>
                <p className="text-muted-foreground mt-2">{next.reason}</p>
                <Button asChild size="lg" className="mt-4 w-full sm:w-auto">
                  <a href={next.href}>
                    {next.action}
                    <ArrowRight strokeWidth={2} aria-hidden="true" />
                  </a>
                </Button>
              </section>
            ) : (
              <section aria-labelledby="next-title">
                <h2 id="next-title" className="sr-only">
                  Następny krok
                </h2>
                <p className="text-safe flex items-start gap-2 text-lg">
                  <CheckCircle2 className="mt-1 size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span>Wszystko przygotowane.</span>
                </p>
              </section>
            )}

            <AreaStrip areas={areas} />

            <p className="text-muted-foreground text-sm">Plan zostaje na tym urządzeniu.</p>
          </>
        )}
      </div>

      <div className="border-border bg-background fixed inset-x-0 bottom-0 z-10 border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8">
        <div className="mx-auto max-w-2xl">
          <AlarmButton compact />
        </div>
      </div>
    </>
  );
}
