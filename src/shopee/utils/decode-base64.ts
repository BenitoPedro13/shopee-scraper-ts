import { GetResponseBodyResponse } from "@/shopee/types/search-products";


export function decodeBody({base64Encoded, body}: GetResponseBodyResponse): string {
  if (!base64Encoded) return body;
  try {
    return Buffer.from(body, 'base64').toString('utf8');
  } catch {
    return '';
  }
}