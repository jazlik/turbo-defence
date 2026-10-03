// Eksport ikony aplikacji z trzech źródeł SVG w public/icons/ do plików PNG
// używanych przez manifest PWA i <head>:
// - icon.svg          → icons/icon-192.png, icons/icon-512.png (zaokrąglone rogi),
//                       apple-touch-icon.png (pełny kwadrat — iOS zaokrągla sam),
// - icon-maskable.svg → icons/icon-maskable-512.png (znak w strefie bezpiecznej 80%),
// - icon-favicon.svg  → favicon.png (uproszczony znak, czytelny w 16–32 px).
//
// Użycie: npm run icon:export
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const RADIUS = 80 / 512; // zaokrąglenie jak w poprzedniej ikonie

async function png(source, size, target, { rounded = false } = {}) {
  const svg = await readFile(source);
  let image = sharp(svg, { density: (72 * size) / 512 + 72 }).resize(size, size);
  if (rounded) {
    const r = Math.round(size * RADIUS);
    const mask = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" fill="#fff"/></svg>`,
    );
    image = sharp(await image.png().toBuffer()).composite([{ input: mask, blend: "dest-in" }]);
  }
  await image.png({ compressionLevel: 9 }).toFile(target);
  console.log(target);
}

await png("public/icons/icon.svg", 192, "public/icons/icon-192.png", { rounded: true });
await png("public/icons/icon.svg", 512, "public/icons/icon-512.png", { rounded: true });
await png("public/icons/icon.svg", 180, "public/apple-touch-icon.png");
await png("public/icons/icon-maskable.svg", 512, "public/icons/icon-maskable-512.png");
await png("public/icons/icon-favicon.svg", 64, "public/favicon.png", { rounded: true });
