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
if (!html.includes("data-offline-status")) fail("/ is missing the offline status element");
// The three place cards are client:only islands; the section heading is their only static trace in the HTML.
if (!html.includes('id="places-title"')) fail("/ is missing the places section heading");

const manifestRes = await get("/manifest.webmanifest");
const manifest = await manifestRes.json();
if (manifest.lang !== "pl") fail("manifest lang is not pl");
if (manifest.display !== "standalone") fail("manifest display is not standalone");
for (const icon of manifest.icons) {
  const res = await get(icon.src);
  if (!(res.headers.get("content-type") ?? "").includes("image/png")) fail(`${icon.src} is not image/png`);
}

for (const path of ["/alarm", "/czujniki"]) {
  const res = await get(path);
  if (!(res.headers.get("content-type") ?? "").includes("text/html")) fail(`${path} is not HTML`);
}

const sw = await get("/sw.js");
if (!(sw.headers.get("content-type") ?? "").includes("javascript")) fail("/sw.js is not JavaScript");
const swSource = await sw.text();
// build.format "file" makes Workbox cleanURLs match /alarm to alarm.html; alarm/index.html would miss offline.
for (const page of ["index.html", "alarm.html", "czujniki.html"]) {
  if (!swSource.includes(page)) fail(`/sw.js precache list does not include ${page}`);
}

if (expectHeaders) {
  const cc = sw.headers.get("cache-control") ?? "";
  if (!cc.includes("no-cache")) fail(`/sw.js Cache-Control is "${cc}", expected no-cache`);
}

console.log(`smoke OK (${base})`);
