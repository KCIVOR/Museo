// Centralized static shipping rates (fallback)
// Brand names must match frontend and seller preferences exactly.

export const shippingRates = {
  'J&T Express': { standard: 100, express: 180 },
  'LBC': { standard: 120, express: 250 }
};

// Optionally map UI brand/service to provider service codes (placeholder for future AfterShip integration)
export const serviceCodeMap = {
  'LBC': {
    standard: 'lbc_standard',
    express: 'lbc_express'
  },
  'J&T Express': {
    standard: 'jnt_standard',
    express: 'jnt_express'
  }
};

export function getStaticRate(courier, courierService) {
  const price = Number(shippingRates[courier]?.[courierService]) || 0;
  return {
    price,
    currency: 'PHP',
    provider: 'static',
  };
}
