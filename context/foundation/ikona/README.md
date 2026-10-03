# Ikona aplikacji — eksploracja

**Status:** eksploracja nienormatywna (`JEZYK_WIZUALNY.md` §16). Obecna ikona (`public/icons/icon.svg`) to litera „W” jako tekst w foncie Arial — zależna od fontów systemu i bez własnego znaczenia. Ten katalog przygotowuje decyzję zespołu; podmiana ikony w `public/` dopiero po wyborze.

## Co ikona musi spełnić

- **Czytelna w 16 px** (zakładka przeglądarki) i rozpoznawalna w 56 px na ekranie głównym — jeden prosty znak, bez drobnych detali.
- **Maskable:** cały znak mieści się w kole o średnicy 80% płótna (Android przycina ikonę do koła, kwadratu z zaokrągleniem lub „squircle”).
- **Język wizualny:** kolory wyłącznie z tokenów — stal `#536B75`, `#2F3E45`, `#E3E7E9`, biel, tło `#F1F2F3`. Bez czerwieni, bursztynu i zieleni (oznaczają stan, §3 i §7). Geometria jak ikony Lucide: równa kreska, zaokrąglone końce i narożniki.
- **Charakter (§2):** spokojny, wiarygodny, rodzinny. Bez tarcz, krzyży, syren, wykrzykników, celowników, moro i biało-czerwonej estetyki aplikacji rządowych (#wGotowości, RSO, mObywatel) — mamy się od nich odróżniać.
- **Bez tekstu i fontów** — tylko ścieżki SVG (litera „W” dozwolona, ale narysowana jako kształt).

## Koncepty do sprawdzenia

| Koncept       | Znak                                                                         | Co mówi                                             |
| ------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| **dom-punkt** | kontur domu, w środku punkt / kółko miejsca spotkania                        | plan dla mojego domu i miejsce, gdzie się spotykamy |
| **sciezka**   | przerywana ścieżka zakończona punktem (kółko w kółku)                        | prowadzi do punktu, także bez sieci                 |
| **plecak**    | uproszczony plecak z jedną kieszenią                                         | jestem przygotowany                                 |
| **w-znak**    | litera W narysowana kreską, której środkowy wierzchołek jest punktem / domem | nazwa „W razie W” + znaczenie                       |
| **dom-ww**    | otwarty kontur domu z rodziną; dwa znaki W zatrzymują się nad dachem         | dom chroni moich ludzi „w razie W”                  |

Każdy koncept w **dwóch wariantach**:

- `-stal` — tło stal `#536B75`, znak biały,
- `-jasny` — tło `#F1F2F3` lub biel, znak `#2F3E45` z jednym akcentem w stali.

## Zadanie dla agenta (Codex)

Pracuj na branchu `feat/app-icon`. **Nie używaj generatora obrazów** — ikonę rysujesz bezpośrednio jako SVG (ścieżki, `stroke-linecap="round"`, `stroke-linejoin="round"`), bo musi być ostra w 16 px i edytowalna.

1. Dla każdego konceptu zapisz 2 pliki w `kandydaci/`: `<koncept>-stal.svg` i `<koncept>-jasny.svg` (`viewBox="0 0 512 512"`, tło jako pełny kwadrat bez zaokrągleń — zaokrąglenie robi system; znak w kole r = 205 wokół środka; grubość kreski 36–44 px, czyli odpowiednik 2 px Lucide w 24 px).
2. Uruchom `npm run icon:sheet -- context/foundation/ikona/kandydaci` i obejrzyj `sheet.png` — szczególnie kolumnę favicon 16 px i ekran ciemny.
3. Popraw znak, który nie czyta się w 16 px (uprość, nie zmniejszaj kreski). Najwyżej jedna poprawka na koncept.
4. Dopisz tu sekcję „Ocena” (1–2 zdania na koncept + rekomendacja), commit jako Daniel Karski <daniel.karski5q@gmail.com> bez `Co-Authored-By`, push `feat/app-icon`, stop — wybór należy do człowieka.

`kandydaci/obecna.svg` to kopia obecnej ikony do porównania — nie zmieniaj jej.

## Ocena

**Dom-punkt.** Najpełniej łączy rodzinny charakter produktu z ideą uzgodnionego miejsca; dom i punkt pozostają rozpoznawalne także w faviconie 16 px. Wariant stalowy ma najbardziej równy kontrast na jasnym i ciemnym ekranie.

**Ścieżka.** Dobrze komunikuje prowadzenie do celu i zachowuje czytelny rytm w małej skali. Jest jednak znaczeniowo bliższa nawigacji niż całemu planowi rodzinnemu, a w 16 px traci część charakteru krzywej.

**Plecak.** Ma najmocniejszą, natychmiast czytelną sylwetkę spośród wszystkich konceptów. Zawęża jednak obietnicę produktu do przygotowania ekwipunku i może sugerować aplikację survivalową.

**W-znak.** Jest prosty, własny i działa w 16 px lepiej niż obecna litera zależna od fontu. Znaczenie punktu w środkowym wierzchołku wymaga jednak znajomości nazwy i nie komunikuje samodzielnie rodzinnego planu.

**Dom-WW.** Najmocniej opowiada pełną ideę marki: rodzina pozostaje wewnątrz domu, a dwa znaki „W” zatrzymują się nad dachem. Pełny znak jest jednak gęstszy od pozostałych i w 16 px wymaga osobnego uproszczenia `dom-ww-favicon.svg`; wariant z jednym W okazał się czytelniejszy niż dom z trzema małymi postaciami.

**Rekomendacja robocza pozostaje: `dom-punkt-stal`.** Najlepiej równoważy znaczenie, odrębność i czytelność jednym niezmiennym znakiem w każdym pokazanym kontekście, bez skojarzeń alarmowych lub survivalowych. `dom-ww-stal` jest bardziej narracyjną alternatywą, jeśli zespół zaakceptuje osobny wariant favicon. Ostateczny wybór należy do człowieka; kandydaci nie zastępują jeszcze ikony w `public/`.

## Po wyborze

Eksport do `public/icons/` (`icon.svg`, `icon-maskable.svg`, PNG 192/512, maskable 512, `apple-touch-icon.png` 180, `favicon.png`) z jednego źródła SVG i PR do `main` z wpisem do `JEZYK_WIZUALNY.md` (sekcja o ikonie aplikacji). Smoke test (`scripts/smoke.mjs`) sprawdza, że ikony z manifestu są PNG.
