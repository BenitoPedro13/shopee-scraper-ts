Shopee Scraper TS (HTTP-first)

Purpose: Provide a TypeScript, HTTP/HTTP2-based scraper for Shopee without Playwright. It focuses on careful headers, cookies, proxy support, and rate limiting to reduce anti-bot triggers.

Quickstart
- Copy `.env.example` to `.env` and set `SHOPEE_DOMAIN` and optional `PROXY_URL`, `COOKIE_STRING`, and `USER_AGENT`.
- Install deps: `npm i` (Node 20+).
- Dev run examples:
  - `npm run dev -- search --keyword "mouse" --pages 1`
  - `npm run dev -- pdp --url "https://shopee.com.br/..."`

Notes
- This project tries HTML-first scraping of search pages (extracting product links) and can be extended to call JSON APIs when a valid cookie jar is present.
- Provide region-appropriate proxy and cookies for best results.
- Avoid high concurrency; start with `CONCURRENCY=2` and `REQUESTS_PER_MINUTE=30`.

