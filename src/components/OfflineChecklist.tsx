import { CheckCircle2, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

export interface OfflineCheck {
  id: string;
  ok: boolean;
  label: string;
  /** What is wrong and what to do; shown only while `ok` is false. */
  problem?: string;
}

/** The one question of the /offline page: will the phone work without internet. Pure view of the checks. */
export default function OfflineChecklist({ checks }: { checks: readonly OfflineCheck[] }) {
  const allOk = checks.every((check) => check.ok);
  return (
    <section
      aria-labelledby="offline-check-title"
      className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8"
    >
      <h2 id="offline-check-title" className="font-heading text-2xl tracking-[-0.015em]">
        {allOk ? "Telefon zadziała bez internetu" : "Czy telefon zadziała bez internetu?"}
      </h2>
      <ul className="mt-4 space-y-3">
        {checks.map((check) => (
          <li key={check.id} className="flex items-start gap-3">
            {check.ok ? (
              <CheckCircle2 className="text-safe mt-0.5 size-5 shrink-0" strokeWidth={2} aria-hidden="true" />
            ) : (
              <TriangleAlert
                className="text-attention-foreground mt-0.5 size-5 shrink-0"
                strokeWidth={2}
                aria-hidden="true"
              />
            )}
            <div>
              <p className={cn("font-medium", check.ok && "text-safe")}>
                <span className="sr-only">{check.ok ? "Gotowe: " : "Wymaga uwagi: "}</span>
                {check.label}
              </p>
              {!check.ok && check.problem && <p className="text-muted-foreground text-sm">{check.problem}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
