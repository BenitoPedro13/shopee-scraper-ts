import CDP from "chrome-remote-interface";
import { appendFile, readFile } from "node:fs/promises";
import { ensureLogsDir } from "@/shopee/utils/ensure-logs-dir";
import { decodeBody } from "@/shopee/utils/decode-base64";
import { buildProductUrl } from "@/shopee/utils/product-url";
import { parsePdpFromResponse } from "@/shopee/parsers/pdp-product";
import { PDP_API_ENDPOINT, PDP_PROD_LOG, PDP_REQ_LOG, PDP_RES_LOG, PROD_LOG } from "@/shopee/constants";

type SearchNdjsonEntry = { itemid?: number; shopid?: number; [k: string]: any };

async function readSeedProducts(limit: number): Promise<Array<{ itemid: number; shopid: number }>> {
  try {
    const raw = await readFile(PROD_LOG, 'utf8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const out: Array<{ itemid: number; shopid: number }> = [];
    const seen = new Set<string>();
    for (const line of lines) {
      try {
        const j: SearchNdjsonEntry = JSON.parse(line);
        if (typeof j.itemid !== 'number' || typeof j.shopid !== 'number') continue;
        const key = `${j.shopid}:${j.itemid}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ itemid: j.itemid, shopid: j.shopid });
        if (out.length >= limit) break;
      } catch { /* ignore */ }
    }
    return out;
  } catch {
    return [];
  }
}

export async function scrapePdp() {
  let client: CDP.Client | null = null;
  client = await CDP();

  try {
    const { Network, Page, Runtime } = client;

    await ensureLogsDir();

    // Intercept PDP requests for logging
    Network.requestIntercepted(async ({ interceptionId, request }) => {
      try {
        const u = new URL(request.url);
        if (u.pathname.startsWith(PDP_API_ENDPOINT)) {
          const entry = {
            t: new Date().toISOString(),
            type: 'request',
            method: request.method,
            url: request.url,
            postData: request.postData ?? null,
          };
          try { await appendFile(PDP_REQ_LOG, JSON.stringify(entry) + '\n'); } catch {}
          console.log(`[PDP MATCH] ${request.method} ${request.url}`);
        }
      } catch {}
      Network.continueInterceptedRequest({ interceptionId });
    });

    const pending = new Map<string, { url: string; status: number; mimeType: string }>();

    Network.responseReceived(async ({ response, requestId }) => {
      try {
        const u = new URL(response.url);
        if (u.pathname.startsWith(PDP_API_ENDPOINT)) {
          console.log(`[PDP RESPONSE] ${response.status} ${response.url}`);
          pending.set(requestId, { url: response.url, status: response.status, mimeType: response.mimeType });
        }
      } catch {}
    });

    Network.loadingFinished(async ({ requestId }) => {
      const meta = pending.get(requestId);
      if (!meta) return;
      pending.delete(requestId);
      try {
        const body = await Network.getResponseBody({ requestId });
        const text = decodeBody(body);
        try {
          const json = JSON.parse(text);
          await appendFile(PDP_RES_LOG, JSON.stringify(json) + '\n');
          const rec = parsePdpFromResponse(json);
          if (rec && typeof rec.item_id === 'number' && typeof rec.shop_id === 'number') {
            const t = new Date().toISOString();
            await appendFile(PDP_PROD_LOG, JSON.stringify({ t, ...rec }) + '\n');
            console.log(`[PDP DATA] ${meta.status} ${meta.url} -> parsed`);
          } else {
            console.log(`[PDP DATA] ${meta.status} ${meta.url} -> no record`);
          }
        } catch {
          console.log(`[PDP DATA] ${meta.status} ${meta.url} -> non-JSON body (skipped)`);
        }
      } catch {}
    });

    Network.loadingFailed(({ requestId }) => {
      if (pending.has(requestId)) pending.delete(requestId);
    });

    await Network.enable();
    await Page.enable();
    await Runtime.enable();

    await Network.setRequestInterception({ patterns: [ { urlPattern: `*${PDP_API_ENDPOINT}*` } ] });

    const domain = process.env.SHOPEE_DOMAIN || 'shopee.com.br';
    const LIMIT = Number.parseInt(process.env.PDP_VISIT_LIMIT || '1', 10);
    const POST_IDLE_MS = Number.parseInt(process.env.PDP_POST_IDLE_MS || '2000', 10);

    const seeds = await readSeedProducts(LIMIT);
    if (!seeds.length) {
      console.log(`[PDP] No seed products found in ${PROD_LOG}`);
      return;
    }

    const CLICK_SELECTOR = process.env.PDP_CLICK_SELECTOR || '#sll2-normal-pdp-main > div > div > div > div.container > section > section.flex.flex-auto.YTDXQ0 > div > div.y_zeJr > div > section.flex.KIoPj6.uVwYBh > div > div.wigEZ0 > div.flex.flex-column.JLop8B > div.flex.items-center.C0ngbq > div.flex.items-center.oTmzEO > div > div > div > button';

    async function tryClick(selector: string, retries = 10, delayMs = 500) {
      for (let i = 0; i < retries; i++) {
        try {
          const expr = `(() => { const sel = ${JSON.stringify(selector)}; const el = document.querySelector(sel); if (!el) return 'NF'; el.click(); return 'OK'; })()`;
          const { result } = await Runtime.evaluate({ expression: expr, awaitPromise: true, returnByValue: true });
          if (result?.value === 'OK') return true;
        } catch {}
        await new Promise((r) => setTimeout(r, delayMs));
      }
      return false;
    }

    for (const { itemid, shopid } of seeds) {
      const url = buildProductUrl({ domain, itemid, shopid });
      console.log(`[PDP] Navigating: ${url}`);
      try {
        await Page.navigate({ url });
        await Page.loadEventFired();
        // Try clicking the requested selector to open shipping drawer/section
        if (CLICK_SELECTOR) {
          const clicked = await tryClick(CLICK_SELECTOR);
          console.log(clicked ? `[PDP] Clicked selector: ${CLICK_SELECTOR}` : `[PDP] Selector not found: ${CLICK_SELECTOR}`);
        }
        // small settle delay to allow subsequent XHR
        await new Promise((r) => setTimeout(r, POST_IDLE_MS));
      } catch (e) {
        console.warn(`[PDP] Failed to load ${url}:`, e);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    if (client) await client.close();
  }
}

scrapePdp().catch(console.error);
