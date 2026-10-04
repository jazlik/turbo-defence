import { CheckCircle2, LoaderCircle, TriangleAlert, WifiOff } from "lucide-react";

import { useOfflineShell } from "@/components/hooks/useOfflineShell";
import { cn } from "@/lib/utils";

/** `embedded`: a block inside a shared card (no frame of its own). */
export default function OfflineShellCard({ embedded = false }: { embedded?: boolean }) {
  const state = useOfflineShell();

  return (
    <section
      aria-labelledby="shell-card-title"
      className={cn(!embedded && "border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8")}
    >
      <div className="flex items-start gap-4">
        <div
          className="bg-core-steel-soft text-core-steel-deep flex size-11 shrink-0 items-center justify-center rounded-full"
          aria-hidden="true"
        >
          <WifiOff className="size-5" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h2 id="shell-card-title" className="font-heading text-2xl tracking-[-0.015em]">
            Tryb offline
          </h2>
          <div role="status" aria-live="polite" className="mt-2">
            {state === "ready" && (
              <p className="text-safe flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                <span>Gotowe do pracy offline. Aplikacja otworzy się bez internetu.</span>
              </p>
            )}
            {state === "pending" && (
              <p className="text-muted-foreground flex items-start gap-2">
                <LoaderCircle
                  className="mt-0.5 size-5 shrink-0 animate-spin motion-reduce:animate-none"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span>Zapisuję aplikację na tym urządzeniu…</span>
              </p>
            )}
            {state === "unsupported" && (
              <p className="text-attention-foreground flex items-start gap-2">
                <TriangleAlert className="mt-0.5 size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                <span>
                  Tryb offline jest niedostępny. Otwórz aplikację przez HTTPS w aktualnej przeglądarce — pod zwykłym
                  adresem http przeglądarka go blokuje.
                </span>
              </p>
            )}
            {state === "failed" && (
              <p className="text-attention-foreground flex items-start gap-2">
                <TriangleAlert className="mt-0.5 size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
                <span>
                  Nie udało się zapisać aplikacji na tym urządzeniu. Odśwież stronę przy włączonym internecie.
                </span>
              </p>
            )}
            {state === "na" && (
              <p className="text-muted-foreground">
                Tryb offline działa tylko w wersji produkcyjnej. W trybie deweloperskim jest wyłączony.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
