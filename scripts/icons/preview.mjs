// Arkusz wyboru ikony aplikacji: każdy kandydat SVG pokazany tak, jak
// zobaczy go użytkownik — duża ikona, przycięcie maskable (koło w strefie
// bezpiecznej 80%), ekran główny na jasnej i ciemnej tapecie, favicon 32 i 16 px.
//
// Użycie: node scripts/icons/preview.mjs <katalog>
// <katalog>/*.svg → <katalog>/sheet.png
import { Buffer } from "node:buffer";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROW = 220;
const GAP = 24;
const LABEL_WIDTH = 220;

const svg = (width, height, body) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`);
const escape = (text) => text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

async function render(source, size) {
  return sharp(source, { density: Math.max(72, (72 * size) / 64) })
    .resize(size, size)
    .png()
    .toBuffer();
}

/** Koło o średnicy 80% — tyle zostaje z ikony maskable przy najciaśniejszej masce. */
async function maskable(source, size) {
  const mask = svg(size, size, `<circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.4}" fill="#fff"/>`);
  return sharp(await render(source, size))
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function homeScreen(source, wallpaper) {
  const width = 200;
  const tile = 56;
  const icon = await sharp(await render(source, tile))
    .composite([
      { input: svg(tile, tile, `<rect width="${tile}" height="${tile}" rx="13" fill="#fff"/>`), blend: "dest-in" },
    ])
    .png()
    .toBuffer();
  const neighbours = [0, 1, 2]
    .map(
      (i) =>
        `<rect x="${16 + i * 64}" y="${GAP + 90}" width="${tile}" height="${tile}" rx="13" fill="#ffffff" opacity="0.25"/>`,
    )
    .join("");
  return sharp(svg(width, ROW - GAP, `<rect width="100%" height="100%" rx="16" fill="${wallpaper}"/>${neighbours}`))
    .composite([{ input: icon, left: 16 + 64, top: GAP + 20 }])
    .png()
    .toBuffer();
}

async function tab(source) {
  const width = 200;
  const icons = [];
  for (const [size, top] of [
    [32, 40],
    [16, 110],
  ]) {
    icons.push({ input: await render(source, size), left: 24, top });
  }
  const body = `<rect width="100%" height="100%" rx="16" fill="#E7E9EA"/>
    <rect x="12" y="28" width="176" height="56" rx="8" fill="#FAFAFA"/>
    <rect x="68" y="50" width="100" height="12" rx="6" fill="#A8B0B5"/>
    <rect x="12" y="98" width="176" height="40" rx="8" fill="#FAFAFA"/>
    <rect x="52" y="112" width="110" height="10" rx="5" fill="#A8B0B5"/>`;
  return sharp(svg(width, ROW - GAP, body))
    .composite(icons)
    .png()
    .toBuffer();
}

const directory = process.argv[2];
if (!directory) {
  console.error("Użycie: node scripts/icons/preview.mjs <katalog>");
  process.exit(1);
}
const files = (await readdir(directory)).filter((name) => name.endsWith(".svg")).sort();
if (files.length === 0) {
  console.error(`Brak plików SVG w ${directory}`);
  process.exit(1);
}

const columns = [
  { title: "512", render: (s) => render(s, ROW - GAP) },
  { title: "maskable (koło 80%)", render: (s) => maskable(s, ROW - GAP) },
  { title: "ekran główny — jasny", render: (s) => homeScreen(s, "#C9D3D8") },
  { title: "ekran główny — ciemny", render: (s) => homeScreen(s, "#1B2732") },
  { title: "favicon 32 / 16", render: (s) => tab(s) },
];
const columnWidth = 220;
const width = LABEL_WIDTH + columns.length * (columnWidth + GAP);
const height = GAP + 30 + files.length * ROW;
const composites = [];
const labels = columns.map(
  (column, i) =>
    `<text x="${LABEL_WIDTH + i * (columnWidth + GAP)}" y="${GAP + 10}" font-family="sans-serif" font-size="14" fill="#646B70">${escape(column.title)}</text>`,
);
for (const [row, file] of files.entries()) {
  const source = await readFile(path.join(directory, file));
  const top = GAP + 30 + row * ROW;
  labels.push(
    `<text x="${GAP}" y="${top + 24}" font-family="sans-serif" font-size="16" font-weight="600" fill="#202427">${escape(file.replace(/\.svg$/, ""))}</text>`,
  );
  for (const [i, column] of columns.entries()) {
    composites.push({ input: await column.render(source), left: LABEL_WIDTH + i * (columnWidth + GAP), top });
  }
}
composites.push({ input: svg(width, height, labels.join("")), left: 0, top: 0 });
const output = path.join(directory, "sheet.png");
await sharp({ create: { width, height, channels: 3, background: "#FFFFFF" } })
  .composite(composites)
  .png()
  .toFile(output);
console.log(output);
