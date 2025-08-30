import 'dotenv/config';
import CDP from 'chrome-remote-interface';
import { appendFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { upsertSearchProducts } from './db/repo';

type RequestLike = { url: string; method?: string; postData?: string };
const TARGET_PATH = '/api/v4/search/search_items';
const LOG_DIR = 'logs';
const REQ_LOG = join(LOG_DIR, 'search_items_requests.ndjson');
// Store only parsed JSON payloads (one JSON object per line)
const RES_LOG = join(LOG_DIR, 'search_items_responses.json');
const PROD_LOG = join(LOG_DIR, 'search_items_products.ndjson');

type TierVariation = {
  name?: string | null;
  options?: string[] | null;
  images?: string[] | null;
  type?: number | null;
};

type VideoFormat = {
  format?: number | null;
  defn?: string | null;
  profile?: string | null;
  url?: string | null;
  width?: number | null;
  height?: number | null;
};

type VideoInfo = {
  video_id?: string | null;
  thumb_url?: string | null;
  duration?: number | null;
  version?: number | null;
  vid?: string | null;
  formats?: VideoFormat[] | null;
  default_format?: VideoFormat | null;
};

type ProductRecord = {
  // Identity
  itemid?: number;
  shopid?: number;
  name?: string;
  shop_name?: string | null;

  // Category / brand
  catid?: number | null;
  brand?: string | null;
  label_ids?: number[] | null;

  // Images
  image?: string | null;
  images?: string[] | null;

  // Price raw (Shopee scale = 100000)
  price_raw?: number | null;
  price_min_raw?: number | null;
  price_max_raw?: number | null;
  price_before_discount_raw?: number | null;
  price_min_before_discount_raw?: number | null;
  price_max_before_discount_raw?: number | null;

  // Price normalized (
  price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  price_before_discount?: number | null;
  price_min_before_discount?: number | null;
  price_max_before_discount?: number | null;
  currency?: string;

  // Discount
  raw_discount?: number | null;
  show_discount?: number | null;
  discount?: string | null;

  // Stock / sales
  stock?: number | null;
  sold?: number | null;
  historical_sold?: number | null;

  // Social
  liked?: boolean | null;
  liked_count?: number | null;
  cmt_count?: number | null;
  view_count?: number | null;

  // Ratings (flattened)
  rating_star?: number | null;
  rating_count_total?: number | null;
  rcount_with_context?: number | null;
  rcount_with_image?: number | null;
  rating_count_dist?: number[] | null;

  // Variations (names + options only)
  tier_variations?: TierVariation[] | null;

  // Videos
  video_info_list?: VideoInfo[] | null;

  // Shop flags
  shopee_verified?: boolean | null;
  is_official_shop?: boolean | null;
  is_preferred_plus_seller?: boolean | null;

  // Misc
  item_status?: string | null;
  status?: number | null;
  shop_location?: string | null;
  ctime?: number | null;
  item_type?: number | null;
  reference_item_id?: string | null;
  transparent_background_image?: string | null;
  is_adult?: boolean | null;
  has_lowest_price_guarantee?: boolean | null;
  is_cc_installment_payment_eligible?: boolean | null;
  is_non_cc_installment_payment_eligible?: boolean | null;
  is_on_flash_sale?: boolean | null;
  can_use_cod?: boolean | null;
  can_use_wholesale?: boolean | null;
  bundle_deal_id?: number | null;
  bundle_deal_label?: string | null;
  voucher_promotion_id?: number | null;
  model_id?: number | null;

  // Display price block
  display_price_raw?: number | null;
  strikethrough_price_raw?: number | null;
  original_price_raw?: number | null;
  discount_numeric?: number | null;
  display_price?: number | null;
  strikethrough_price?: number | null;
  original_price?: number | null;

  // Wrapper-level ads metadata
  adsid?: number | null;
  campaignid?: number | null;
};

function isSearchItems(request: RequestLike) {
  try {
    const u = new URL(request.url);
    return u.pathname.startsWith(TARGET_PATH);
  } catch {
    return false;
  }
}

async function ensureLogsDir() {
  if (!existsSync(LOG_DIR)) {
    await mkdir(LOG_DIR, { recursive: true });
  }
}

function decodeBody(base64Encoded: boolean, body: string): string {
  if (!base64Encoded) return body;
  try {
    return Buffer.from(body, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function extractProducts(payload: any): ProductRecord[] {
  const out: ProductRecord[] = [];
  if (!payload) return out;

  const scale = 100000; // Shopee monetary scale
  const norm = (v: any): number | null => (typeof v === 'number' ? v / scale : null);

  const pushFrom = (wrapper: any, src: any) => {
    if (!src || typeof src !== 'object') return;
    const rating = src.item_rating || {};
    const ratingCountArr: number[] | null = Array.isArray(rating.rating_count) ? rating.rating_count : null;
    const ratingTotal = ratingCountArr ? ratingCountArr.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0) : null;
    const tvList = Array.isArray(src.tier_variations)
      ? src.tier_variations.map((tv: any) => ({
          name: tv?.name ?? null,
          options: Array.isArray(tv?.options) ? tv.options : null,
          images: Array.isArray(tv?.images) ? tv.images : null,
          type: typeof tv?.type === 'number' ? tv.type : null,
        }))
      : null;

    const videoList: VideoInfo[] | null = Array.isArray(src.video_info_list)
      ? src.video_info_list.map((v: any) => ({
          video_id: v?.video_id ?? null,
          thumb_url: v?.thumb_url ?? null,
          duration: typeof v?.duration === 'number' ? v.duration : null,
          version: typeof v?.version === 'number' ? v.version : null,
          vid: v?.vid ?? null,
          formats: Array.isArray(v?.formats)
            ? v.formats.map((f: any) => ({
                format: typeof f?.format === 'number' ? f.format : null,
                defn: f?.defn ?? null,
                profile: f?.profile ?? null,
                url: f?.url ?? null,
                width: typeof f?.width === 'number' ? f.width : null,
                height: typeof f?.height === 'number' ? f.height : null,
              }))
            : null,
          default_format: v?.default_format
            ? {
                format: typeof v.default_format.format === 'number' ? v.default_format.format : null,
                defn: v.default_format.defn ?? null,
                profile: v.default_format.profile ?? null,
                url: v.default_format.url ?? null,
                width: typeof v.default_format.width === 'number' ? v.default_format.width : null,
                height: typeof v.default_format.height === 'number' ? v.default_format.height : null,
              }
            : null,
        }))
      : null;

    const display = src.item_card_display_price || {};

    out.push({
      itemid: src.itemid,
      shopid: src.shopid,
      name: src.name,
      shop_name: src.shop_name ?? null,
      catid: src.catid ?? null,
      brand: src.brand ?? null,
      label_ids: Array.isArray(src.label_ids) ? src.label_ids : null,
      image: src.image ?? null,
      images: Array.isArray(src.images) ? src.images : null,

      price_raw: src.price ?? null,
      price_min_raw: src.price_min ?? null,
      price_max_raw: src.price_max ?? null,
      price_before_discount_raw: src.price_before_discount ?? null,
      price_min_before_discount_raw: src.price_min_before_discount ?? null,
      price_max_before_discount_raw: src.price_max_before_discount ?? null,

      price: norm(src.price),
      price_min: norm(src.price_min),
      price_max: norm(src.price_max),
      price_before_discount: norm(src.price_before_discount),
      price_min_before_discount: norm(src.price_min_before_discount),
      price_max_before_discount: norm(src.price_max_before_discount),
      currency: src.currency,

      raw_discount: src.raw_discount ?? null,
      show_discount: src.show_discount ?? null,
      discount: src.discount ?? null,

      stock: src.stock ?? null,
      sold: src.sold ?? null,
      historical_sold: src.historical_sold ?? null,

      liked: src.liked ?? null,
      liked_count: src.liked_count ?? null,
      cmt_count: src.cmt_count ?? null,
      view_count: src.view_count ?? null,

      rating_star: typeof rating.rating_star === 'number' ? rating.rating_star : null,
      rating_count_total: ratingTotal,
      rcount_with_context: rating.rcount_with_context ?? null,
      rcount_with_image: rating.rcount_with_image ?? null,
      rating_count_dist: ratingCountArr,

      tier_variations: tvList,
      video_info_list: videoList,

      shopee_verified: src.shopee_verified ?? null,
      is_official_shop: src.is_official_shop ?? null,
      is_preferred_plus_seller: src.is_preferred_plus_seller ?? null,

      item_status: src.item_status ?? null,
      status: src.status ?? null,
      shop_location: src.shop_location ?? null,
      ctime: src.ctime ?? null,
      item_type: src.item_type ?? null,
      reference_item_id: src.reference_item_id ?? null,
      transparent_background_image: src.transparent_background_image ?? null,
      is_adult: src.is_adult ?? null,
      has_lowest_price_guarantee: src.has_lowest_price_guarantee ?? null,
      is_cc_installment_payment_eligible: src.is_cc_installment_payment_eligible ?? null,
      is_non_cc_installment_payment_eligible: src.is_non_cc_installment_payment_eligible ?? null,
      is_on_flash_sale: src.is_on_flash_sale ?? null,
      can_use_cod: src.can_use_cod ?? null,
      can_use_wholesale: src.can_use_wholesale ?? null,
      bundle_deal_id: src.bundle_deal_id ?? null,
      bundle_deal_label: src.bundle_deal_info?.bundle_deal_label ?? null,
      voucher_promotion_id: src.voucher_info?.promotion_id ?? null,
      model_id: typeof src.model_id === 'number' ? src.model_id : (typeof display.model_id === 'number' ? display.model_id : null),

      display_price_raw: typeof display.price === 'number' ? display.price : null,
      strikethrough_price_raw: typeof display.strikethrough_price === 'number' ? display.strikethrough_price : null,
      original_price_raw: typeof display.original_price === 'number' ? display.original_price : null,
      discount_numeric: typeof display.discount === 'number' ? display.discount : null,
      display_price: norm(display.price),
      strikethrough_price: norm(display.strikethrough_price),
      original_price: norm(display.original_price),

      adsid: wrapper?.adsid ?? null,
      campaignid: wrapper?.campaignid ?? null,
    });
  };

  // Common shapes
  if (Array.isArray(payload?.items)) {
    for (const it of payload.items) pushFrom(it, it?.item_basic ?? it);
    return out;
  }
  if (Array.isArray(payload?.data?.items)) {
    for (const it of payload.data.items) pushFrom(it, it?.item_basic ?? it);
    return out;
  }
  return out;
}

CDP()
  .then(async (client) => {
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
        try { await appendFile(REQ_LOG, JSON.stringify(entry) + '\n'); } catch {}
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
        const match = u.pathname.startsWith(TARGET_PATH);
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
        const text = decodeBody(body.base64Encoded, body.body);

        // Only persist parsed JSON payloads
        try {
          const json = JSON.parse(text);
          await appendFile(RES_LOG, JSON.stringify(json) + '\n');

          const products = extractProducts(json);
          if (products.length) {
            const t = new Date().toISOString();
            const lines = products.map((p) => JSON.stringify({ t, ...p })).join('\n') + '\n';
            await appendFile(PROD_LOG, lines);
            try {
              await upsertSearchProducts(products, t);
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

    try {
      // enable domains
      await Network.enable();
      await Page.enable();
      await Runtime.enable();

      // enable request interception only for the target pattern
      await Network.setRequestInterception({
        patterns: [
          { urlPattern: `*${TARGET_PATH}*` },
        ],
      });

      // disable cache
      await Network.setCacheDisabled({ cacheDisabled: true });

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
        } catch {}
        await new Promise((r) => setTimeout(r, SCROLL_DELAY_MS));
      }

      // Allow trailing requests to finish
      await new Promise((r) => setTimeout(r, POST_IDLE_MS));
    } catch (err: unknown) {
      console.error(err);
    } finally {
      client.close();
    }
  })
  .catch((err: unknown) => {
    console.error(err);
  });
