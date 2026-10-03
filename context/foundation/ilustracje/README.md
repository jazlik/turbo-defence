# Ilustracje — proces i eksploracja stylu v1

**Status:** eksploracja nienormatywna (`JEZYK_WIZUALNY.md` §16) i propozycja do decyzji zespołu. Obecnie [`JEZYK_WIZUALNY.md`](../../../JEZYK_WIZUALNY.md) §12 mówi: „v0 nie wprowadza systemu ilustracji”; ilustracja może powstać dla konkretnej potrzeby Preparation Mode i **wymaga dopisania jej zasad do §12 przed użyciem**. Ten katalog przygotowuje tę decyzję: do produktu nic nie trafia, dopóki zespół nie wybierze kierunku i nie zaktualizuje §12. Tu zostaje tylko proces i materiał roboczy (bez duplikowania specyfikacji wizualnej).

Proces przeniesiony z systemu okładek Lucka, sprawdzonego na kilkunastu grafikach: **generator robi ilustrację, makieta i tokeny robią produkt**; styl prowadzą obrazy referencyjne, nie opis tekstem; człowiek wybiera na gotowych makietach; najwyżej 2 rundy generacji, potem prostszy concept zamiast nowych reguł.

**Zgoda zespołu na eksplorację ilustracji do onboardingu:** 2026-10-03. Zasady w §12 i użycie w produkcie nadal wymagają osobnej decyzji po wyborze kierunku.

## Gdzie są ilustracje (propozycja, do potwierdzenia)

Tylko **Preparation Mode**. W Execution Mode nie ma ilustracji (§12: „bez ozdobnych ilustracji w sytuacji awaryjnej”).

| Miejsce                            | Slice       | Scena                                  |
| ---------------------------------- | ----------- | -------------------------------------- |
| Onboarding — start                 | S-07        | rodzina razem, spokojny początek planu |
| Onboarding — domownicy i kontakty  | S-05 / S-07 | domownicy wpisani do planu             |
| Onboarding — plecak                | S-06 / S-07 | spakowany plecak ewakuacyjny           |
| Onboarding — miejsca               | S-07        | miejsce spotkania / zapasowe / schron  |
| Onboarding — plan zapisany offline | S-04 / S-07 | plan gotowy bez internetu              |
| Udostępnienie planu                | S-09        | przekazanie planu domownikowi          |
| Prezentacja i zgłoszenie           | §20         | te same ilustracje, bez osobnego stylu |

Puste stany i ekran gotowości używają tych samych ilustracji albo ikon — bez osobnych grafik.

## Runda 1: trzy wygenerowane kierunki na tych samych scenach

Kierunki różnią się **techniką rysunku**, nie paletą — wtedy porównujemy jedną zmienną.

| Kierunek                 | Technika                                                                                        | Za                                                  | Ryzyko                        |
| ------------------------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------- |
| **a — płaska rodzinna**  | płaskie plamy koloru, bez konturów, uproszczone postacie bez twarzy, najwyżej jeden płaski cień | najcieplejszy, „rodzinny” (§2)                      | generyczny styl „flat people” |
| **b — kreska oszczędna** | równa kreska `steel.deep`, głównie białe wnętrza i pojedynczy stalowy akcent; proste twarze     | blisko ikon Lucide i poradnikowej czytelności       | może wyjść zbyt kreskówkowo   |
| **d — kontur**           | maksymalnie dwa kolory, smukłe postacie, zamknięte kontury, bez szarości i cieniowania          | najmniej konkuruje z UI, najbliżej systemowej ikony | może być zbyt chłodny         |

Kierunek roboczy **c — przedmioty i miejsca** został pominięty przed generacją po zawężeniu zakresu. Katalog zachowuje nazwę jako ślad procesu, ale nie wchodzi do arkusza.

Sceny testowe (te same dla a, b i d):

1. **plecak** — spakowany plecak ewakuacyjny i kilka rzeczy obok: butelka wody, latarka, teczka z dokumentami, apteczka.
2. **spotkanie** — dwoje dorosłych i dziecko spotykają się w umówionym miejscu: ławka pod charakterystycznym drzewem.
3. **plan** — dwoje dorosłych i dziecko przy kuchennym stole nad papierowym planem.

## Zadanie dla agenta z generatorem obrazów (Codex z image_gen)

Branch: `feat/illustration-directions`. Na koniec commit i push tego brancha (nie `main`), potem **stop** — wybór kierunku należy do człowieka.

**Krok 1 — referencje (najwyżej 15 minut).** Znajdź 10–15 przykładów ilustracji w duchu §2 (spokojnie, rodzinnie, chłodno, wiarygodnie): np. materiały FEMA / Ready.gov (domena publiczna USA), Open Peeps, Humaaans, Open Doodles i public-domain ilustracje przedmiotów. Zapisz w `referencje/` i dopisz `referencje/zrodla.md`: plik, URL, licencja, co z niego bierzemy (technika, nie temat) oraz czy był wejściem generatora. Licencja nieznana → nie zapisuj pliku, tylko link. Każdy wygenerowany kierunek dostaje stałe 2–3 obrazy referencyjne wyłącznie jako referencję stylu. Nie używaj screenów z `context/foundation/analogi/` ani grafik innych produktów.

**Krok 2 — generacja.** Dla każdego z trzech kierunków i każdej sceny powstaje **1 kandydat** (3 × 3 = 9), w formacie poziomym ~4:3, **z przezroczystym tłem**; czyste białe tło jest dopuszczalne. Zapis: `kierunki-v1/<kierunek>/<scena>-c1.png` (sceny: `plecak`, `spotkanie`, `plan`). Prompt zaczyna się od `Use the attached images as style reference only — do not copy their subjects, poses or layout.`, a następnie łączy angielski opis sceny, fragment kierunku i wspólną końcówkę. Maksymalnie jedna powtórka na obraz; bez ręcznej edycji wyników.

**Krok 3 — arkusz.** `npm run illustrations:sheet -- context/foundation/ilustracje/kierunki-v1` → `kierunki-v1/sheet.png` (każdy kandydat w makiecie ekranu onboardingu). Obejrzyj arkusz i dopisz niżej sekcję „Runda 1 — ocena” (2–3 zdania na kierunek + rekomendacja). Commit, push brancha, stop.

### Fragmenty kierunków

- **a:** `Flat vector illustration with large clean colour shapes and no outlines. Simplified faceless people with small heads, calm natural poses. At most one flat shadow tone, no gradients, no texture, no 3D.`
- **b:** `Simple line illustration: one consistent line of even weight like a 2px icon stroke, colour #2F3E45 (not pure black), closed outlines. Fills mostly white, with a few small solid accents in #2F3E45 (hair, shoes, one garment) and the single key object filled in steel blue #536B75. Simple faces with dot eyes. No uniforms, no flags, no military or rescue gear, no red.`
- **d:** `Minimal contour illustration, at most two colours: one even-weight line in #2F3E45 (like a 2px icon stroke) and optionally flat steel blue #536B75 on the single key object. Everything else white inside closed outlines — no grey tones, no shading. Slim, elongated figures with small heads, dot eyes or blank faces, no cartoon proportions. Very few details, lots of empty space.`

### Wspólna końcówka promptu

> Calm, reassuring, trustworthy, family-oriented mood for a household emergency-planning app — never alarming. Palette: cool greys (#FAFAFA, #E7E9EA, #D3D6D8, #7A8287, #646B70), steel blue (#536B75, #E3E7E9, #2F3E45), natural skin tones and at most one muted warm neutral (sand) for wood or fabric. No red, no orange, no amber, no bright green. No military, survival or tactical gear, no camouflage, no weapons, no gas masks, no sirens, no fire, no ruins, no medical red cross. No screens or app interface, no text, no letters, no numbers, no logos, no frame. No elements entering from outside the canvas. Transparent background.

Kolory semantyczne (`danger`, `attention`, `safe`, `guidance`, §6–7) są wyłączone z ilustracji, bo w produkcie oznaczają stan. Piaskowy neutral jest propozycją do decyzji, nie tokenem (§19).

## Po wyborze kierunku (runda 2 — osobny brief)

1. Człowiek wybiera kierunek na arkuszu i 4 najlepsze obrazy → zestaw referencji stylu `referencje-stylu-v1/` (świadoma decyzja człowieka; od tej chwili każda generacja dostaje te 4 obrazy).
2. Decyzja zespołu i wpis zasad ilustracji do `JEZYK_WIZUALNY.md` §12 (technika, paleta, gdzie wolno, czego unikać), z linkiem tutaj — dopiero potem ilustracje trafiają do produktu.
3. Pełny zestaw scen z tabeli wyżej: 4 kandydatów na scenę, arkusz, wybór, eksport do `public/`.

## Pochodzenie (regulamin HackYeah, §20)

Każda wygenerowana grafika jest oznaczana w opisie zgłoszenia jako wygenerowana przez AI. Ten katalog jest rejestrem: brief i prompty (tu), kandydaci (`kierunki-v1/`), źródła referencji (`referencje/zrodla.md`).

Kandydaci rundy 1 pozostają wyłącznie na branchu `feat/illustration-directions` i nie trafiają do `main` bez osobnej decyzji człowieka.

## Runda 1 — ocena

**a — płaska rodzinna.** Kierunek jest spokojny, ciepły i najbardziej rodzinny; duże plamy dobrze budują sceny bez alarmowego tonu. Ilustracje są jednak wizualnie najcięższe i miejscami konkurują z hierarchią makiety bardziej niż pozostałe warianty.

**b — kreska oszczędna.** Sceny są bardzo czytelne i zachowują rodzinny charakter, a ciemna kreska dobrze łączy się z logiką ikon. Generator dodał jednak sporo detalu, modelunku i kreskówkowej ekspresji, więc rezultat jest mniej oszczędny niż zakładał fragment kierunku.

**d — kontur.** Najlepiej utrzymuje pustą przestrzeń, ogranicza paletę i zostawia pierwszeństwo treści interfejsu. Kontur jest najbliższy systemowej rodzinie Lucide, a pojedynczy stalowy akcent wystarcza do wskazania kluczowego obiektu bez dekoracyjnego koloru.

**Rekomendacja robocza: d — kontur.** Najlepiej wspiera spokojny, uporządkowany Preparation Mode i najłatwiej może stać się spójnym rozszerzeniem obecnego języka wizualnego. To rekomendacja agenta na podstawie arkusza; finalna decyzja o kierunku należy do człowieka.

**Metadane generacji:** wbudowane narzędzie Codex `image_gen`; model nieujawniony przez narzędzie; data generacji: 2026-10-03. Obrazy wygenerowano z referencjami stylu wymienionymi w [`referencje/zrodla.md`](referencje/zrodla.md); każdy prompt zabraniał kopiowania ich tematów, póz i układu.
