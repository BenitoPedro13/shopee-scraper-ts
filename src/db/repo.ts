import type { Prisma, SearchProduct } from '@prisma/client';
import { prisma } from './client';
import { SearchResultProductRecord } from '@/shopee/types/search-products';

export async function upsertSearchProducts(
  products: SearchResultProductRecord[],
  capturedAtISO: string
): Promise<SearchProduct[]> {
  if (!products.length) return [];
  const capturedAt = new Date(capturedAtISO);

  const results: SearchProduct[] = [];

  for (const p of products) {
    if (typeof p.itemid !== 'number' || typeof p.shopid !== 'number') continue;

    const data: Prisma.SearchProductUncheckedCreateInput = {
      itemid: p.itemid,
      shopid: p.shopid,
      name: p.name ?? null,
      shop_name: p.shop_name ?? null,
      catid: p.catid ?? null,
      brand: p.brand ?? null,
      image: p.image ?? null,
      images: p.images ? JSON.stringify(p.images) : null,
      price_raw: p.price_raw ?? null,
      price_min_raw: p.price_min_raw ?? null,
      price_max_raw: p.price_max_raw ?? null,
      price_before_discount_raw: p.price_before_discount_raw ?? null,
      price_min_before_discount_raw: p.price_min_before_discount_raw ?? null,
      price_max_before_discount_raw: p.price_max_before_discount_raw ?? null,
      price: p.price ?? null,
      price_min: p.price_min ?? null,
      price_max: p.price_max ?? null,
      price_before_discount: p.price_before_discount ?? null,
      price_min_before_discount: p.price_min_before_discount ?? null,
      price_max_before_discount: p.price_max_before_discount ?? null,
      currency: p.currency ?? null,
      stock: p.stock ?? null,
      sold: p.sold ?? null,
      historical_sold: p.historical_sold ?? null,
      liked: p.liked ?? null,
      liked_count: p.liked_count ?? null,
      cmt_count: p.cmt_count ?? null,
      view_count: p.view_count ?? null,
      rating_star: p.rating_star ?? null,
      rating_count_total: p.rating_count_total ?? null,
      rcount_with_context: p.rcount_with_context ?? null,
      rcount_with_image: p.rcount_with_image ?? null,
      rating_count_dist: p.rating_count_dist ? JSON.stringify(p.rating_count_dist) : null,
      tier_variations: p.tier_variations ? JSON.stringify(p.tier_variations) : null,
      video_info_list: p.video_info_list ? JSON.stringify(p.video_info_list) : null,
      shopee_verified: p.shopee_verified ?? null,
      is_official_shop: p.is_official_shop ?? null,
      is_preferred_plus_seller: p.is_preferred_plus_seller ?? null,
      item_status: p.item_status ?? null,
      status: p.status ?? null,
      shop_location: p.shop_location ?? null,
      ctime: p.ctime ?? null,
      item_type: p.item_type ?? null,
      reference_item_id: p.reference_item_id ?? null,
      transparent_background_image: p.transparent_background_image ?? null,
      is_adult: p.is_adult ?? null,
      has_lowest_price_guarantee: p.has_lowest_price_guarantee ?? null,
      is_cc_installment_payment_eligible: p.is_cc_installment_payment_eligible ?? null,
      is_non_cc_installment_payment_eligible: p.is_non_cc_installment_payment_eligible ?? null,
      is_on_flash_sale: p.is_on_flash_sale ?? null,
      can_use_cod: p.can_use_cod ?? null,
      can_use_wholesale: p.can_use_wholesale ?? null,
      bundle_deal_id: p.bundle_deal_id ?? null,
      bundle_deal_label: p.bundle_deal_label ?? null,
      voucher_promotion_id: p.voucher_promotion_id ?? null,
      model_id: p.model_id ?? null,
      display_price_raw: p.display_price_raw ?? null,
      strikethrough_price_raw: p.strikethrough_price_raw ?? null,
      original_price_raw: p.original_price_raw ?? null,
      discount_numeric: p.discount_numeric ?? null,
      display_price: p.display_price ?? null,
      strikethrough_price: p.strikethrough_price ?? null,
      original_price: p.original_price ?? null,
      adsid: p.adsid ?? null,
      campaignid: p.campaignid ?? null,
      data: JSON.stringify(p),
      capturedAt,
    };

    const updated = await prisma.searchProduct.upsert({
      where: { itemid_shopid: { itemid: p.itemid, shopid: p.shopid } },
      create: {
        ...data,
        lastSeenAt: capturedAt,
        seenCount: 1,
      },
      update: {
        ...data,
        lastSeenAt: capturedAt,
        seenCount: { increment: 1 },
        // Do not overwrite createdAt on update; Prisma manages updatedAt
      },
    });
    results.push(updated);
  }

  return results;
}

export async function insertProductDetail(params: {
  itemid: number;
  shopid: number;
  url?: string;
  data?: unknown;
  capturedAtISO: string;
}): Promise<void> {
  const { itemid, shopid, url, data, capturedAtISO } = params;
  const capturedAt = new Date(capturedAtISO);

  // Find parent SearchProduct id by unique (itemid, shopid)
  const sp = await prisma.searchProduct.findUnique({
    where: { itemid_shopid: { itemid, shopid } },
    select: { id: true },
  });

  const searchProductId = sp?.id;

  const parentId =
    searchProductId ?? (await ensureSearchProductPlaceholder(itemid, shopid)).id;

  await prisma.$transaction([
    prisma.productDetail.create({
      data: {
        searchProductId: parentId,
        itemid,
        shopid,
        url: url ?? null,
        data: data ? JSON.stringify(data) : null,
        capturedAt,
      },
    }),
    prisma.searchProduct.update({
      where: { itemid_shopid: { itemid, shopid } },
      data: {
        lastPdpAt: capturedAt,
        // agenda próxima coleta para ~24h depois
        nextPdpAt: new Date(capturedAt.getTime() + 24 * 60 * 60 * 1000),
      },
    }),
  ]);
}

async function ensureSearchProductPlaceholder(itemid: number, shopid: number) {
  return prisma.searchProduct.upsert({
    where: { itemid_shopid: { itemid, shopid } },
    create: { itemid, shopid, capturedAt: new Date() },
    update: {},
    select: { id: true },
  });
}

export async function findDueProducts(limit: number): Promise<Array<{ itemid: number; shopid: number }>> {
  const now = new Date();
  const rows = await prisma.searchProduct.findMany({
    where: {
      OR: [
        { lastPdpAt: null },
        { nextPdpAt: { lte: now } },
      ],
    },
    orderBy: [
      { lastPdpAt: 'asc' },
      { nextPdpAt: 'asc' },
    ],
    take: limit,
    select: { itemid: true, shopid: true },
  });
  return rows.map(r => ({ itemid: r.itemid, shopid: r.shopid }));
}
