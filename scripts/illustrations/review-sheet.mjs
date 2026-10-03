// Arkusz wyboru ilustracji: każdy kandydat wstawiony w makietę ekranu
// Preparation Mode (kolory i radiusy z JEZYK_WIZUALNY.md §6 i §10), żeby
// porównywać ilustracje w miejscu użycia, a nie na pustym tle.
//
// Użycie: node scripts/illustrations/review-sheet.mjs <katalog>
// <katalog>/<kierunek>/<scena>-c<N>.png → <katalog>/sheet.png
//
// sharp jest zależnością Astro (devOptional w package-lock.json), więc nie
// dodajemy go osobno.
import { Buffer } from "node:buffer";
import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const TOKENS = {
  background: "#F1F2F3", // color.preparation.background
  surface: "#FAFAFA", // color.preparation.surface
  textPrimary: "#202427", // color.preparation.text-primary
  textSecondary: "#646B70", // color.preparation.text-secondary
  border: "#D3D6D8", // color.preparation.border
  action: "#536B75", // color.preparation.action
  steelSoft: "#E3E7E9", // color.core.steel.soft
};
const SCREEN = { width: 390, height: 640 };
const ILLUSTRATION = { left: 24, top: 64, width: 342, height: 280 };
const GAP = 24;
const LABEL = 40;

const escape = (text) => text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);

/** Białe tło połączone z krawędzią obrazu staje się przezroczyste. */
async function knockoutWhite(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const isWhite = (p) => data[p * 4 + 3] > 16 && data[p * 4] >= 235 && data[p * 4 + 1] >= 235 && data[p * 4 + 2] >= 235;
  const visited = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x += 1) stack.push(x, (height - 1) * width + x);
  for (let y = 0; y < height; y += 1) stack.push(y * width, y * width + width - 1);
  while (stack.length > 0) {
    const p = stack.pop();
    if (visited[p]) continue;
    visited[p] = 1;
    if (!isWhite(p)) continue;
    data[p * 4 + 3] = 0;
    const x = p % width;
    if (x > 0) stack.push(p - 1);
    if (x < width - 1) stack.push(p + 1);
    if (p >= width) stack.push(p - width);
    if (p < width * (height - 1)) stack.push(p + width);
  }
  return sharp(data, { raw: { width, height, channels: 4 } })
    .trim({ threshold: 0 })
    .png()
    .toBuffer();
}

/** Makieta ekranu onboardingu z ilustracją. */
async function screen(file) {
  const chrome = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SCREEN.width}" height="${SCREEN.height}">
  <rect width="100%" height="100%" rx="14" fill="${TOKENS.background}"/>
  <rect x="24" y="24" width="120" height="6" rx="3" fill="${TOKENS.steelSoft}"/>
  <rect x="24" y="24" width="48" height="6" rx="3" fill="${TOKENS.action}"/>
  <rect x="24" y="${ILLUSTRATION.top}" width="${ILLUSTRATION.width}" height="${ILLUSTRATION.height}" rx="14" fill="${TOKENS.surface}" stroke="${TOKENS.border}"/>
  <rect x="24" y="372" width="250" height="22" rx="6" fill="${TOKENS.textPrimary}"/>
  <rect x="24" y="410" width="330" height="12" rx="6" fill="${TOKENS.textSecondary}" opacity="0.55"/>
  <rect x="24" y="432" width="290" height="12" rx="6" fill="${TOKENS.textSecondary}" opacity="0.55"/>
  <rect x="24" y="454" width="200" height="12" rx="6" fill="${TOKENS.textSecondary}" opacity="0.55"/>
  <rect x="24" y="568" width="342" height="48" rx="10" fill="${TOKENS.action}"/>
</svg>`);
  const art = await sharp(await knockoutWhite(file))
    .resize({
      width: ILLUSTRATION.width - 32,
      height: ILLUSTRATION.height - 32,
      fit: "inside",
    })
    .png()
    .toBuffer();
  const meta = await sharp(art).metadata();
  return sharp(chrome)
    .composite([
      {
        input: art,
        left: ILLUSTRATION.left + Math.round((ILLUSTRATION.width - meta.width) / 2),
        top: ILLUSTRATION.top + Math.round((ILLUSTRATION.height - meta.height) / 2),
      },
    ])
    .png()
    .toBuffer();
}

const directory = process.argv[2];
if (!directory) {
  console.error("Użycie: node scripts/illustrations/review-sheet.mjs <katalog>");
  process.exit(1);
}
const directions = (await readdir(directory, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const rows = [];
for (const direction of directions) {
  const files = (await readdir(path.join(directory, direction))).filter((name) => /-c\d+\.png$/.test(name)).sort();
  if (files.length > 0) rows.push({ direction, files });
}
if (rows.length === 0) {
  console.error(`Brak kandydatów <kierunek>/<scena>-cN.png w ${directory}`);
  process.exit(1);
}
const columns = Math.max(...rows.map((row) => row.files.length));
const width = GAP + columns * (SCREEN.width + GAP);
const rowHeight = LABEL + SCREEN.height + GAP;
const composites = [];
const labels = [];
for (const [rowIndex, row] of rows.entries()) {
  const top = GAP + rowIndex * rowHeight;
  labels.push(
    `<text x="${GAP}" y="${top + 26}" font-family="sans-serif" font-size="24" font-weight="600" fill="${TOKENS.textPrimary}">${escape(row.direction)}</text>`,
  );
  for (const [columnIndex, file] of row.files.entries()) {
    const left = GAP + columnIndex * (SCREEN.width + GAP);
    labels.push(
      `<text x="${left + 260}" y="${top + 26}" font-family="sans-serif" font-size="16" fill="${TOKENS.textSecondary}">${escape(file.replace(/\.png$/, ""))}</text>`,
    );
    composites.push({
      input: await screen(path.join(directory, row.direction, file)),
      left,
      top: top + LABEL,
    });
  }
}
const height = GAP + rows.length * rowHeight;
composites.push({
  input: Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${labels.join("")}</svg>`,
  ),
  left: 0,
  top: 0,
});
const output = path.join(directory, "sheet.png");
await sharp({ create: { width, height, channels: 3, background: "#FFFFFF" } })
  .composite(composites)
  .png()
  .toFile(output);
console.log(output);
