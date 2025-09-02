import CDP from "chrome-remote-interface";
import { ensureLogsDir } from "@/shopee/utils/ensure-logs-dir";
import { PROD_LOG, REQ_LOG, RES_LOG, SEARCH_RESULTS_API_ENDPOINT } from "@/shopee/constants";
import { isSearchItems } from "@/shopee/utils/is-search-items";
import { appendFile } from "node:fs/promises";
import { decodeBody } from "@/shopee/utils/decode-base64";
import { parseProductsFromResponse } from "../parsers/search-products";

export async function searchProducts() {

    let client: CDP.Client | null = null;
    client = await CDP();

    try {
        // extract domains
        const { Network, Page, Runtime } = client;

        await ensureLogsDir();

        // Intercept only the target endpoint to minimize noise
        Network.requestIntercepted(async ({ interceptionId, request }) => {
            const match = isSearchItems(request);
            if (match) {
                const entry = {
                    t: new Date().toISOString(),
                    type: 'request',
                    method: request.method,
                    url: request.url,
                    postData: request.postData ?? null,
                };
                try { await appendFile(REQ_LOG, JSON.stringify(entry) + '\n'); } catch { }
                console.log(`[MATCH] ${request.method} ${request.url}`);
            }
            // Always continue the request unmodified
            Network.continueInterceptedRequest({ interceptionId });
        });

        // Capture responses; fetch body on loadingFinished
        const pending = new Map<string, { url: string; status: number; mimeType: string }>();

        Network.responseReceived(async (evt) => {
            const { response, requestId } = evt;
            try {
                const u = new URL(response.url);
                const match = u.pathname.startsWith(SEARCH_RESULTS_API_ENDPOINT);
                console.log(`[RESPONSE] ${response.status} ${response.url}`);
                if (!match) return;
                pending.set(requestId, { url: response.url, status: response.status, mimeType: response.mimeType });
            } catch {
                // ignore parse errors
            }
        });

        Network.loadingFinished(async ({ requestId }) => {
            const meta = pending.get(requestId);
            if (!meta) return;
            pending.delete(requestId);
            try {
                const body = await Network.getResponseBody({ requestId });
                const text = decodeBody(body);

                // Only persist parsed JSON payloads
                try {
                    const json = JSON.parse(text);
                    await appendFile(RES_LOG, JSON.stringify(json) + '\n');

                    const products = parseProductsFromResponse(json);
                    if (products.length) {
                        const t = new Date().toISOString();
                        const lines = products.map((p) => JSON.stringify({ t, ...p })).join('\n') + '\n';
                        await appendFile(PROD_LOG, lines);
                        try {
                            // await upsertSearchProducts(products, t);
                        } catch (e) {
                            console.warn('[DB] failed to upsert search products:', e);
                        }
                        console.log(`[DATA] ${meta.status} ${meta.url} -> ${products.length} products`);
                    } else {
                        console.log(`[DATA] ${meta.status} ${meta.url} -> no products`);
                    }
                } catch {
                    // Not JSON, do not store (per requirement: only parsed data)
                    console.log(`[DATA] ${meta.status} ${meta.url} -> non-JSON body (skipped)`);
                }
            } catch {
                // ignore body retrieval errors
            }
        });

        Network.loadingFailed(({ requestId }) => {
            if (pending.has(requestId)) pending.delete(requestId);
        });

        // enable domains
        await Network.enable();
        await Page.enable();
        await Runtime.enable();

        // enable request interception only for the target pattern
        await Network.setRequestInterception({
            patterns: [
                { urlPattern: `*${SEARCH_RESULTS_API_ENDPOINT}*` },
            ],
        });

        // Navigate to Shopee (can override via env TARGET_URL)
        const domain = process.env.SHOPEE_DOMAIN || 'shopee.com.br';
        const targetUrl = process.env.TARGET_URL || `https://${domain}/search?keyword=airfryer`;
        await Page.navigate({ url: targetUrl });
        await Page.loadEventFired();

        // Trigger additional result loads by scrolling
        const SCROLL_STEPS = Number.parseInt(process.env.SCROLL_STEPS || '8', 10);
        const SCROLL_DELAY_MS = Number.parseInt(process.env.SCROLL_DELAY_MS || '1500', 10);
        const POST_IDLE_MS = Number.parseInt(process.env.POST_IDLE_MS || '3000', 10);

        // Small initial wait for first XHRs
        await new Promise((r) => setTimeout(r, 2000));

        for (let i = 0; i < SCROLL_STEPS; i++) {
            try {
                await Runtime.evaluate({
                    expression: 'window.scrollTo(0, document.body.scrollHeight); void 0;',
                    awaitPromise: false,
                });
            } catch { }
            await new Promise((r) => setTimeout(r, SCROLL_DELAY_MS));
        }

        // Allow trailing requests to finish
        await new Promise((r) => setTimeout(r, POST_IDLE_MS));

    } catch (err) {
        console.error(err);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

searchProducts().catch(console.error);