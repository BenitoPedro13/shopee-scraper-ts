import { normalizeMonetatyValue } from "@/shopee/utils/normalize-monetary-values";
import { PdpProductRecord, PdpModel, PdpTierVariation } from "@/shopee/types/pdp-product";

function extractImages(body: any) {
  const item = body?.item ?? {};
  const product_images = body?.product_images ?? {};
  const images: string[] | null = Array.isArray(product_images.images) ? product_images.images : null;
  return {
    image: item?.image ?? null,
    images,
  } as Pick<PdpProductRecord, 'image' | 'images'>;
}

function extractPrice(body: any) {
  const price = body?.product_price?.price ?? {};
  const price_before_discount = body?.product_price?.price_before_discount ?? {};
  const item = body?.item ?? {};
  const price_raw = typeof price?.single_value === 'number' ? price.single_value : null;
  const price_before_raw = typeof item?.price_before_discount === 'number' ? item.price_before_discount : (typeof price_before_discount?.single_value === 'number' ? price_before_discount.single_value : null);
  const min_raw = typeof item?.price_min === 'number' ? item.price_min : null;
  const max_raw = typeof item?.price_max === 'number' ? item.price_max : null;
  return {
    price_raw,
    price_min_raw: min_raw,
    price_max_raw: max_raw,
    price_before_discount_raw: price_before_raw,
    price: normalizeMonetatyValue(price_raw),
    price_min: normalizeMonetatyValue(min_raw),
    price_max: normalizeMonetatyValue(max_raw),
    price_before_discount: normalizeMonetatyValue(price_before_raw),
  } as Pick<PdpProductRecord, 'price_raw' | 'price_min_raw' | 'price_max_raw' | 'price_before_discount_raw' | 'price' | 'price_min' | 'price_max' | 'price_before_discount'>;
}

function extractIdentity(body: any) {
  const item = body?.item ?? {};
  const shop = body?.shop_detailed ?? {};
  return {
    item_id: item?.item_id,
    shop_id: item?.shop_id ?? shop?.shopid,
    title: item?.title ?? null,
    currency: item?.currency ?? null,
    shop_name: shop?.name ?? null,
  } as Pick<PdpProductRecord, 'item_id' | 'shop_id' | 'title' | 'currency' | 'shop_name'>;
}

function extractReview(body: any) {
  const item = body?.item ?? {};
  const review = body?.product_review ?? {};
  return {
    rating_star: (typeof item?.item_rating?.rating_star === 'number' ? item.item_rating.rating_star : (typeof review?.rating_star === 'number' ? review.rating_star : null)) ?? null,
    historical_sold: typeof review?.historical_sold === 'number' ? review.historical_sold : null,
    liked_count: typeof review?.liked_count === 'number' ? review.liked_count : null,
    cmt_count: typeof review?.cmt_count === 'number' ? review.cmt_count : null,
  } as Pick<PdpProductRecord, 'rating_star' | 'historical_sold' | 'liked_count' | 'cmt_count'>;
}

function extractVariations(body: any): PdpTierVariation[] | null {
  const item = body?.item ?? {};
  if (!Array.isArray(item?.tier_variations)) return null;
  return item.tier_variations.map((tv: any) => ({
    name: tv?.name ?? null,
    options: Array.isArray(tv?.options) ? tv.options : null,
    images: Array.isArray(tv?.images) ? tv.images : null,
  }));
}

function extractModels(body: any): PdpModel[] | null {
  const item = body?.item ?? {};
  if (!Array.isArray(item?.models)) return null;
  return item.models.map((m: any) => ({
    model_id: typeof m?.model_id === 'number' ? m.model_id : null,
    name: m?.name ?? null,
    price_raw: typeof m?.price === 'number' ? m.price : null,
    price: normalizeMonetatyValue(m?.price),
    stock: typeof m?.stock === 'number' ? m.stock : null,
    sold: typeof m?.sold === 'number' ? m.sold : null,
  }));
}

function extractDescriptions(body: any) {
  const item = body?.item ?? {};
  const rich = body?.rich_text_description ?? body?.product_description ?? {};
  const paragraphs = Array.isArray(rich?.paragraph_list) ? rich.paragraph_list : null;
  return {
    description: typeof item?.description === 'string' ? item.description : null,
    rich_text_paragraphs: paragraphs,
  } as Pick<PdpProductRecord, 'description' | 'rich_text_paragraphs'>;
}

export function parsePdpFromResponse(body: any): PdpProductRecord | null {
  if (!body || typeof body !== 'object') return null;
  return {
    ...extractIdentity(body),
    ...extractImages(body),
    ...extractPrice(body),
    ...extractReview(body),
    tier_variations: extractVariations(body),
    models: extractModels(body),
    ...extractDescriptions(body),
  };
}

