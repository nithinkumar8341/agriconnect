import { computeOrderPricing } from '../src/services/pricing.service.js';

describe('computeOrderPricing', () => {
  it('totals line items and delivery in integer paise', () => {
    const { items, priceBreakdown } = computeOrderPricing({
      items: [
        { quantity: 2.5, pricePerUnit: 4000 },
        { quantity: 3, pricePerUnit: 1500 },
      ],
      deliveryFee: 2000,
      platformFeePercent: 0,
    });

    expect(items.map((i) => i.lineTotal)).toEqual([10000, 4500]);
    expect(priceBreakdown).toEqual({
      itemsTotal: 14500,
      deliveryFee: 2000,
      platformFee: 0,
      buyerTotal: 16500,
      farmerEarnings: 16500,
    });
  });

  it('deducts the platform fee from farmer earnings, not from the buyer', () => {
    const { priceBreakdown } = computeOrderPricing({
      items: [{ quantity: 1, pricePerUnit: 10000 }],
      deliveryFee: 1000,
      platformFeePercent: 5,
    });

    expect(priceBreakdown).toMatchObject({
      platformFee: 500,
      buyerTotal: 11000,
      farmerEarnings: 10500,
    });
  });

  it('rounds fractional paise to whole paise', () => {
    const { items, priceBreakdown } = computeOrderPricing({
      items: [{ quantity: 0.75, pricePerUnit: 3333 }],
      deliveryFee: 0,
      platformFeePercent: 2.5,
    });

    expect(items[0].lineTotal).toBe(2500);
    expect(priceBreakdown.platformFee).toBe(63);
    for (const value of Object.values(priceBreakdown)) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('always balances: buyer total = farmer earnings + platform fee', () => {
    for (let i = 0; i < 200; i += 1) {
      const { priceBreakdown: p } = computeOrderPricing({
        items: [
          {
            quantity: Math.round(Math.random() * 40) / 4,
            pricePerUnit: Math.floor(Math.random() * 20000),
          },
        ],
        deliveryFee: Math.floor(Math.random() * 5000),
        platformFeePercent: Math.round(Math.random() * 100) / 10,
      });
      expect(p.buyerTotal).toBe(p.farmerEarnings + p.platformFee);
    }
  });
});
