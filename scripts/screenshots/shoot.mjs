// iPhone 13 mini screenshots (375x812 @3x -> 1125x2436). Usage: npm run screenshots [-- name-filter]
// Needs a running app: BASE_URL (default http://localhost:4321).
import { mkdirSync } from "node:fs";
import { webkit, devices } from "playwright";
import { core } from "./scenarios.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4321";
const OUT = "screenshots/core";
const filter = process.argv[2];
mkdirSync(OUT, { recursive: true });

const device = {
  ...devices["iPhone 13 Mini"],
  viewport: { width: 375, height: 812 },
  screen: { width: 375, height: 812 },
  deviceScaleFactor: 3,
  locale: "pl-PL",
};

const browser = await webkit.launch();
let index = 0;
for (const scenario of core) {
  index += 1;
  if (filter && !scenario.name.includes(filter)) continue;
  const context = await browser.newContext(device);
  await context.addInitScript(
    ({ storage, pos, standalone }) => {
      for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, JSON.stringify(value));
      // A map flagged ready is only trusted when its OPFS file exists: stand in for the file (size + PMTiles magic).
      const map = storage["wrw.map"];
      if (map?.status === "ready") {
        const file = { size: map.bytes, slice: () => ({ arrayBuffer: async () => new TextEncoder().encode("PMTiles").buffer }) };
        Object.defineProperty(StorageManager.prototype, "getDirectory", {
          configurable: true,
          value: async () => ({ getFileHandle: async () => ({ getFile: async () => file }) }),
        });
      }
      if (standalone) Object.defineProperty(navigator, "standalone", { value: true });
      navigator.geolocation.watchPosition = (ok) => {
        if (pos) setTimeout(() => ok({ coords: { ...pos, heading: null, speed: null, altitude: null, altitudeAccuracy: null }, timestamp: Date.now() }), 100);
        return 1;
      };
      navigator.geolocation.getCurrentPosition = (ok) => {
        if (pos) ok({ coords: { ...pos, heading: null, speed: null, altitude: null, altitudeAccuracy: null }, timestamp: Date.now() });
      };
      // Compass: a steady heading so the arrow renders.
      setInterval(() => {
        const event = new Event("deviceorientation");
        Object.assign(event, { alpha: 0, beta: 0, gamma: 0, absolute: true, webkitCompassHeading: 45 });
        window.dispatchEvent(event);
      }, 300);
    },
    { storage: scenario.storage, pos: scenario.noPos ? null : (scenario.pos ?? null), standalone: scenario.standalone ?? false },
  );
  const page = await context.newPage();
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "astro-dev-toolbar{display:none!important}";
      document.head.appendChild(style);
    });
  });
  await page.goto(BASE_URL + scenario.path, { waitUntil: "networkidle" });
  if (scenario.resume) {
    // The run is seeded on the shelter step; the resume prompt must be confirmed to get to guidance.
    const resume = page.getByRole("button", { name: /wznów|kontynuuj|dalej/i }).first();
    if (await resume.isVisible().catch(() => false)) await resume.click();
  }
  if (scenario.ready) await page.waitForSelector(scenario.ready, { timeout: 8000 }).catch(() => console.warn(`! ${scenario.name}: "${scenario.ready}" not found`));
  if (scenario.action === "hold-alarm") {
    const box = await page.getByText("Uruchom alarm").first().boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(900);
    }
  }
  await page.waitForTimeout(800);
  const file = `${OUT}/${String(index).padStart(2, "0")}-${scenario.name}.png`;
  // Configurator subpages scroll; the alarm and home screens are one viewport by design.
  const fullPage = !["/", "/alarm"].includes(scenario.path);
  await page.screenshot({ path: file, fullPage });
  console.log(file);
  await context.close();
}
await browser.close();
