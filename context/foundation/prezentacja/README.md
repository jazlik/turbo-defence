# Prezentacja HackYeah 2026 — materiały wizualne

Deck: 9 slajdów (8 + aneks), szablon zespołu „W razie W · HackYeah 2026”. Zasady: [`JEZYK_WIZUALNY.md`](../../../JEZYK_WIZUALNY.md) §12 i §20 — w skrócie: te same tokeny co aplikacja, ilustracje tylko w stylu „kontur”, ikony Lucide, wyróżnienia stalą lub pogrubieniem (nie bursztynem), grafiki AI oznaczone w zgłoszeniu.

## Wersja robocza decku

`W_razie_W_HackYeah_2026_wersja_robocza.pptx` — szablon zespołu z wstawionymi: logo (slajdy 1, 5), ikonami Lucide (5, 7, 8) i zrzutami aplikacji (6). Podgląd wszystkich slajdów: `podglad.png`. Puste nadal: nagłówki z mediów (2–4), ilustracja slajdu 4, nazwa zespołu, źródło „77%”.

## Mapa slotów

| Slajd                   | Slot                                                | Czym wypełniamy                                                                                                    | Stan                     |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| 1 Tytuł                 | logo                                                | ikona aplikacji `public/icons/icon.svg`                                                                            | gotowe                   |
| 2–3 Media, liczby       | 9 nagłówków                                         | prawdziwe nagłówki z datą i źródłem (zrzut lub karta tytuł + źródło) — nie ilustracje                              | do zebrania przez zespół |
| 4 Informacja ≠ gotowość | „człowiek pod stosem informacji”                    | **nowa ilustracja „kontur”** — zadanie niżej                                                                       | do wygenerowania         |
| 4                       | poradnik, PDF-y, recenzje, mapa schronów, aplikacje | miniatury prawdziwych materiałów (ze źródłem)                                                                      | do zebrania              |
| 5 W razie W             | 4 znaki funkcji                                     | karty poradnika: `domownicy`, `udostepnienie`, `plecak` / `miejsca`, `prowadzenie` z `public/ilustracje/poradnik/` | gotowe                   |
| 6 Dwa tryby             | 4 ekrany                                            | prawdziwe zrzuty aplikacji w ramce telefonu, w stanie offline (§20) — `zrzuty/`                                    | robione skryptem         |
| 7 Czym się różnimy      | 4 ikony                                             | Lucide: `ListChecks`, `Footprints`, `WifiOff`, `UserX`                                                             | gotowe                   |
| 8 Dalsze kroki          | 4 ikony                                             | Lucide: `Users`, `Share2`, `BellRing`, `CloudRain`                                                                 | gotowe                   |
| 9 Aneks                 | —                                                   | bez zmian; źródło liczby „77%” do uzupełnienia                                                                     | do uzupełnienia          |

## Zrzuty ekranu (slajd 6)

`zrzuty/przygotowanie-1-plan.png`, `przygotowanie-2-plecak.png`, `kryzys-1-krok.png`, `kryzys-2-prowadzenie.png` — build z `main` (2026-10-03), `astro preview`, Playwright 390×844 @2x, przykładowy plan rodziny 4 osób w Krakowie zapisany w `wrw.plan`, symulowana pozycja GPS i marsz (kierunek liczony z ruchu). Ekrany trybu awaryjnego robione **w trybie offline** (§20). Komunikat „Głos niedostępny” wynika z przeglądarki bez syntezy mowy — na telefonie głos działa; jeśli przeszkadza, zrzut trzeba zrobić na telefonie.

## Zadanie dla Codexa — ilustracja slajdu 4

`Styl: D` z [`../ilustracje/README.md`](../ilustracje/README.md) / §12. Referencje stylu: 4 karty z `public/ilustracje/poradnik/` (ta sama postać, twarz, kreska). **2 kandydatów**, zapis `context/foundation/prezentacja/kandydaci/slajd-4-c1.png`, `-c2.png`. Nie edytuj wyników, nie wybieraj.

> One adult sits on the floor, calm and slightly overwhelmed in a light-hearted way, half-buried under a tall, leaning pile of loose papers, folded leaflets, thick booklets and printed pages, holding a phone and looking at it with a small, wry smile. The papers are blank — no text, no letters, no logos. The pile is the only steel blue (#536B75) element: a few booklet covers filled with steel; everything else white contour. No panic, no danger symbols, no screens with interface.

Fragment stylu (bez zmian): „Minimal contour illustration, at most two colours: one even-weight line in #2F3E45 (like a 2px icon stroke) and flat steel blue #536B75 on the single key element. Everything else white inside closed outlines — skin, hair, clothes included; no grey tones, no shading. Slim, elongated figures with small heads. Friendly face: two small dot eyes, a tiny nose line and a gentle smile. Very few details, lots of empty space. Transparent background.”

Potem: commit jako Daniel Karski bez `Co-Authored-By`, push brancha `feat/deck-visuals`, stop. Kandydaci nie trafiają do `main` — do decku idzie tylko wybrany plik.
