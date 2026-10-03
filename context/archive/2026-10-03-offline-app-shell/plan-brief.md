# Offline App Shell — Plan Brief

> Full plan: `context/changes/offline-app-shell/plan.md`

## What & Why

Turn the starter into a static, Polish PWA shell that opens in airplane mode after the first visit and deploys automatically from `main`. Roadmap F-01: without offline loading and a public URL, the north-star slice S-01 (guided-to-point-offline) can't be verified on a phone. The change also removes starter parts that contradict the PRD (accounts, server, Supabase), so no slice inherits them.

## Starting Point

The 10x-astro-starter is in place: SSR on Cloudflare Workers, Supabase auth (middleware, API routes, auth pages), an English layout and starter marketing page. There is no manifest or service worker. CI targets `master`, needs Supabase secrets and never deploys.

## Desired End State

`npm run build` produces a fully static `dist/` with a Workbox service worker that precaches everything. The app installs to the home screen, launches in airplane mode and shows "Gotowe do pracy offline". Every push to `main` runs lint, type check, build and a smoke test, then deploys to Cloudflare and smoke-tests the live URL.

## Key Decisions Made

| Decision            | Choice                                          | Why (1 sentence)                                                                 |
| ------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| SW mechanism        | `workbox-build` postbuild script                | `@vite-pwa/astro` supports only Astro ≤5 / Vite ≤7; postbuild sees all emitted HTML. |
| Update strategy     | Automatic (`skipWaiting` + `clientsClaim`)      | The demo phone always runs the latest version after one online open.             |
| Hosting             | Cloudflare Workers, static assets only          | Existing config, wrangler already authenticated; deviates from `tech-stack.md` (Pages), recorded there. |
| Deploy trigger      | Push to `main` only                             | Simplest workflow; no PR previews.                                               |
| Installability      | Manifest + icons, no custom install button      | Works on Android and iOS; an install CTA belongs to onboarding (S-07).           |
| Starter cleanup     | Remove all auth, Supabase, SSR adapter, sitemap | Keeps the agent context clean; history keeps it recoverable.                     |
| Offline verification | HTTP smoke in CI + manual phone test           | Catches config regressions cheaply without adding Playwright.                    |
| Home page           | Minimal Polish welcome + offline status         | The user can see the cache is ready before enabling airplane mode.               |

## Scope

**In scope:**
- Remove auth, Supabase, the SSR adapter, sitemap and the auth smoke test
- Static build, `lang="pl"`, Polish welcome page
- Manifest, icons, Workbox SW, registration, status indicator, `_headers`
- New HTTP smoke test
- CI on `main`, deploy job with a live smoke test
- Updates to `CLAUDE.md`/`AGENTS.md`, README and the `tech-stack.md` note

**Out of scope:** local plan storage (S-01), offline maps (S-04), install button, PR previews, Playwright, navigation skeleton, custom domain, "new version" prompt.

## Architecture / Approach

`astro build` (static) writes `dist/`, then `scripts/generate-sw.mjs` runs Workbox `generateSW` over `dist/` and writes `dist/sw.js`. An inline script in `Layout.astro` registers the SW in production and updates the status text. Cloudflare Workers serves `dist/` as static assets, with `public/_headers` setting `no-cache` on `sw.js` and the manifest. GitHub Actions runs `ci` and `smoke` on every push and PR; on `main` it also runs `deploy` (wrangler-action) and the live smoke test.

## Phases at a Glance

| Phase                          | What it delivers                                 | Key risk                                                        |
| ------------------------------ | ------------------------------------------------ | --------------------------------------------------------------- |
| 1. Static Shell                | Static Polish build, no auth/server, assets-only wrangler | Hidden imports of removed modules break the build           |
| 2. Offline and Installability  | Manifest, icons, precaching SW, status, smoke    | Stale SW on devices; HTML missing from precache                 |
| 3. CI and Deploy from main     | CI on `main`, auto-deploy + live smoke           | Missing or misscoped Cloudflare API token                       |

**Prerequisites:** a Cloudflare API token ("Edit Cloudflare Workers") and the account id set as GitHub secrets before Phase 3 merges.
**Estimated effort:** ~1 session across 3 phases.

## Open Risks & Assumptions

- iOS Safari may evict the SW cache after weeks without use; acceptable for the demo, revisit after the MVP.
- The workers.dev URL is known only after the first deploy and is recorded in `CLAUDE.md` afterwards.
- Assumes no existing Worker named `w-razie-w` holds anything worth keeping; the first deploy replaces it.

## Success Criteria (Summary)

- An Android phone opens the installed app in airplane mode, showing the Polish home page.
- A push to `main` reaches the phone on the next online open without clearing data.
- The repo has no auth, Supabase or SSR code, and its docs describe the static PWA.
