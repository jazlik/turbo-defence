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

**Twarz:** otwarta — rozstrzyga runda „D — twarze” niżej. Do czasu decyzji fragment twarzy dopisuje się z wybranego wariantu.

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
