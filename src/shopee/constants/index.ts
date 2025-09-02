import { join } from "node:path";

export const SEARCH_RESULTS_API_ENDPOINT = '/api/v4/search/search_items';
export const PDP_API_ENDPOINT = '/api/v4/pdp/get_pc';

export const LOG_DIR = 'logs';
export const REQ_LOG = join(LOG_DIR, 'search_items_requests.ndjson');
// Store only parsed JSON payloads (one JSON object per line)
export const RES_LOG = join(LOG_DIR, 'search_items_responses.json');
export const PROD_LOG = join(LOG_DIR, 'search_items_products.ndjson');

// PDP logs
export const PDP_REQ_LOG = join(LOG_DIR, 'pdp_requests.ndjson');
export const PDP_RES_LOG = join(LOG_DIR, 'pdp_responses.json');
export const PDP_PROD_LOG = join(LOG_DIR, 'pdp_products.ndjson');

export const SHOPEE_MONETARY_SCALE = 100000; // Shopee monetary scale
