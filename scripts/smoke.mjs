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

const manifestRes = await get("/manifest.webmanifest");
const manifest = await manifestRes.json();
if (manifest.lang !== "pl") fail("manifest lang is not pl");
if (manifest.display !== "standalone") fail("manifest display is not standalone");
for (const icon of manifest.icons) {
  const res = await get(icon.src);
  if (!(res.headers.get("content-type") ?? "").includes("image/png")) fail(`${icon.src} is not image/png`);
}

const sw = await get("/sw.js");
if (!(sw.headers.get("content-type") ?? "").includes("javascript")) fail("/sw.js is not JavaScript");
if (!(await sw.text()).includes("index.html")) fail("/sw.js precache list does not include index.html");

if (expectHeaders) {
  const cc = sw.headers.get("cache-control") ?? "";
  if (!cc.includes("no-cache")) fail(`/sw.js Cache-Control is "${cc}", expected no-cache`);
}

console.log(`smoke OK (${base})`);
