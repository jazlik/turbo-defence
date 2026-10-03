const base = (process.env.BASE_URL ?? "http://localhost:4321").replace(/\/$/, "");
const expectHeaders = process.env.EXPECT_HEADERS === "1";

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

async function get(path) {
  const res = await fetch(base + path);
  if (res.status !== 200) fail(`${path} returned ${res.status}`);
  return res;
}

const home = await get("/");
if (!(home.headers.get("content-type") ?? "").includes("text/html")) fail("/ is not HTML");
const html = await home.text();
if (!html.includes('lang="pl"')) fail('/ is missing lang="pl"');
if (!html.includes("manifest.webmanifest")) fail("/ does not link manifest.webmanifest");
// The readiness screen is a client:only island; its component URL in the island tag is its only static trace.
if (!html.includes("ReadinessScreen")) fail("/ is missing the readiness screen island");

const manifestRes = await get("/manifest.webmanifest");
const manifest = await manifestRes.json();
if (manifest.lang !== "pl") fail("manifest lang is not pl");
if (manifest.display !== "standalone") fail("manifest display is not standalone");
for (const icon of manifest.icons) {
  const res = await get(icon.src);
  if (!(res.headers.get("content-type") ?? "").includes("image/png")) fail(`${icon.src} is not image/png`);
}

const offlinePage = await get("/offline");
if (!(await offlinePage.text()).includes("OfflineShellCard")) fail("/offline is missing the offline shell card");

for (const path of ["/alarm", "/czujniki", "/domownicy", "/plecak", "/miejsca", "/offline"]) {
  const res = await get(path);
  if (!(res.headers.get("content-type") ?? "").includes("text/html")) fail(`${path} is not HTML`);
}

const sw = await get("/sw.js");
if (!(sw.headers.get("content-type") ?? "").includes("javascript")) fail("/sw.js is not JavaScript");
const swSource = await sw.text();
// build.format "file" makes Workbox cleanURLs match /alarm to alarm.html; alarm/index.html would miss offline.
for (const page of [
  "index.html",
  "alarm.html",
  "czujniki.html",
  "domownicy.html",
  "plecak.html",
  "miejsca.html",
  "offline.html",
]) {
  if (!swSource.includes(page)) fail(`/sw.js precache list does not include ${page}`);
}
// Offline guidance data: PSP shelter snapshot and map glyphs must be precached (S-04).
for (const asset of ["data/shelters-malopolska.json", "map/fonts/noto-sans-regular/0-255.pbf"]) {
  if (!swSource.includes(asset)) fail(`/sw.js precache list does not include ${asset}`);
}

if (expectHeaders) {
  const cc = sw.headers.get("cache-control") ?? "";
  if (!cc.includes("no-cache")) fail(`/sw.js Cache-Control is "${cc}", expected no-cache`);
}

console.log(`smoke OK (${base})`);
