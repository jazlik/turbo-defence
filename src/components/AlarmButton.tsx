import { useEffect, useRef, useState } from "react";
import { Siren } from "lucide-react";

import { cn } from "@/lib/utils";

const HOLD_MS = 2000;
const RING_RADIUS = 20;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

export default function AlarmButton() {
  const [progress, setProgress] = useState(0);
  const holdStart = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const timer = useRef<number | null>(null);

  const stopTimers = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    if (timer.current !== null) window.clearTimeout(timer.current);
    frame.current = null;
    timer.current = null;
  };

  const cancel = () => {
    stopTimers();
    holdStart.current = null;
    setProgress(0);
  };

  const tick = (now: number) => {
    if (holdStart.current === null) return;
    setProgress(Math.min(1, (now - holdStart.current) / HOLD_MS));
    frame.current = requestAnimationFrame(tick);
  };

  const start = () => {
    if (holdStart.current !== null) return;
    holdStart.current = performance.now();
    frame.current = requestAnimationFrame(tick);
    timer.current = window.setTimeout(() => {
      stopTimers();
      window.location.assign("/alarm");
    }, HOLD_MS);
  };

  useEffect(() => stopTimers, []);

  const secondsLeft = Math.ceil(((1 - progress) * HOLD_MS) / 1000);
  const holding = progress > 0;

  return (
    <div>
      <button
        type="button"
        aria-describedby="alarm-hint"
        onPointerDown={(event) => {
          // Touch pointers are implicitly captured; release so sliding off the button fires pointerleave.
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          start();
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onKeyDown={(event) => {
          if ((event.key === " " || event.key === "Enter") && !event.repeat) {
            event.preventDefault();
            start();
          }
        }}
        onKeyUp={cancel}
        onBlur={cancel}
        onContextMenu={(event) => {
          event.preventDefault();
        }}
        className={cn(
          "flex min-h-16 w-full touch-none items-center justify-center gap-4 rounded-md px-6 text-lg font-semibold outline-none select-none [-webkit-touch-callout:none]",
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
      <p id="alarm-hint" className="text-muted-foreground mt-2 text-sm">
        Przytrzymaj przycisk przez 2 sekundy. Puszczenie wcześniej niczego nie uruchamia.
        {/* A screen-reader double-tap is a click, which the hold ignores; the passthrough gesture is the way in. */}
        <span className="sr-only"> Z czytnikiem ekranu: stuknij dwa razy i przytrzymaj.</span>
      </p>
    </div>
  );
}
