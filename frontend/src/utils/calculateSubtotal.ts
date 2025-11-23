import type { RequestItem } from '@/types';

/**
 * Calculate the subtotal for a request item
 * 
 * Handles numeric or string subtotal, quantity, and unit_price.
 * Falls back to quantity * unit_price when subtotal is absent.
 * 
 * @param item - The request item to calculate subtotal for
 * @returns The calculated subtotal as a number
 */
export function calculateSubtotal(item: RequestItem | Omit<RequestItem, 'id' | 'subtotal' | 'created_at' | 'updated_at'>): number {
  // If subtotal is already provided, use it
  if ('subtotal' in item && item.subtotal !== undefined && item.subtotal !== null) {
    return typeof item.subtotal === 'number' 
      ? item.subtotal 
      : parseFloat(item.subtotal as string) || 0;
  }

  // Calculate from quantity and unit_price
  const quantity = typeof item.quantity === 'number' 
    ? item.quantity 
    : parseFloat(item.quantity as string) || 0;
  
  const unitPrice = typeof item.unit_price === 'number' 
    ? item.unit_price 
    : parseFloat(item.unit_price as string) || 0;

  return quantity * unitPrice;
}

/**
 * Calculate the total amount for all items
 * 
 * @param items - Array of request items
 * @returns The total sum of all item subtotals
 */
export function calculateTotal(items: (RequestItem | Omit<RequestItem, 'id' | 'subtotal' | 'created_at' | 'updated_at'>)[]): number {
  return items.reduce((total, item) => total + calculateSubtotal(item), 0);
}
