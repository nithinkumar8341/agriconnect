// The order status flow from CLAUDE.md as data: who may do what, from which statuses.
//   placed -> accepted -> out_for_delivery -> delivered
//   placed -> cancelled (buyer) | rejected (farmer)
//   accepted | out_for_delivery -> failed (farmer, with a reason)
// "restock" puts the ordered quantities back on sale.
export const ORDER_ACTIONS = Object.freeze({
  accept: { by: 'farmer', from: ['placed'], to: 'accepted' },
  reject: { by: 'farmer', from: ['placed'], to: 'rejected', restock: true },
  cancel: { by: 'buyer', from: ['placed'], to: 'cancelled', restock: true },
  dispatch: { by: 'farmer', from: ['accepted'], to: 'out_for_delivery' },
  deliver: { by: 'farmer', from: ['out_for_delivery'], to: 'delivered' },
  fail: {
    by: 'farmer',
    from: ['accepted', 'out_for_delivery'],
    to: 'failed',
    restock: true,
    needsReason: true,
  },
});

export const TERMINAL_STATUSES = ['delivered', 'cancelled', 'rejected', 'failed'];

// The status an action leads to, or null when the action is not allowed from `status`.
export function nextStatus(status, action) {
  const rule = ORDER_ACTIONS[action];
  return rule && rule.from.includes(status) ? rule.to : null;
}

// Actions a role may take on an order in `status` (drives the buttons shown in the app).
export function allowedActions(status, role) {
  return Object.entries(ORDER_ACTIONS)
    .filter(([, rule]) => rule.by === role && rule.from.includes(status))
    .map(([action]) => action);
}
