Shopee Scraper TS (CDP + HTTP‑first)

Purpose: Capture Shopee search and PDP data in TypeScript without Playwright. Uses Chrome DevTools Protocol (CDP) to open real pages and intercept the JSON API responses, then saves only parsed, structured data. HTTP/HTTP2 clients can be layered later when stable cookies/proxies are available.

Quickstart
- Copy `.env.example` to `.env` and set at least `SHOPEE_DOMAIN` (e.g., `shopee.com.br`). Database is optional.
- Install deps: `npm i` (Node 20+ required).
- Start Chrome with remote debugging: `npm run chrome:headless` (or `npm run chrome:headful:min`).
- Capture search results API: `npm run cdp:search`.
- Capture product detail (PDP) API using seeded IDs from search: `npm run cdp:pdp`.

What it does
- Opens Shopee in Chrome and intercepts only the relevant endpoints:
  - Search: `GET /api/v4/search/search_items`
  - PDP: `GET /api/v4/pdp/get_pc`
- Writes NDJSON/JSON logs under `logs/` and saves parsed records as line‑delimited JSON for easy ingestion.

Requirements
- Node `>=20`
- Chrome or Chromium available on PATH (the launcher searches common locations)
- Optional MySQL (via `docker compose`) if you want to persist data with Prisma

Setup
- Env: duplicate `./.env.example` to `./.env` and adjust values.
  - Core: `SHOPEE_DOMAIN`, optional `ACCEPT_LANGUAGE`, `USER_AGENT`, `COOKIE_STRING`, `PROXY_URL` (for future HTTP mode)
  - DB: `DATABASE_URL` (MySQL default), or switch to SQLite by uncommenting the example in `.env.example`
- Install: `npm i`

Run: Search capture (CDP)
- Launch Chrome: `npm run chrome:headless` (keeps a `.cdp-profile` user dir)
- Execute capture: `npm run cdp:search`
  - Overrides via env:
    - `TARGET_URL` (default points to a sample search URL)
    - `SCROLL_STEPS` (default `8`) and `SCROLL_DELAY_MS` (default `1500`) control lazy‑loading
    - `POST_IDLE_MS` (default `3000`) final wait before exit
- Outputs:
  - `logs/search_items_requests.ndjson`: matched request metadata
  - `logs/search_items_responses.json`: raw JSON bodies (one object per line)
  - `logs/search_items_products.ndjson`: parsed products (one object per line)

Run: PDP capture (CDP)
- Prereq: `logs/search_items_products.ndjson` should exist from the search step
- Execute: `npm run cdp:pdp`
  - Selectors/env:
    - `PDP_VISIT_LIMIT` (default `20`): how many seeds to visit
    - `PDP_POST_IDLE_MS` (default `4000`): wait after load to collect API calls
    - `SHOPEE_DOMAIN` to build product URLs
    - `PDP_CLICK_SELECTOR` is available but currently commented out in code
- Outputs:
  - `logs/pdp_requests.ndjson`: matched request metadata
  - `logs/pdp_responses.json`: raw JSON bodies (one object per line)
  - `logs/pdp_products.ndjson`: parsed PDP record (one object per line)

Database (optional)
- Local MySQL via Docker: `npm run db:up` then `npm run prisma:generate` and `npm run prisma:push`
- Prisma models are in `prisma/schema.prisma`. Search products map to `SearchProduct`; PDP snapshots map to `ProductDetail`.
- Current CDP scripts show a placeholder call to persist; enable/extend as needed in `src/db/repo.ts`.

Scripts
- `npm run chrome:headless` / `npm run chrome:headful:min`: launch Chrome with `--remote-debugging-port=9222`
- `npm run cdp:search`: open a search URL, scroll to trigger result pages, and persist parsed items
- `npm run cdp:pdp`: visit PDPs for seeded `(shopid,itemid)` pairs and persist parsed detail
- `npm run prisma:*`: Prisma utilities
- Note: `npm run dev` is currently unused (no `src/index.ts`); use the `cdp:*` scripts above.

Tips
- Region matters: set `SHOPEE_DOMAIN` and consider `ACCEPT_LANGUAGE`/`USER_AGENT` to match a real browser profile.
- Concurrency in CDP mode is effectively sequential per tab; for stability, prefer scroll‑based pagination instead of parallel navigations.
- Logs are append‑only; clear `logs/` when starting a fresh run.

Troubleshooting
- Chrome not found: ensure Chrome/Chromium is installed or on PATH; the launcher tries common paths and commands.
- Nothing captured: verify the page actually triggers the listed API endpoints; adjust `TARGET_URL` and scroll settings.
- Port in use: remote debugging uses `9222`; close other Chrome instances launched with that port.
