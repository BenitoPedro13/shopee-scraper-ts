import { RequestLike } from "@/shopee/types/search-products";
import { SEARCH_RESULTS_API_ENDPOINT } from "@/shopee/constants";

export function isSearchItems(request: RequestLike) {
  try {
    const u = new URL(request.url);
    return u.pathname.startsWith(SEARCH_RESULTS_API_ENDPOINT);
  } catch {
    return false;
  }
}