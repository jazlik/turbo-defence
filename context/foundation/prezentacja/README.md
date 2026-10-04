# Prezentacja HackYeah 2026 — materiały wizualne

Deck: 9 slajdów (8 + aneks), szablon zespołu „W razie W · HackYeah 2026”. Zasady: [`JEZYK_WIZUALNY.md`](../../../JEZYK_WIZUALNY.md) §12 i §20 — w skrócie: te same tokeny co aplikacja, ilustracje tylko w stylu „kontur”, ikony Lucide, wyróżnienia stalą lub pogrubieniem (nie bursztynem), grafiki AI oznaczone w zgłoszeniu.

## Wersja robocza decku

`W_razie_W_HackYeah_2026_wersja_robocza.pptx` (+ `.pdf`) — szkielet zespołu z wgranymi assetami i poprawioną kompozycją (2026-10-04):

- **Okładka:** po prawej pole `#E3E7E9` z dużą ilustracją „rodzina w drzwiach”, ucięta dolną krawędzią; z drzwi wychodzi przerywana ścieżka w stali — motyw „od planu do punktu”, który wraca na slajdach 5 i 6.
- **Rozwiązanie (5):** ilustracje poradnika zamiast ikon (rodzina w drzwiach, udostępnienie, plecak, prowadzenie), w kartach tylko tytuły; opisy funkcji przeniesione do notatek prelegenta. Pod kartami przerywana „droga” łącząca 4 funkcje.
- **Informacja ≠ gotowość (4):** większa postać pod stosem (2,85″); zamiast pełnego bursztynowego pola pod „[17 mln] poradników.” jest zakreślacz `#C89A43` tylko pod dolną połową „[17 mln]” (bursztyn = jedna kluczowa fraza).
- **Dwa tryby (6):** zrzuty offline bez ramki, ucięte dolną krawędzią; nad nimi ścieżka — stalowa po jasnej stronie, bursztynowa (guidance) po ciemnej.
- **Czym się różnimy (7):** ikony powiększone z 0,43″ do 0,64″; bursztynowy pasek „Działa już teraz…” zastąpiony linią statusu (zielona kropka `#347157`, tekst w `#202427`/`#646B70`) i kodem QR do aplikacji z podpisem „Otwórz na telefonie” (`assets/qr-aplikacja.png`, adres `https://w-razie-w.jzogala.workers.dev`).
- **Dalsze kroki (8):** 4 ilustracje (wybór: rodzina c2, wspólny plan c1, oficjalne dane c2, scenariusze c1), w kartach tylko tytuły, opisy w notatkach prelegenta; ścieżka z kart dochodzi do supergrafiki „punkt docelowy”.
- **Aneks (9):** ikony + źródło 77%.

- **Akcenty (2026-10-04):**
  - **tekstura „mapa offline”** — stylizowane ulice w `#E3E7E9`/`#D9DDE0` na tle `#F1F2F3`, za treścią na okładce, rozwiązaniu i aneksie (`assets/tekstura-mapa.png`, 2400×1350, bez gradientów);
  - **znaczniki na drodze** (slajd 5) — kółka z ikonami dom, rodzina, plecak, nawigacja zamiast gołych kropek;
  - **supergrafika „punkt docelowy”** (slajd 8) — duże koło `#E3E7E9` z pierścieniem i punktem w stali, ucięte rogiem slajdu; ścieżka z kart dochodzi do celu;
  - **kickery „KROK n · …”** nad tytułami slajdów 2–8 (11 pt, stal, rozstrzelone wersaliki) — nawiązanie do „jednego kroku na ekranie” w aplikacji;
  - **Morph 5 → 6** — „droga” spod funkcji przesuwa się nad ekrany (działa w PowerPoincie; w Google Slides zamienia się na zwykłe przejście).
- **Assety osobno** do ręcznej pracy w PowerPoincie / Google Slides: `assets/` (tekstura, biały znak logo), `assets/ilustracje/` (wybrane ilustracje slajdów 4 i 8, przezroczyste PNG), `assets/ikony/` (wszystkie ikony Lucide użyte w decku, PNG 256 px, `#2F3E45`).

Podgląd każdego slajdu: `podglad/slajd-1.png` … `slajd-9.png` — prawdziwy render PPTX (LibreOffice Impress z fontem Commissioner 400/500/600/700). Puste nadal: wycinki (2–4), nazwa zespołu i imiona.

## Zadanie dla Codexa — 4 ilustracje na „Dalsze kroki” (slajd 8) — wykonane

`Styl: D` (kontur, `JEZYK_WIZUALNY.md` §12), referencje stylu: 4 karty z `public/ilustracje/poradnik/`. **2 kandydatów na ilustrację**, zapis `kandydaci/slajd-8-<n>-c1.png`, `-c2.png`. Każda scena: 1–2 osoby z rodziny poradnika, jeden obiekt w stali `#536B75`, bez tekstu, bez interfejsu na ekranach (ekran = jednolity kształt), przezroczyste tło.

1. `rodzina` — Gdzie jest rodzina: „An adult holds a phone and looks at it calmly; around the phone, three small round markers float in the air connected by thin dashed lines, like family members' positions. The phone is the only steel blue object.”
2. `wspolny-plan` — Wspólny plan: „Two adults and a teenager sit side by side, each holding a phone; the three phones show the same plain steel blue screen. No text.”
3. `oficjalne-dane` — Oficjalne dane: „An adult stands next to a simple public information pillar with a blank steel blue panel, holding a phone; a thin dashed line connects the pillar to the phone. No text, no symbols.”
4. `scenariusze` — Więcej scenariuszy: „A family of three at home in the evening during a power cut, calm, sitting at a table lit by one camping lantern; a water bottle and a radio on the table. The lantern is the only steel blue object.”

Commit jako Daniel Karski bez `Co-Authored-By`, push `feat/deck-visuals`, stop — nie edytuj PPTX.

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

`zrzuty/przygotowanie-1-miejsca.png`, `przygotowanie-2-plecak.png`, `kryzys-1-krok.png`, `kryzys-2-prowadzenie.png` — build z `main`, `astro preview`, Playwright 390×844 @2x, przykładowa rodzina 4 osób w Krakowie, symulowany GPS i marsz. **Wszystkie robione w trybie offline** (aplikacja załadowana z service workera), pasek statusu z trybem samolotowym. Bez ramki urządzenia, zaokrąglenie 28 px w pliku 780 px (= 14 px), w decku duże i ucięte dolną krawędzią slajdu (§20). Bez czerwonego przycisku alarmu — czerwień tylko na ekranie kryzysu. Komunikat „Głos niedostępny” wynika z przeglądarki bez syntezy mowy.

## Zadanie dla Codexa — ilustracja slajdu 4

`Styl: D` z [`../ilustracje/README.md`](../ilustracje/README.md) / §12. Referencje stylu: 4 karty z `public/ilustracje/poradnik/` (ta sama postać, twarz, kreska). **2 kandydatów**, zapis `context/foundation/prezentacja/kandydaci/slajd-4-c1.png`, `-c2.png`. Nie edytuj wyników, nie wybieraj.

> One adult sits on the floor, calm and slightly overwhelmed in a light-hearted way, half-buried under a tall, leaning pile of loose papers, folded leaflets, thick booklets and printed pages, holding a phone and looking at it with a small, wry smile. The papers are blank — no text, no letters, no logos. The pile is the only steel blue (#536B75) element: a few booklet covers filled with steel; everything else white contour. No panic, no danger symbols, no screens with interface.

Fragment stylu (bez zmian): „Minimal contour illustration, at most two colours: one even-weight line in #2F3E45 (like a 2px icon stroke) and flat steel blue #536B75 on the single key element. Everything else white inside closed outlines — skin, hair, clothes included; no grey tones, no shading. Slim, elongated figures with small heads. Friendly face: two small dot eyes, a tiny nose line and a gentle smile. Very few details, lots of empty space. Transparent background.”

Potem: commit jako Daniel Karski bez `Co-Authored-By`, push brancha `feat/deck-visuals`, stop. Kandydaci nie trafiają do `main` — do decku idzie tylko wybrany plik.
