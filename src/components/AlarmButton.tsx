import { Siren } from "lucide-react";

import { useHoldAction } from "@/components/hooks/useHoldAction";
import { cn } from "@/lib/utils";

const HOLD_MS = 2000;
const RING_RADIUS = 20;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

interface AlarmButtonProps {
  /** Przyklejony do dołu ekranu gotowości: niższy przycisk i drobniejsza podpowiedź, ten sam automat przytrzymania. */
  compact?: boolean;
}

export default function AlarmButton({ compact = false }: AlarmButtonProps) {
  const { progress, holding, handlers } = useHoldAction(HOLD_MS, () => {
    window.location.assign("/alarm");
  });

  const secondsLeft = Math.ceil(((1 - progress) * HOLD_MS) / 1000);

  return (
    <div>
      <button
        type="button"
        aria-describedby="alarm-hint"
        {...handlers}
        className={cn(
          compact ? "min-h-14" : "min-h-16",
          "flex w-full touch-none items-center justify-center gap-4 rounded-md px-6 text-lg font-semibold outline-none select-none [-webkit-touch-callout:none]",
          "bg-destructive text-destructive-foreground active:bg-destructive-pressed",
          "focus-visible:ring-destructive focus-visible:ring-offset-background focus-visible:ring-[3px] focus-visible:ring-offset-2",
        )}
      >
        <svg viewBox="0 0 48 48" className="size-11 shrink-0 -rotate-90" aria-hidden="true">
          <circle
            cx="24"
            cy="24"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.35}
            strokeWidth={4}
          />
          <circle
            cx="24"
            cy="24"
            r={RING_RADIUS}
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - progress)}
          />
          <g className="[transform-origin:24px_24px] rotate-90">
            <Siren x={14} y={14} width={20} height={20} strokeWidth={2} />
          </g>
        </svg>
        <span>{holding ? `Trzymaj jeszcze ${secondsLeft} s` : "Uruchom alarm"}</span>
      </button>
      <p id="alarm-hint" className={cn("text-muted-foreground mt-2", compact ? "text-xs" : "text-sm")}>
        Przytrzymaj przycisk przez 2 sekundy. Puszczenie wcześniej niczego nie uruchamia.
        {/* A screen-reader double-tap is a click, which the hold ignores; the passthrough gesture is the way in. */}
        <span className="sr-only"> Z czytnikiem ekranu: stuknij dwa razy i przytrzymaj.</span>
      </p>
    </div>
  );
}
