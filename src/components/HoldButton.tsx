import type { LucideIcon } from "lucide-react";

import { useHoldAction } from "@/components/hooks/useHoldAction";
import { cn } from "@/lib/utils";

const RING_RADIUS = 20;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

interface HoldButtonProps {
  holdMs: number;
  onComplete: () => void;
  label: string;
  /** Prefiks etykiety w trakcie przytrzymania; po nim pojawia się licznik sekund. */
  holdingLabel?: string;
  icon: LucideIcon;
  /** Kolory podaje wołający — komponent nie zna trybu. */
  className?: string;
}

/**
 * Drugorzędna akcja Execution Mode chroniona przytrzymaniem: ten sam wyuczony gest i to samo
 * sprzężenie zwrotne co `AlarmButton`, ale w hierarchii podrzędnej wobec prowadzenia (§18 JV).
 */
export default function HoldButton({
  holdMs,
  onComplete,
  label,
  holdingLabel = "Trzymaj jeszcze",
  icon: Icon,
  className,
}: HoldButtonProps) {
  const { progress, holding, handlers } = useHoldAction(holdMs, onComplete);
  const secondsLeft = Math.ceil(((1 - progress) * holdMs) / 1000);

  return (
    <button
      type="button"
      {...handlers}
      className={cn(
        "flex min-h-14 w-full touch-none items-center justify-center gap-3 rounded-md border px-4 text-base font-semibold outline-none select-none [-webkit-touch-callout:none]",
        "focus-visible:ring-offset-background focus-visible:ring-[3px] focus-visible:ring-offset-2",
        className,
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
          <Icon x={14} y={14} width={20} height={20} strokeWidth={2} />
        </g>
      </svg>
      <span className="flex flex-col items-start text-left">
        <span>{holding ? `${holdingLabel} ${secondsLeft} s` : label}</span>
        {!holding && <span className="text-sm font-normal opacity-80">Przytrzymaj {holdMs / 1000} s</span>}
      </span>
      {/* A screen-reader double-tap is a click, which the hold ignores; the passthrough gesture is the way in. */}
      <span className="sr-only"> Z czytnikiem ekranu: stuknij dwa razy i przytrzymaj.</span>
    </button>
  );
}
