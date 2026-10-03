// Eksport ilustracji do aplikacji: wycina białe tło połączone z krawędzią,
// przycina do treści i zapisuje WebP o stałej szerokości.
//
// Użycie: node scripts/illustrations/export.mjs <źródło.png> <cel.webp>
import { Buffer } from "node:buffer";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const WIDTH = 960;

const [source, target] = process.argv.slice(2);
if (!source || !target) {
  console.error("Użycie: node scripts/illustrations/export.mjs <źródło.png> <cel.webp>");
  process.exit(1);
}

const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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

await mkdir(path.dirname(target), { recursive: true });
const trimmed = await sharp(Buffer.from(data.buffer), { raw: { width, height, channels: 4 } })
  .trim({ threshold: 0 })
  .png()
  .toBuffer();
const result = await sharp(trimmed)
  .resize({ width: WIDTH, withoutEnlargement: true })
  .webp({ quality: 82, alphaQuality: 90 })
  .toFile(target);
console.log(`${target} ${result.width}×${result.height} ${(result.size / 1024).toFixed(0)} KiB`);
