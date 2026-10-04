/** iOS keeps a home-screen PWA's storage apart from Safari's: a map downloaded in a Safari tab is not in the app. */
export function needsHomeScreenInstall(): boolean {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    matchMedia("(display-mode: standalone)").matches;
  return ios && !standalone;
}
