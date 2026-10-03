# Ilustracje — proces i eksploracja stylu v1

**Status:** eksploracja nienormatywna (`JEZYK_WIZUALNY.md` §16) i propozycja do decyzji zespołu. Obecnie [`JEZYK_WIZUALNY.md`](../../../JEZYK_WIZUALNY.md) §12 mówi: „v0 nie wprowadza systemu ilustracji”; ilustracja może powstać dla konkretnej potrzeby Preparation Mode i **wymaga dopisania jej zasad do §12 przed użyciem**. Ten katalog przygotowuje tę decyzję: do produktu nic nie trafia, dopóki zespół nie wybierze kierunku i nie zaktualizuje §12. Tu zostaje tylko proces i materiał roboczy (bez duplikowania specyfikacji wizualnej).

Proces przeniesiony z systemu okładek Lucka, sprawdzonego na kilkunastu grafikach: **generator robi ilustrację, makieta i tokeny robią produkt**; styl prowadzą obrazy referencyjne, nie opis tekstem; człowiek wybiera na gotowych makietach; najwyżej 2 rundy generacji, potem prostszy concept zamiast nowych reguł.

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

## Runda 1: trzy kierunki na tych samych scenach

Kierunki różnią się **techniką rysunku**, nie paletą — wtedy porównujemy jedną zmienną.

| Kierunek                     | Technika                                                                                                            | Za                                                                                       | Ryzyko                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------- |
| **a — płaska rodzinna**      | płaskie plamy koloru, bez konturów, uproszczone postacie bez twarzy, najwyżej jeden płaski cień                     | najcieplejszy, „rodzinny” (§2)                                                           | generyczny styl „flat people” |
| **b — kreska i plama**       | równa, cienka kreska w `steel.deep` + przesunięte płaskie wypełnienia szarości i stali; staranny, ale ręczny        | spójny z ikonami Lucide z obrysem 2px (§12, §19) — ilustracje i ikony jako jedna rodzina | może wyjść „szkicowo”         |
| **c — przedmioty i miejsca** | bez ludzi: martwe natury i miejsca (plecak rozłożony na elementy, buty domowników przy drzwiach, ławka pod drzewem) | najspokojniejszy, zero problemów z postaciami                                            | mniej „rodzinny”, chłodny     |

Sceny testowe (te same dla a, b, c; w c bez ludzi):

1. **plecak** — spakowany plecak ewakuacyjny i kilka rzeczy obok: butelka wody, latarka, teczka z dokumentami, apteczka.
2. **spotkanie** — domownicy spotykają się w umówionym miejscu (ławka pod charakterystycznym drzewem); w c: sama ławka i drzewo, na ławce szalik.
3. **plan** — dwoje dorosłych i dziecko przy kuchennym stole nad papierowym planem; w c: stół z planem, kluczami i odwróconym telefonem.

## Zadanie dla agenta z generatorem obrazów (Codex z image_gen)

Branch: `feat/illustration-directions`. Na koniec commit i push tego brancha (nie `main`), potem **stop** — wybór kierunku należy do człowieka.

**Krok 1 — referencje (najwyżej 15 minut).** Znajdź 10–15 przykładów ilustracji w duchu §2 (spokojnie, rodzinnie, chłodno, wiarygodnie): np. materiały FEMA / Ready.gov (domena publiczna USA), Open Peeps, Humaaans, unDraw, Open Doodles. Zapisz w `referencje/` i dopisz `referencje/zrodla.md`: plik, URL, licencja, co z niego bierzemy (technika, nie temat). Licencja nieznana → nie zapisuj pliku, tylko link. Referencje służą kalibracji oka; **w rundzie 1 nie dołączaj ich do generacji** (style ma wynikać z opisu kierunku, żeby kierunki się różniły). Nie używaj screenów z `context/foundation/analogi/` ani grafik innych produktów.

**Krok 2 — generacja.** Dla każdego kierunku i każdej sceny **2 kandydatów** (3 × 3 × 2 = 18), w formacie poziomym ~4:3 (np. 1536×1024), **z przezroczystym tłem**. Zapis: `kierunki-v1/<kierunek>/<scena>-c1.png`, `-c2.png` (sceny: `plecak`, `spotkanie`, `plan`). Prompt = opis sceny + fragment kierunku + wspólna końcówka (niżej), bez zmian. Nie edytuj wyników i nie wybieraj za człowieka.

**Krok 3 — arkusz.** `npm run illustrations:sheet -- context/foundation/ilustracje/kierunki-v1` → `kierunki-v1/sheet.png` (każdy kandydat w makiecie ekranu onboardingu). Obejrzyj arkusz i dopisz niżej sekcję „Runda 1 — ocena” (2–3 zdania na kierunek + rekomendacja). Commit, push brancha, stop.

### Fragmenty kierunków

- **a:** `Flat vector illustration with large clean colour shapes and no outlines. Simplified faceless people with small heads, calm natural poses. At most one flat shadow tone, no gradients, no texture, no 3D.`
- **b:** `Tidy hand-drawn line illustration: one consistent dark line of even weight, like a 2px icon stroke (#2F3E45), with flat colour fills slightly offset from the lines. Simplified faceless people. Minimal detail, generous empty space, no gradients, no texture, no 3D.`
- **c:** `Calm flat still-life illustration of objects and places only — no people, no hands, no body parts. Simple geometric shapes, at most one flat shadow tone, no gradients, no texture, no 3D.`

### Wspólna końcówka promptu

> Calm, reassuring, trustworthy, family-oriented mood for a household emergency-planning app — never alarming. Palette: cool greys (#FAFAFA, #E7E9EA, #D3D6D8, #7A8287, #646B70), steel blue (#536B75, #E3E7E9, #2F3E45), natural skin tones and at most one muted warm neutral (sand) for wood or fabric. No red, no orange, no amber, no bright green. No military, survival or tactical gear, no camouflage, no weapons, no gas masks, no sirens, no fire, no ruins, no medical red cross. No screens or app interface, no text, no letters, no numbers, no logos, no frame. No elements entering from outside the canvas. Transparent background.

Kolory semantyczne (`danger`, `attention`, `safe`, `guidance`, §6–7) są wyłączone z ilustracji, bo w produkcie oznaczają stan. Piaskowy neutral jest propozycją do decyzji, nie tokenem (§19).

## Po wyborze kierunku (runda 2 — osobny brief)

1. Człowiek wybiera kierunek na arkuszu i 4 najlepsze obrazy → zestaw referencji stylu `referencje-stylu-v1/` (świadoma decyzja człowieka; od tej chwili każda generacja dostaje te 4 obrazy).
2. Decyzja zespołu i wpis zasad ilustracji do `JEZYK_WIZUALNY.md` §12 (technika, paleta, gdzie wolno, czego unikać), z linkiem tutaj — dopiero potem ilustracje trafiają do produktu.
3. Pełny zestaw scen z tabeli wyżej: 4 kandydatów na scenę, arkusz, wybór, eksport do `public/`.

## Pochodzenie (regulamin HackYeah, §20)

Każda wygenerowana grafika jest oznaczana w opisie zgłoszenia jako wygenerowana przez AI. Ten katalog jest rejestrem: brief i prompty (tu), kandydaci (`kierunki-v1/`), źródła referencji (`referencje/zrodla.md`).
