# W razie W

Statyczna aplikacja PWA, działająca offline, która pomaga gospodarstwu domowemu przygotować własny plan kryzysowy, przećwiczyć go i wykonać w uproszczonym trybie działania. Zbudowana w Astro 7, React 19 i Tailwind 4; wdrażana do Cloudflare Workers jako zestaw statycznych assetów.

## Źródła prawdy

| Obszar                                              | Dokument                                                 |
| --------------------------------------------------- | -------------------------------------------------------- |
| Wizja, zasady i zakres produktu                     | [`PROJECT.md`](PROJECT.md)                               |
| Aktualne wymagania i otwarte pytania                | [`context/foundation/prd.md`](context/foundation/prd.md) |
| Język wizualny, UI i materiały prezentujące produkt | [`JEZYK_WIZUALNY.md`](JEZYK_WIZUALNY.md)                 |
| Instrukcje dla agentów                              | [`AGENTS.md`](AGENTS.md)                                 |

Warstwa wizualna produktu jest definiowana w `JEZYK_WIZUALNY.md`. Przy projektowaniu lub implementacji UI, mockupów, wizualizacji, prezentacji i grafik przedstawiających produkt należy traktować ten dokument jako obowiązujące źródło prawdy.

Materiały w `context/foundation/analogi/` dokumentują research i nie zastępują aktualnej specyfikacji produktu ani języka wizualnego.

## Development

```bash
nvm use
npm ci
npm run dev
```

No environment variables or backend are required.
