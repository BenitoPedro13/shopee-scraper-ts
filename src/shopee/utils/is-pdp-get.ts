import { PDP_API_ENDPOINT } from "@/shopee/constants";
import { RequestLike } from "@/shopee/types/search-products";

export function isPdpGet(request: RequestLike) {
  try {
    const u = new URL(request.url);
    return u.pathname.startsWith(PDP_API_ENDPOINT);
  } catch {
    return false;
  }
}

