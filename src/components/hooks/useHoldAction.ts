import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";

export interface HoldHandlers {
  onPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onKeyUp: () => void;
  onBlur: () => void;
  onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
}

export interface HoldAction {
  /** 0–1, podstawa pierścienia postępu. */
  progress: number;
  holding: boolean;
  /** Do rozłożenia na elemencie `<button>`. */
  handlers: HoldHandlers;
}

/**
 * Automat przytrzymania wydzielony 1:1 z `AlarmButton` (S-01, sprawdzony w terenie).
 * Przytrzymanie chroni akcje, których nie da się cofnąć: alarm, przełączenie na miejsce
 * zapasowe i potwierdzenie dojścia bez potwierdzenia GPS.
 */
export function useHoldAction(holdMs: number, onComplete: () => void): HoldAction {
  const [progress, setProgress] = useState(0);
  const holdStart = useRef<number | null>(null);
  const frame = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  // Najnowszy callback bez restartowania automatu w trakcie przytrzymania.
  const complete = useRef(onComplete);

  useEffect(() => {
    complete.current = onComplete;
  }, [onComplete]);

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
    setProgress(Math.min(1, (now - holdStart.current) / holdMs));
    frame.current = requestAnimationFrame(tick);
  };

  const start = () => {
    if (holdStart.current !== null) return;
    holdStart.current = performance.now();
    frame.current = requestAnimationFrame(tick);
    timer.current = window.setTimeout(() => {
      // `cancel`, nie `stopTimers`: bez wyzerowania `holdStart` i `progress` automat zostaje
      // zablokowany, a przycisk, który przeżyje zakończenie, jest kontrolką jednorazową.
      cancel();
      complete.current();
    }, holdMs);
  };

  useEffect(() => stopTimers, []);

  return {
    progress,
    holding: progress > 0,
    handlers: {
      onPointerDown: (event) => {
        // Touch pointers are implicitly captured; release so sliding off the button fires pointerleave.
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        start();
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onKeyDown: (event) => {
        if ((event.key === " " || event.key === "Enter") && !event.repeat) {
          event.preventDefault();
          start();
        }
      },
      onKeyUp: cancel,
      onBlur: cancel,
      onContextMenu: (event) => {
        event.preventDefault();
      },
    },
  };
}
