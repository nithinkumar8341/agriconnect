// Single source of truth for order money. All amounts are integer paise.
// The platform fee is a commission on the produce value, deducted from what the farmer receives;
// the buyer pays produce + delivery. With the pilot default of 0% the two views are identical.
export function computeOrderPricing({ items, deliveryFee, platformFeePercent }) {
  const pricedItems = items.map((item) => ({
    ...item,
    lineTotal: Math.round(item.quantity * item.pricePerUnit),
  }));
  const itemsTotal = pricedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const platformFee = Math.round((itemsTotal * platformFeePercent) / 100);

  return {
    items: pricedItems,
    priceBreakdown: {
      itemsTotal,
      deliveryFee,
      platformFee,
      buyerTotal: itemsTotal + deliveryFee,
      farmerEarnings: itemsTotal + deliveryFee - platformFee,
    },
  };
}
