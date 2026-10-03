// Snapshot of official PSP shelter points for one voivodeship, committed to public/data/ and precached.
// The source CSV has no CORS headers, so the browser cannot fetch it directly. Refresh: `npm run data:shelters`.
// Source: Komenda Główna PSP, "Punkty schronienia w Polsce", dane.gov.pl (CC BY 4.0), updated every Monday.
import { writeFile } from "node:fs/promises";

const SOURCE_URL = "https://gdziesieukryc.pl/PS_XML/punkty_schronienia.csv";
const VOIVODESHIP = "małopolskie";
const OUTPUT = new URL("../public/data/shelters-malopolska.json", import.meta.url);

/** RFC 4180 rows: quoted fields may contain commas, doubled quotes and newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field !== "" || row.length > 0) rows.push([...row, field]);
  return rows;
}

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`${SOURCE_URL} returned ${response.status}`);
const [header, ...rows] = parseCsv((await response.text()).replace(/^\uFEFF/, ""));
const column = (name) => {
  const index = header.indexOf(name);
  if (index === -1) throw new Error(`Missing column "${name}" — the PSP export format changed`);
  return index;
};
const [id, voivodeship, lat, lon, address, availability] = [
  "Identyfikator publiczny",
  "Wojewodztwo",
  "Szerokosc geograficzna",
  "Dlugosc geograficzna",
  "Adres",
  "Dostepnosc",
].map(column);

const round = (value) => Math.round(Number(value) * 1e5) / 1e5;
const points = rows
  .filter((row) => row[voivodeship] === VOIVODESHIP && row[lat] && row[lon])
  .map((row) => [row[id], round(row[lat]), round(row[lon]), row[address], row[availability]])
  .filter(([, latitude, longitude]) => Number.isFinite(latitude) && Number.isFinite(longitude));

if (points.length < 1000) throw new Error(`Only ${points.length} points for ${VOIVODESHIP} — refusing to overwrite`);

const snapshot = {
  generatedAt: new Date().toISOString(),
  source: "https://dane.gov.pl/pl/dataset/28058,punkty-schronienia-w-polsce",
  license: "CC BY 4.0",
  attribution: "Komenda Główna PSP, dane.gov.pl",
  fields: ["id", "latitude", "longitude", "address", "availability"],
  points,
};
await writeFile(OUTPUT, JSON.stringify(snapshot));
console.log(`${points.length} shelter points → ${OUTPUT.pathname}`);
