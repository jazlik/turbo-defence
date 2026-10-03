import { useEffect, useState } from "react";

/** Current time in epoch ms, refreshed every `intervalMs` — re-renders time-based state such as data age. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}
