# Offline App Shell Implementation Plan

## Overview

Turn the 10x-astro-starter (SSR on Cloudflare Workers + Supabase auth) into a static, Polish-language PWA shell that loads in airplane mode after the first visit, is installable on Android and iOS, and deploys automatically from `main` to a public URL. This is roadmap foundation F-01; it unlocks S-01 (guided-to-point-offline), which must be verified on a phone in airplane mode under a public address.

## Current State Analysis

- `astro.config.mjs` uses `output: "server"`, the `@astrojs/cloudflare` adapter, `@astrojs/sitemap` (no `site` set) and an `env.schema` with `SUPABASE_URL` / `SUPABASE_KEY`.
- `wrangler.jsonc` points `main` at `@astrojs/cloudflare/entrypoints/server` with an `ASSETS` binding over `./dist`.
- Auth layer from the starter, contradicting PRD Access Control ("profil lokalny, brak kont i serwera"): `src/middleware.ts`, `src/lib/supabase.ts`, `src/lib/config-status.ts`, `src/pages/api/auth/*`, `src/pages/auth/*`, `src/pages/dashboard.astro`, `src/components/auth/*`, `src/components/Topbar.astro`, `src/env.d.ts` (`Locals.user`), `supabase/`, `.env.example`, `scripts/smoke.mjs` (auth-flow test).
- `src/layouts/Layout.astro` has `lang="en"` and renders a Supabase "missing config" `Banner`; `src/components/Welcome.astro` is English starter marketing copy linking to `/auth/*`.
- No web app manifest, no service worker, no icons beyond `public/favicon.png`.
- `.github/workflows/ci.yml` triggers on `master` (repo default branch is `main`), needs Supabase secrets, runs a Supabase-backed smoke job, and has no deploy step. The repo has no GitHub secrets.
- `CLAUDE.md` (with `AGENTS.md` symlinked to it) documents the SSR/auth architecture and Supabase conventions.
- Local `wrangler` is authenticated against the user's Cloudflare account.

## Desired End State

- `npm run build` produces a fully static `dist/` (no `_worker.js`), including `sw.js`, `manifest.webmanifest`, icons and `_headers`.
- Opening the deployed URL once with network, then switching to airplane mode and reloading (or launching the home-screen icon), shows the Polish home page with "Gotowe do pracy offline".
- A new deploy is picked up on the next online open without manual cache clearing.
- No auth, Supabase, SSR or env-secret code or dependency remains; docs describe the static PWA architecture.
- Every push to `main` runs lint, type check, build and smoke, then deploys to Cloudflare Workers (static assets) and smoke-tests the live URL.

### Key Discoveries:

- `@vite-pwa/astro@1.2.0` declares peer `astro` ≤5 and requires `vite-plugin-pwa@^1.2` (peer `vite` ≤7); the project runs Astro 7.3.2 on Vite 8.3.0. Decision: generate the SW with `workbox-build@7.4.1` as a postbuild step instead.
- `vite-plugin-pwa@2.0.0` supports Vite 8 but runs before Astro emits HTML pages, so prerendered HTML would miss the precache — rejected.
- `public/.assetsignore` lists `_worker.js` and `_routes.json`; `_headers` must NOT be added there (Workers static assets reads it from the asset directory).
- `AGENTS.md` is a symlink to `CLAUDE.md` — edit `CLAUDE.md` only.
- ImageMagick (`convert`) is available locally for one-off icon generation.

## What We're NOT Doing

- No local plan storage (IndexedDB/localStorage) — arrives with S-01.
- No offline map tiles or routing — S-04.
- No custom "Zainstaluj" button / `beforeinstallprompt` handling — onboarding territory (S-07).
- No PR preview deploys — deploy only from `main`.
- No Playwright / browser-level offline test — smoke checks artifacts and headers; real offline behavior is verified manually.
- No navigation skeleton or placeholder screens for future slices.
- No custom domain.
- No update prompt UI ("Nowa wersja") — updates apply automatically.

## Implementation Approach

Three phases, each leaving the app buildable: first strip the server and auth so the build is static and Polish; then add the PWA layer on top of the static output (manifest, icons, postbuild Workbox SW, registration, status indicator, smoke); finally rewire CI to `main` and add the deploy job. Hosting stays on Cloudflare Workers but as an assets-only Worker — this deviates from `tech-stack.md` (`deployment_target: cloudflare-pages`), recorded in Phase 1 docs.

## Critical Implementation Details

- **Timing & lifecycle**: the SW must be generated *after* `astro build` finishes, so it is chained into the `build` script (`astro build && node scripts/generate-sw.mjs`), not a separate npm `postbuild` hook that CI might skip. `skipWaiting` + `clientsClaim` make a new SW take control immediately; the open page keeps its already-loaded assets and the next open renders the new version — do not force `location.reload()` on `controllerchange` (it could reload mid-use).
- **Caching**: `sw.js` must be served with `Cache-Control: no-cache` (via `public/_headers`) or phones can sit on a stale SW for up to 24 h. Precached assets are revisioned by Workbox, so other files need no special headers.
- **Dev mode**: register the SW only when `import.meta.env.PROD`; in `astro dev` there is no `sw.js`, and a stale SW from a previous preview on `localhost:4321` can mask dev changes — note in docs to unregister via DevTools if that happens.

## Phase 1: Static Shell

### Overview

Remove everything that contradicts the PRD (server rendering, accounts, Supabase) and make the build static, Polish and assets-only on Workers.

### Changes Required:

#### 1. Remove auth and Supabase

**File**: `src/middleware.ts`, `src/lib/supabase.ts`, `src/lib/config-status.ts`, `src/pages/api/`, `src/pages/auth/`, `src/pages/dashboard.astro`, `src/components/auth/`, `src/components/Topbar.astro`, `src/components/Banner.astro`, `supabase/`, `.env.example`, `scripts/smoke.mjs`

**Intent**: Delete starter auth and backend so no slice inherits them; the auth smoke test goes too (replaced in Phase 2).

**Contract**: Files deleted. `src/env.d.ts` drops the `App.Locals.user` declaration (keep the file only if something else needs it; otherwise delete). `Banner.astro` is deleted only if nothing else imports it after `Layout.astro` changes.

#### 2. Dependencies

**File**: `package.json`, `package-lock.json`

**Intent**: Drop packages that only served SSR/auth.

**Contract**: Uninstall `@supabase/ssr`, `@supabase/supabase-js`, `supabase`, `@astrojs/cloudflare`, `@astrojs/sitemap`. Keep `wrangler` (deploy), `@astrojs/react`, `@astrojs/check`, Tailwind, shadcn deps. Remove the `smoke` script temporarily or leave it pointing at the Phase 2 file (Phase 2 recreates it).

#### 3. Astro config

**File**: `astro.config.mjs`

**Intent**: Static output with no adapter and no env schema.

**Contract**: `output: "static"`, integrations `[react()]`, Tailwind Vite plugin unchanged, no `adapter`, no `env` block.

#### 4. Wrangler config

**File**: `wrangler.jsonc`

**Intent**: Assets-only Worker serving `dist/`.

**Contract**: Remove `main`, `assets.binding` and `compatibility_flags`; keep `name: "w-razie-w"`, `compatibility_date`, `assets.directory: "./dist"`, `assets.not_found_handling: "404-page"`, `observability`.

#### 5. Polish layout and home page

**File**: `src/layouts/Layout.astro`, `src/components/Welcome.astro`, `src/pages/index.astro`

**Intent**: Polish document language and a minimal, honest home page instead of starter marketing.

**Contract**: `<html lang="pl">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, `<meta name="description">` in Polish; no `Banner`/config-status. `Welcome.astro` shows "W razie W", one Polish sentence on what the app does, and an empty placeholder element (e.g. `data-offline-status`) for the Phase 2 indicator. Use `cn()` for any conditional classes. Remove `LibBadge` use if it only served the starter copy (delete the component if unused).

#### 6. Docs

**File**: `CLAUDE.md` (also serves `AGENTS.md`), `README.md`, `context/foundation/tech-stack.md`

**Intent**: Describe the real architecture so future agents don't reintroduce SSR/auth.

**Contract**: `CLAUDE.md`: commands (no workerd/SSR wording; `smoke` described per Phase 2), architecture = static Astro 7 PWA with React islands, no server, no accounts, data local-only; remove Auth flow section, Supabase migrations convention, Supabase env vars, `.dev.vars`; API-routes convention removed; deploy = assets-only Worker via CI on `main`. `README.md`: drop Supabase setup steps. `tech-stack.md`: add a short note that deploy target is Cloudflare Workers static assets (not Pages) and Supabase was removed in `offline-app-shell`.

### Success Criteria:

#### Automated Verification:

- No starter auth references remain: `grep -rniE "supabase|astro:env|locals\.user|/api/auth" src astro.config.mjs package.json` returns nothing
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`
- Build passes with no env vars set: `npm run build`
- Output is static: `test ! -e dist/_worker.js && test -f dist/index.html`
- `dist/index.html` contains `lang="pl"`

#### Manual Verification:

- `npm run dev` home page shows the Polish welcome text, no banner, no sign-in links
- `npx wrangler deploy --dry-run` accepts the assets-only config

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Offline and Installability

### Overview

Add the manifest, icons and a Workbox-generated service worker that precaches the whole static build, plus a visible "ready offline" indicator and an HTTP smoke test.

### Changes Required:

#### 1. Icons

**File**: `public/icons/icon.svg` (source), `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`, `public/apple-touch-icon.png` (180×180)

**Intent**: Minimum icon set for Android install and iOS home screen.

**Contract**: Simple generated mark ("W" on a solid brand color); PNGs produced once with ImageMagick from the SVG and committed — no icon-generator dependency. Maskable variant keeps the glyph inside the central 80% safe zone.

#### 2. Manifest

**File**: `public/manifest.webmanifest`

**Intent**: Polish, standalone, installable app identity.

**Contract**: `name: "W razie W"`, `short_name: "W razie W"`, `lang: "pl"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `background_color` / `theme_color` matching the layout, `icons` listing the three PNGs (maskable with `purpose: "maskable"`). `Layout.astro` links it, adds `<meta name="theme-color">`, `<link rel="apple-touch-icon">` and `<meta name="apple-mobile-web-app-title" content="W razie W">`.

#### 3. Service worker generation

**File**: `scripts/generate-sw.mjs`, `package.json` (`build` script, devDependency `workbox-build`)

**Intent**: After Astro writes `dist/`, generate `dist/sw.js` that precaches every emitted asset so the app opens offline.

**Contract**: `workbox-build` `generateSW` with `globDirectory: "dist"`, glob covering `html, js, css, png, svg, ico, webmanifest, woff2`, `globIgnores` for `sw.js`/`workbox-*.js`/`_headers`, `navigateFallback: "/index.html"`, `skipWaiting: true`, `clientsClaim: true`, `cleanupOutdatedCaches: true`, `swDest: "dist/sw.js"`. Script logs the precache count and size and exits non-zero on Workbox warnings. `build` becomes `astro build && node scripts/generate-sw.mjs`.

#### 4. Cache headers

**File**: `public/_headers`

**Intent**: Ensure phones always revalidate the SW and manifest.

**Contract**: `/sw.js` and `/manifest.webmanifest` → `Cache-Control: no-cache`. Not listed in `public/.assetsignore`.

#### 5. Registration and status indicator

**File**: `src/layouts/Layout.astro` (or a small `src/components/OfflineStatus.astro`)

**Intent**: Register the SW in production and show the user when the app is ready to work offline, so they know it's safe to switch to airplane mode.

**Contract**: Inline Astro `<script>` (no React island needed): if `import.meta.env.PROD` and `"serviceWorker" in navigator`, register `/sw.js`; on `navigator.serviceWorker.ready` set the placeholder from Phase 1 to "Gotowe do pracy offline"; before that, show "Przygotowuję tryb offline…"; if unsupported, show "Ta przeglądarka nie obsługuje trybu offline". All copy Polish.

#### 6. Smoke test

**File**: `scripts/smoke.mjs`, `package.json` (`smoke` script)

**Intent**: Dependency-free HTTP check that the served build is a working PWA shell; runnable against preview locally/CI and against the live URL after deploy.

**Contract**: `BASE_URL` env (default `http://localhost:4321`). Asserts: `/` is 200 HTML with `lang="pl"`, links `manifest.webmanifest`, contains the offline status element; `/manifest.webmanifest` parses as JSON with `lang: "pl"`, `display: "standalone"` and each listed icon URL returns 200 `image/png`; `/sw.js` is 200 JavaScript and its precache list includes `index.html`; when `EXPECT_HEADERS=1` (live Workers deploy), `/sw.js` has `Cache-Control` containing `no-cache` (Astro preview ignores `_headers`). Exits non-zero with a clear message on the first failure.

#### 7. Docs

**File**: `CLAUDE.md`

**Intent**: Document the PWA mechanics for future slices.

**Contract**: Note that `build` generates `sw.js` via `scripts/generate-sw.mjs`, every file in `dist/` is precached (new runtime assets like map tiles need their own strategy), SW registers only in production, and how to clear a stale SW in DevTools during development.

### Success Criteria:

#### Automated Verification:

- Build passes and generates the SW: `npm run build && test -f dist/sw.js && test -f dist/manifest.webmanifest`
- Lint passes: `npm run lint`
- Type check passes: `npx astro check`
- Smoke passes against preview: `npm run preview -- --port 4321 &` then `BASE_URL=http://localhost:4321 npm run smoke`

#### Manual Verification:

- In Chrome DevTools on `npm run preview`: Application tab shows the manifest with no errors and an activated SW; status reads "Gotowe do pracy offline"
- DevTools Network → Offline, reload: page renders fully, styled, with no failed requests
- Rebuild with a visible text change, reload online once, then reload again: new text appears without clearing site data

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 3: CI and Deploy from main

### Overview

Point CI at `main`, remove Supabase from it, and add a deploy job that publishes the static build to Cloudflare and smoke-tests the live URL.

### Changes Required:

#### 1. Workflow

**File**: `.github/workflows/ci.yml`

**Intent**: Validate every push/PR to `main` and deploy only on push to `main`.

**Contract**:
- Triggers: `push` and `pull_request` on `main`.
- Job `ci`: checkout, setup-node from `.nvmrc`, `npm ci`, `npx astro sync`, `npm run lint`, `npx astro check`, `npm run build` — no secrets.
- Job `smoke`: `npm ci`, `npm run build`, start `npm run preview -- --port 4321` in background, wait for `/`, `npm run smoke`. No Supabase.
- Job `deploy`: `needs: [ci, smoke]`, `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`, `concurrency: production` (cancel-in-progress false), build, `cloudflare/wrangler-action@v3` with `apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}`, `accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`, `command: deploy`; then `BASE_URL=${{ steps.<deploy>.outputs.deployment-url }} EXPECT_HEADERS=1 npm run smoke`. Pin `wranglerVersion` to the version in `package-lock.json` so CI and local agree.

#### 2. Repository secrets (manual)

**File**: — (GitHub repo settings)

**Intent**: Give the deploy job Cloudflare access.

**Contract**: User creates a Cloudflare API token from the "Edit Cloudflare Workers" template, then `gh secret set CLOUDFLARE_API_TOKEN` and `gh secret set CLOUDFLARE_ACCOUNT_ID` (account id from `npx wrangler whoami`). Remove any leftover `SUPABASE_*` secrets if present.

#### 3. Docs

**File**: `CLAUDE.md`, `context/foundation/roadmap.md`

**Intent**: Record the CI/deploy contract and the public URL.

**Contract**: `CLAUDE.md` CI section: triggers on `main`, jobs `ci` / `smoke` / `deploy`, required secrets, production URL (`https://w-razie-w.<subdomain>.workers.dev`, filled after first deploy). Roadmap F-01 status → `done` only after Manual verification below passes.

### Success Criteria:

#### Automated Verification:

- Workflow file is valid YAML and references no Supabase secrets: `! grep -ni supabase .github/workflows/ci.yml`
- PR run: `ci` and `smoke` jobs green, `deploy` skipped (`gh pr checks`)
- After merge to `main`: `deploy` job green including the live smoke (`gh run watch`)

#### Manual Verification:

- Secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set (`gh secret list`)
- On an Android phone (Chrome): open the public URL, wait for "Gotowe do pracy offline", add to home screen, enable airplane mode, launch from the icon — app opens in standalone mode
- On an iPhone (Safari), if available: same flow via "Dodaj do ekranu początkowego"
- Push a visible change to `main`; after deploy, open the installed app once online — change visible on the next open

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Testing Strategy

### Unit Tests:

- None — this change adds no business logic; the repo has no unit test runner yet and adding one is out of scope.

### Integration Tests:

- `scripts/smoke.mjs` against `astro preview` (CI `smoke` job) and against the live deploy (CI `deploy` job, with header check).

### Manual Testing Steps:

1. `npm run build && npm run preview`, open in Chrome, confirm "Gotowe do pracy offline".
2. DevTools → Network → Offline → reload; page fully renders.
3. Change visible text, rebuild, reload twice online; new text appears.
4. On a phone, install from the public URL, enable airplane mode, launch from the home screen.

## Performance Considerations

The precache downloads the whole `dist/` on first visit; currently tens of KB. Later slices that add large assets (map tiles in S-04) must exclude them from `globPatterns` and use a dedicated download strategy, documented in `CLAUDE.md` in Phase 2.

## Migration Notes

- The existing Worker `w-razie-w` (if previously deployed as SSR) is replaced in place by the assets-only version on the first deploy; no data to migrate.
- Starter auth can be recovered from git history (`62a7bbb`) if ever needed.

## References

- Roadmap: `context/foundation/roadmap.md` (F-01)
- PRD: `context/foundation/prd.md` (US-01, NFR, Access Control)
- Tech stack: `context/foundation/tech-stack.md`
- Starter bootstrap log: `context/changes/bootstrap-verification/verification.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Static Shell

#### Automated

- [x] 1.1 No starter auth references remain — 6b9a5b4
- [x] 1.2 Lint passes — 6b9a5b4
- [x] 1.3 Type check passes — 6b9a5b4
- [x] 1.4 Build passes with no env vars set — 6b9a5b4
- [x] 1.5 Output is static — 6b9a5b4
- [x] 1.6 `dist/index.html` contains `lang="pl"` — 6b9a5b4

#### Manual

- [x] 1.7 Dev home page shows Polish welcome, no banner, no sign-in links — 6b9a5b4
- [x] 1.8 `wrangler deploy --dry-run` accepts the assets-only config — 6b9a5b4

### Phase 2: Offline and Installability

#### Automated

- [x] 2.1 Build passes and generates the SW — 5c7fb04
- [x] 2.2 Lint passes — 5c7fb04
- [x] 2.3 Type check passes — 5c7fb04
- [x] 2.4 Smoke passes against preview — 5c7fb04

#### Manual

- [x] 2.5 DevTools shows valid manifest, activated SW, "Gotowe do pracy offline" — 5c7fb04
- [x] 2.6 Offline reload renders fully — 5c7fb04
- [x] 2.7 New build is picked up without clearing site data — 5c7fb04

### Phase 3: CI and Deploy from main

#### Automated

- [x] 3.1 Workflow references no Supabase secrets
- [ ] 3.2 PR run: `ci` and `smoke` green, `deploy` skipped
- [ ] 3.3 After merge: `deploy` green including live smoke

#### Manual

- [ ] 3.4 Cloudflare secrets set
- [ ] 3.5 Android: installed app opens in airplane mode
- [ ] 3.6 iPhone: installed app opens in airplane mode (if available)
- [ ] 3.7 Pushed change visible in installed app after next online open
