import { useEffect, useState } from "react";

import type { OfflineShellState } from "@/lib/services/offline-shell";

function initialState(): OfflineShellState {
  if (!import.meta.env.PROD) return "na";
  if (!("serviceWorker" in navigator)) return "unsupported";
  if (document.documentElement.dataset.swFailed === "true") return "failed";
  return navigator.serviceWorker.controller ? "ready" : "pending";
}

/** Whether the app shell is saved on this device. Registration itself happens in `Layout.astro`. */
export function useOfflineShell(): OfflineShellState {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    let active = true;
    const onFailed = () => {
      if (active) setState("failed");
    };
    void navigator.serviceWorker.ready.then(() => {
      if (active) setState("ready");
    });
    window.addEventListener("wrw:sw-failed", onFailed);
    return () => {
      active = false;
      window.removeEventListener("wrw:sw-failed", onFailed);
    };
  }, []);

  return state;
}
