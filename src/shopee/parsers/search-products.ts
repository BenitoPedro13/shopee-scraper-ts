import { SearchResultProductRecord, TierVariation, VideoInfo } from '@/shopee/types/search-products';
import { normalizeMonetatyValue } from '@/shopee/utils/normalize-monetary-values';

function extractRatings(src: any) {
    const rating = src?.item_rating ?? {};
    const ratingCountArr: number[] | null = Array.isArray(rating.rating_count) ? rating.rating_count : null;
    const ratingTotal = ratingCountArr
        ? ratingCountArr.reduce((a: number, b: unknown) => a + (typeof b === 'number' ? b : 0), 0)
        : null;
    return {
        rating_star: typeof rating.rating_star === 'number' ? rating.rating_star : null,
        rating_count_total: ratingTotal,
        rcount_with_context: rating.rcount_with_context ?? null,
        rcount_with_image: rating.rcount_with_image ?? null,
        rating_count_dist: ratingCountArr,
    } as Pick<
        SearchResultProductRecord,
        'rating_star' | 'rating_count_total' | 'rcount_with_context' | 'rcount_with_image' | 'rating_count_dist'
    >;
}

function extractTierVariations(src: any): TierVariation[] | null {
    if (!Array.isArray(src?.tier_variations)) return null;
    return src.tier_variations.map((tv: any) => ({
        name: tv?.name ?? null,
        options: Array.isArray(tv?.options) ? tv.options : null,
        images: Array.isArray(tv?.images) ? tv.images : null,
        type: typeof tv?.type === 'number' ? tv.type : null,
    }));
}

function extractVideoInfoList(src: any): VideoInfo[] | null {
    if (!Array.isArray(src?.video_info_list)) return null;
    return src.video_info_list.map((v: any) => ({
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
    }));
}

function extractIdentity(src: any) {
    return {
        itemid: src?.itemid,
        shopid: src?.shopid,
        name: src?.name,
        shop_name: src?.shop_name ?? null,
        catid: src?.catid ?? null,
        brand: src?.brand ?? null,
        label_ids: Array.isArray(src?.label_ids) ? src.label_ids : null,
        image: src?.image ?? null,
        images: Array.isArray(src?.images) ? src.images : null,
        currency: src?.currency,
    } satisfies Partial<SearchResultProductRecord>;
}

function extractPrices(src: any) {
    return {
        price_raw: src?.price ?? null,
        price_min_raw: src?.price_min ?? null,
        price_max_raw: src?.price_max ?? null,
        price_before_discount_raw: src?.price_before_discount ?? null,
        price_min_before_discount_raw: src?.price_min_before_discount ?? null,
        price_max_before_discount_raw: src?.price_max_before_discount ?? null,
        price: normalizeMonetatyValue(src?.price),
        price_min: normalizeMonetatyValue(src?.price_min),
        price_max: normalizeMonetatyValue(src?.price_max),
        price_before_discount: normalizeMonetatyValue(src?.price_before_discount),
        price_min_before_discount: normalizeMonetatyValue(src?.price_min_before_discount),
        price_max_before_discount: normalizeMonetatyValue(src?.price_max_before_discount),
    } as Pick<
        SearchResultProductRecord,
        | 'price_raw'
        | 'price_min_raw'
        | 'price_max_raw'
        | 'price_before_discount_raw'
        | 'price_min_before_discount_raw'
        | 'price_max_before_discount_raw'
        | 'price'
        | 'price_min'
        | 'price_max'
        | 'price_before_discount'
        | 'price_min_before_discount'
        | 'price_max_before_discount'
    >;
}

function extractDiscounts(src: any) {
    return {
        raw_discount: src?.raw_discount ?? null,
        show_discount: src?.show_discount ?? null,
        discount: src?.discount ?? null,
    } as Pick<SearchResultProductRecord, 'raw_discount' | 'show_discount' | 'discount'>;
}

function extractStockSales(src: any) {
    return {
        stock: src?.stock ?? null,
        sold: src?.sold ?? null,
        historical_sold: src?.historical_sold ?? null,
    } as Pick<SearchResultProductRecord, 'stock' | 'sold' | 'historical_sold'>;
}

function extractSocial(src: any) {
    return {
        liked: src?.liked ?? null,
        liked_count: src?.liked_count ?? null,
        cmt_count: src?.cmt_count ?? null,
        view_count: src?.view_count ?? null,
    } as Pick<SearchResultProductRecord, 'liked' | 'liked_count' | 'cmt_count' | 'view_count'>;
}

function extractDisplayBlock(src: any) {
    const display = src?.item_card_display_price ?? {};
    const model_id =
        typeof src?.model_id === 'number'
            ? src.model_id
            : typeof display?.model_id === 'number'
                ? display.model_id
                : null;
    return {
        display_price_raw: typeof display?.price === 'number' ? display.price : null,
        strikethrough_price_raw: typeof display?.strikethrough_price === 'number' ? display.strikethrough_price : null,
        original_price_raw: typeof display?.original_price === 'number' ? display.original_price : null,
        discount_numeric: typeof display?.discount === 'number' ? display.discount : null,
        display_price: normalizeMonetatyValue(display?.price),
        strikethrough_price: normalizeMonetatyValue(display?.strikethrough_price),
        original_price: normalizeMonetatyValue(display?.original_price),
        model_id,
    } as Pick<
        SearchResultProductRecord,
        | 'display_price_raw'
        | 'strikethrough_price_raw'
        | 'original_price_raw'
        | 'discount_numeric'
        | 'display_price'
        | 'strikethrough_price'
        | 'original_price'
        | 'model_id'
    >;
}

function extractFlagsAndMisc(src: any) {
    return {
        shopee_verified: src?.shopee_verified ?? null,
        is_official_shop: src?.is_official_shop ?? null,
        is_preferred_plus_seller: src?.is_preferred_plus_seller ?? null,
        item_status: src?.item_status ?? null,
        status: src?.status ?? null,
        shop_location: src?.shop_location ?? null,
        ctime: src?.ctime ?? null,
        item_type: src?.item_type ?? null,
        reference_item_id: src?.reference_item_id ?? null,
        transparent_background_image: src?.transparent_background_image ?? null,
        is_adult: src?.is_adult ?? null,
        has_lowest_price_guarantee: src?.has_lowest_price_guarantee ?? null,
        is_cc_installment_payment_eligible: src?.is_cc_installment_payment_eligible ?? null,
        is_non_cc_installment_payment_eligible: src?.is_non_cc_installment_payment_eligible ?? null,
        is_on_flash_sale: src?.is_on_flash_sale ?? null,
        can_use_cod: src?.can_use_cod ?? null,
        can_use_wholesale: src?.can_use_wholesale ?? null,
        bundle_deal_id: src?.bundle_deal_id ?? null,
        bundle_deal_label: src?.bundle_deal_info?.bundle_deal_label ?? null,
        voucher_promotion_id: src?.voucher_info?.promotion_id ?? null,
    } satisfies Partial<SearchResultProductRecord>;
}

function extractWrapperMeta(wrapper: any) {
    return {
        adsid: wrapper?.adsid ?? null,
        campaignid: wrapper?.campaignid ?? null,
    } as Pick<SearchResultProductRecord, 'adsid' | 'campaignid'>;
}

function extractVariationsAndMedia(src: any) {
    return {
        tier_variations: extractTierVariations(src),
        video_info_list: extractVideoInfoList(src),
    } as Pick<SearchResultProductRecord, 'tier_variations' | 'video_info_list'>;
}

export function parseProductsFromResponse(body: any): SearchResultProductRecord[] {
    const out: SearchResultProductRecord[] = [];

    if (!body) return out;

    const pushFrom = (wrapper: any, src: any) => {
        if (!src || typeof src !== 'object') return;
        
        out.push({
            // Identity
            ...extractIdentity(src),
            // Pricing
            ...extractPrices(src),
            ...extractDiscounts(src),
            // Stock & Social
            ...extractStockSales(src),
            ...extractSocial(src),
            // Ratings
            ...extractRatings(src),
            // Variations & Videos
            ...extractVariationsAndMedia(src),
            // Flags & misc
            ...extractFlagsAndMisc(src),
            // Display block
            ...extractDisplayBlock(src),
            // Wrapper meta
            ...extractWrapperMeta(wrapper),
        });
    };

    if (Array.isArray(body?.items)) {
        for (const it of body.items) pushFrom(it, it?.item_basic ?? it);
        return out;
    }
    if (Array.isArray(body?.data?.items)) {
        for (const it of body.data.items) pushFrom(it, it?.item_basic ?? it);
        return out;
    }
    return out;
}