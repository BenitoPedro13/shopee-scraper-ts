export function buildProductUrl(params: { domain?: string; shopid: number; itemid: number }) {
  const domain = params.domain || process.env.SHOPEE_DOMAIN || 'shopee.com.br';
  const { shopid, itemid } = params;
  return `https://${domain}/product/${shopid}/${itemid}`;
}

