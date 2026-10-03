/**
 * Whether the app shell is saved on this device so it opens without a network (service worker).
 * `na` is `astro dev`, where no worker is registered — nothing to ask there.
 * `unsupported`: no service worker API (e.g. plain http on a non-localhost address). `failed`: registration threw.
 */
export type OfflineShellState = "ready" | "pending" | "unsupported" | "failed" | "na";
