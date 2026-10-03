# Rules for AI

This file provides guidance to AI Agent when working with code in this repository.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build (fully static output in `dist/`)
- `npm run preview` — preview production build
- `npm run lint` — ESLint with type-checked rules
- `npm run lint:fix` — auto-fix lint issues
- `npm run format` — Prettier (includes prettier-plugin-astro + prettier-plugin-tailwindcss)
- `npm run smoke` — dependency-free HTTP smoke test of the served build (`scripts/smoke.mjs`, added in the `offline-app-shell` change, Phase 2), `BASE_URL` env (default `http://localhost:4321`).

Pre-commit hooks: husky + lint-staged runs `eslint --fix` on `*.{ts,tsx,astro}` and `prettier --write` on `*.{json,css,md}`.

## Architecture

**Static Astro 7 PWA** with React 19 islands, Tailwind 4 and shadcn/ui components. No server, no accounts, no backend: all user data is local to the device (offline-first, per the PRD). Hosted on Cloudflare Workers as an assets-only Worker serving `dist/`.

### Rendering mode

`output: "static"` in astro.config.mjs, no adapter. Do not add SSR pages, API routes, middleware or server-side env secrets.

### PWA / offline

- `npm run build` runs `astro build && node scripts/generate-sw.mjs`; the script generates `dist/sw.js` with Workbox (`workbox-build`).
- Every file in `dist/` matching the glob in `scripts/generate-sw.mjs` is precached. New runtime assets (e.g. map tiles) must be excluded from the glob and get their own caching strategy.
- The service worker is registered only in production (`import.meta.env.PROD`, script in `src/layouts/Layout.astro`). In `astro dev` there is no `sw.js`; if a stale SW from `astro preview` on the same port masks changes, unregister it in DevTools → Application → Service Workers.
- `public/_headers` serves `sw.js` and `manifest.webmanifest` with `Cache-Control: no-cache`. Do not list `_headers` in `public/.assetsignore`.

### Key conventions

- **Path alias**: `@/*` maps to `./src/*` (tsconfig paths).
- **Astro components** for static content/layout; **React components** only when interactivity is needed.
- **Tailwind class merging**: use the `cn()` helper from `@/lib/utils` (clsx + tailwind-merge) for conditional/merged class names. Do not concatenate class strings manually.
- **shadcn/ui**: components live in `src/components/ui/`, "new-york" style variant. Install new ones with `npx shadcn@latest add [name]`.
- **React**: no Next.js directives ("use client" etc.). Extract hooks to `src/components/hooks/`.
- **Services/helpers** go in `src/lib/` (or `src/lib/services/` for extracted business logic).
- **Shared types** (entities, DTOs) go in `src/types.ts`.
- **Language**: UI copy is Polish (`<html lang="pl">`).

### Environment

- Node.js v22.14.0 (see `.nvmrc`)
- No environment variables or secrets are needed to build.
- Deploy: assets-only Worker `w-razie-w` via `npx wrangler deploy` (CI deploys from `main`).

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) triggers on push and pull request to `main`:

- `ci` — `npm ci`, `astro sync`, lint, `astro check`, build.
- `smoke` — build, `astro preview`, `npm run smoke`.
- `deploy` — only on push to `main`, after `ci` and `smoke`: build, `wrangler deploy` (pinned to the version in `package-lock.json`), then `npm run smoke` against the live URL with `EXPECT_HEADERS=1`.

Required repository secrets: `CLOUDFLARE_API_TOKEN` ("Edit Cloudflare Workers" template), `CLOUDFLARE_ACCOUNT_ID` (`npx wrangler whoami`).

Production URL: `https://w-razie-w.jzogala.workers.dev`.
