import { LEVELS, type ReadinessLevel as Level } from "@/lib/readiness";
import { cn } from "@/lib/utils";

/** Qualitative level, never a percentage (FR-009): four steps, the reached ones filled, the name stated in text. */
export default function ReadinessLevel({ level }: { level: Level }) {
  const following = LEVELS.at(level.index + 1);

  return (
    <section aria-labelledby="level-title" className="border-border bg-surface rounded-lg border p-6 shadow-sm sm:p-8">
      <p className="text-muted-foreground text-sm font-medium">Stan przygotowania</p>
      <h2 id="level-title" className="font-heading mt-1 text-3xl tracking-[-0.015em]">
        {level.title}
      </h2>
      <p className="text-muted-foreground mt-1">{level.description}</p>
      <div
        role="img"
        aria-label={`Etap ${String(level.index + 1)} z ${String(LEVELS.length)}`}
        className="mt-4 flex gap-2"
      >
        {LEVELS.map((step) => (
          <span
            key={step.id}
            aria-hidden="true"
            className={cn("h-2 flex-1 rounded-full", step.index <= level.index ? "bg-primary" : "bg-core-steel-soft")}
          />
        ))}
      </div>
      {following && <p className="text-muted-foreground mt-3 text-sm">Następny etap: {following.title}</p>}
    </section>
  );
}
