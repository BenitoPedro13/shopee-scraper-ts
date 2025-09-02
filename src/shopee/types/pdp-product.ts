export type PdpTierVariation = {
  name?: string | null;
  options?: string[] | null;
  images?: string[] | null;
};

export type PdpModel = {
  model_id?: number | null;
  name?: string | null;
  price?: number | null; // normalized
  price_raw?: number | null; // raw (Shopee scale)
  stock?: number | null;
  sold?: number | null;
};

export type PdpProductRecord = {
  item_id?: number;
  shop_id?: number;
  title?: string | null;
  currency?: string | null;

  // Images
  image?: string | null;
  images?: string[] | null;

  // Price
  price?: number | null;
  price_min?: number | null;
  price_max?: number | null;
  price_before_discount?: number | null;
  price_raw?: number | null;
  price_min_raw?: number | null;
  price_max_raw?: number | null;
  price_before_discount_raw?: number | null;

  // Review / social
  rating_star?: number | null;
  historical_sold?: number | null;
  liked_count?: number | null;
  cmt_count?: number | null;

  // Variations / models
  tier_variations?: PdpTierVariation[] | null;
  models?: PdpModel[] | null;

  // Description
  description?: string | null;
  rich_text_paragraphs?: any[] | null;

  // Shop
  shop_name?: string | null;
};

