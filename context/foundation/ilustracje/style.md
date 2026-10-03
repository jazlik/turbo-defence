# Style ilustracji — zapisane warianty

Każde zlecenie generacji **zaczyna się od `Styl: D` albo `Styl: A`**. Agent bierze wyłącznie sekcję wskazanego stylu: fragment promptu, paletę, referencje i zakazy. Stylów nie miesza, a „wspólna końcówka” z [`README.md`](./README.md) dla tych stylów **nie obowiązuje** (zastępuje ją sekcja stylu). Kontekst i proces: [`README.md`](./README.md); język wizualny: [`JEZYK_WIZUALNY.md`](../../../JEZYK_WIZUALNY.md) §12.

| Styl                                         | Status                                                                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **D — kontur**                               | **w pracy** (główny kandydat)                                                                                                       |
| **A — płaska**                               | odłożony                                                                                                                            |
| b — kreska i plama, c — przedmioty i miejsca | zamknięte w rundzie 1: b zbyt kreskówkowy i wielobarwny; c — przedmioty to ta sama technika co postacie, sprawdza je scena „plecak” |

## Styl D — kontur

**Fragment promptu:**

> Minimal contour illustration, at most two colours: one even-weight line in #2F3E45 (like a 2px icon stroke) and optionally flat steel blue #536B75 on the single key object of the scene. Everything else is white inside closed outlines — skin, hair, clothes and furniture included; no grey tones, no shading, no gradients, no texture. Slim, elongated figures with small heads and long thin limbs, no cartoon proportions. Very few details: objects drawn as simple shapes like icons. Lots of empty space.

**Paleta:** wyłącznie kreska `#2F3E45` i opcjonalnie stal `#536B75` na jednym kluczowym obiekcie. Bez kolorów skóry, piaskowych mebli, szarości.

**Referencje do generatora:** te same obrazy Open Doodles (CC0), które poszły do kierunku D w rundzie 1 — lista w [`referencje/zrodla.md`](./referencje/zrodla.md). Na początku promptu: „Use the attached images as style reference only — do not copy their subjects, poses or layout.”

**Zakazy:** no military, survival or tactical gear, no uniforms, no flags, no red, no amber, no screens or app interface, no text, no letters, no numbers, no logos, no frame, no elements entering from outside the canvas. Transparent background (czysto białe dopuszczalne).

**Twarz (decyzja człowieka: wariant c3):** `Friendly faces: two small dot eyes, a tiny simple nose line and a gentle small smile — calm, not cartoonish.`

**Doprecyzowania po rundzie twarzy (dopisywane do każdego promptu D):** `Hair drawn as contour, not filled. The steel blue fill is used on exactly one key object named in the scene — trees, furniture and everything else stay white contour. Keep the same line weight as the reference images.`

**Referencje do generatora (do czasu własnego zestawu):** `kierunki-v1/d-twarze/plan-c3.png` + 2 obrazy Open Doodles z rundy 1. Po wyborze kart poradnika 4 najlepsze karty stają się zestawem referencji stylu D.

## Styl A — płaska (odłożony)

> Flat vector illustration with large clean colour shapes and no outlines. Simplified faceless people with small heads, calm natural poses. At most one flat shadow tone, no gradients, no texture, no 3D.

Paleta i zakazy: „wspólna końcówka” z `README.md` (chłodne szarości, stal, naturalne kolory skóry, opcjonalny piaskowy neutral).

## Runda „D — twarze” (zadanie dla Codexa)

Uwaga człowieka do D: styl się podoba, ale postacie mają być bardziej przyjazne — widoczne oczy, ewentualnie nos. Porównujemy cztery warianty twarzy na **jednej scenie**, w której twarze są największe:

> Two adults and a child sit at a kitchen table, leaning over a large paper plan of their neighbourhood; one adult points at a spot on it.

`Styl: D` + opis sceny + jeden fragment twarzy. Po **1 obrazie** na wariant, zapis w `kierunki-v1/d-twarze/`:

| Plik          | Wariant                       | Fragment twarzy                                                                                                                                        |
| ------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `plan-c1.png` | bez twarzy (jak dotąd)        | `Faces left blank, no facial features.`                                                                                                                |
| `plan-c2.png` | same oczy                     | `Faces with two small dot eyes only.`                                                                                                                  |
| `plan-c3.png` | przyjazna (wariant człowieka) | `Friendly faces: two small dot eyes, a tiny simple nose line and a gentle small smile — calm, not cartoonish.`                                         |
| `plan-c4.png` | kontrast: jedna linia         | `Faces drawn with a single continuous line: profile or three-quarter view, nose and mouth in one stroke, no eyes as dots — elegant, adult, editorial.` |

### Ocena rundy D — twarze

**c1 — bez twarzy.** Zachowuje największą oszczędność i spójność z dotychczasowym D, ale relacja rodzinna opiera się niemal wyłącznie na pozach. Przy większym kadrze postacie pozostają celowo anonimowe.

**c2 — same oczy.** Dwie kropki zwiększają kontakt z postaciami bez istotnego zagęszczania rysunku. Twarze są nadal neutralne, choć przy mniejszym rozmiarze oczy mogą być słabo widoczne.

**c3 — przyjazna.** Oczy, mały nos i delikatny uśmiech dają najwięcej ciepła i czytelnie wspierają rodzinny charakter sceny. Dodatkowe rysy są zauważalne, lecz nie zmieniają ilustracji w ekspresyjną kreskówkę.

**c4 — jedna linia.** Profile i ujęcia trzy czwarte nadają scenie bardziej dorosły, editorialowy ton. Twarze są wyrazistsze od pustych, ale mniej bezpośrednie niż warianty z oczami skierowanymi do odbiorcy.

Potem: `npm run illustrations:sheet -- context/foundation/ilustracje/kierunki-v1`, w tym pliku pod tabelą 1–2 zdania o każdym wariancie (bez wybierania), commit jako Daniel Karski <daniel.karski5q@gmail.com> bez `Co-Authored-By`, push `feat/illustration-directions`, stop.

## Ścieżka poradnika — propozycja do akceptacji

Poradnik po pierwszym wejściu: **5 kart do przeklikania**, jedna karta = jedna core funkcja z [roadmapy](../roadmap.md), w kolejności przepływu MVP z PRD. Copy osobno; tu tylko sceny. Prototyp do przeklikania: `/prototyp/poradnik` (`src/pages/prototyp/poradnik.astro`, tylko na tym branchu, nielinkowany); karty 1–3 mają na razie zastępcze obrazy z rund eksploracji.

| Karta | Funkcja (roadmapa)                          | Co ma zrozumieć użytkownik                    | Scena (`Styl: D`)                                                                                                                                        | Obiekt w stali |
| ----- | ------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1     | domownicy i kontakty (S-05)                 | plan jest dla mojego domu i moich ludzi       | Two adults, a child and a grandparent stand together in the open doorway of their home, calm and close.                                                  | drzwi          |
| 2     | plecak (S-06)                               | każdy ma spakowany plecak                     | An adult and a child kneel on the floor packing an evacuation backpack; a water bottle, a flashlight and a documents folder lie beside it.               | plecak         |
| 3     | miejsca: spotkania, zapasowe, schron (S-07) | wiemy, gdzie się spotkać, gdy nie ma kontaktu | A family meets at an agreed spot: a bench under a tree; the child runs towards the parents.                                                              | ławka          |
| 4     | prowadzenie offline (S-01, S-04)            | aplikacja poprowadzi do punktu bez internetu  | One adult walks calmly along a path holding a phone, heading towards a simple shelter building in the distance; the phone screen is a plain solid shape. | telefon        |
| 5     | udostępnienie planu (S-09)                  | cała rodzina ma ten sam plan                  | An adult hands a phone to a smiling grandparent sitting in an armchair, showing them the shared plan; the phone screen is a plain solid shape.           | telefon        |

Karta 4 opisuje funkcję w spokojnym tonie przygotowania — nie pokazuje kryzysu (Execution Mode nie ma ilustracji, §12).

**Po akceptacji ścieżki (zadanie dla Codexa):** `Styl: D`, po 2 kandydatów na kartę → `kierunki-v1/poradnik/karta-<N>-c1.png`, `-c2.png`; arkusz; człowiek wybiera po jednym; eksport wybranych: `npm run illustrations:export -- <png> public/prototyp/poradnik/karta-<N>.webp`; commit, push, stop.

**Status (2026-10-03):** wygenerowano wbudowanym `image_gen` (model nieujawniony przez narzędzie) po 2 kandydatów na każdą kartę i dodano je do arkusza `kierunki-v1/sheet.png`. Kandydaci czekają na wybór człowieka; zastępcze obrazy w prototypie nie zostały jeszcze podmienione.
