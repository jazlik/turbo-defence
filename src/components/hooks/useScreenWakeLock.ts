import { useEffect } from "react";

/** Keeps the screen on while mounted so guidance does not go dark mid-walk; silently skipped when unsupported. */
export function useScreenWakeLock() {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let active = true;

    const acquire = async () => {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (active) sentinel = next;
        else void next.release();
      } catch {
        // Unsupported or refused (e.g. battery saver) — guidance works without it.
      }
    };

    // The lock is dropped whenever the page is hidden; take it again on return.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void sentinel?.release();
    };
  }, []);
}
