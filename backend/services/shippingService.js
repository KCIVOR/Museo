// shippingService.js
// Minimal quote service with centralized static fallback.
// Later we can add AfterShip-based quoting here.

import { getStaticRate } from '../config/shippingRates.js';

/**
 * Get a shipping quote.
 * For now, returns static price based on courier + service.
 * Later: use seller origin, buyer destination, weight/dims, and provider.
 */
export async function getQuote({ courier, courierService }) {
  // Basic sanity
  if (!courier || !courierService) {
    return { price: 0, currency: 'PHP', provider: 'static' };
  }
  // Static fallback
  return getStaticRate(courier, courierService);
}

export default { getQuote };
