import { CheckCircle2, Smartphone } from "lucide-react";

import { installState } from "@/lib/services/install";

/** Only iOS needs it (a map downloaded in Safari is not visible in the home-screen app); elsewhere there is nothing to ask. */
export default function InstallCard() {
  const state = installState();
  if (state === "na") return null;

  return (
    <section
      aria-labelledby="install-card-title"
      className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-start gap-4">
        <div
          className="bg-core-steel-soft text-core-steel-deep flex size-11 shrink-0 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <Smartphone className="size-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h2 id="install-card-title" className="font-heading text-2xl tracking-[-0.015em]">
            Aplikacja na ekranie początkowym
          </h2>
          {state === "done" ? (
            <p className="text-safe mt-2 flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span>Aplikacja jest dodana do ekranu początkowego. Mapę pobierzesz w niej.</span>
            </p>
          ) : (
            <p className="text-muted-foreground mt-1">
              Udostępnij → Do ekranu początkowego, a potem otwórz aplikację stamtąd. Mapa pobrana w przeglądarce nie
              będzie widoczna w aplikacji.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
