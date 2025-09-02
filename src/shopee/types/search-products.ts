export type RequestLike = { url: string; method?: string; postData?: string };

export type GetResponseBodyResponse = {
  base64Encoded: boolean;
  body: string;
}

export type TierVariation = {
  name?: string | null;
  options?: string[] | null;
  images?: string[] | null;
  type?: number | null;
};

export type VideoFormat = {
  format?: number | null;
  defn?: string | null;
  profile?: string | null;
  url?: string | null;
  width?: number | null;
  height?: number | null;
};

export type VideoInfo = {
  video_id?: string | null;
  thumb_url?: string | null;
  duration?: number | null;
  version?: number | null;
  vid?: string | null;
  formats?: VideoFormat[] | null;
  default_format?: VideoFormat | null;
};

export type SearchResultProductRecord = {
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