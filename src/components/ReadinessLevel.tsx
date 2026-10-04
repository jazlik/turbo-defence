import { LEVELS, type ReadinessLevel as Level } from "@/lib/readiness";
import { cn } from "@/lib/utils";

/**
 * Compact status pinned under the app bar: the level is read at a glance and stays visible while the page scrolls.
 * Qualitative level, never a percentage (FR-009): four steps, the reached ones filled, the name stated in text.
 * The offset matches the fixed height of the header in `HomeScreen.astro`.
 */
export default function ReadinessLevel({ level }: { level: Level }) {
  return (
    <section
      aria-labelledby="level-title"
      className="bg-background border-border sticky top-[4.5rem] z-10 -mx-4 border-b px-4 py-3 sm:-mx-8 sm:px-8"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="level-title" className="font-heading text-base font-semibold">
          <span className="sr-only">Stan przygotowania: </span>
          {level.title}
        </h2>
        <p className="text-muted-foreground shrink-0 text-sm font-medium">
          {level.index + 1} z {LEVELS.length}
        </p>
      </div>
      <div
        role="img"
        aria-label={`Etap ${String(level.index + 1)} z ${String(LEVELS.length)}`}
        className="mt-2 flex gap-2"
      >
        {LEVELS.map((step) => (
          <span
            key={step.id}
            aria-hidden="true"
            className={cn("h-1.5 flex-1 rounded-full", step.index <= level.index ? "bg-primary" : "bg-core-steel-soft")}
          />
        ))}
      </div>
    </section>
  );
}
