import { SHOPEE_MONETARY_SCALE } from "../constants";

export function normalizeMonetatyValue(value: unknown): number | null {
    if (typeof value === 'number') { return value / SHOPEE_MONETARY_SCALE }
    
    return null;
};