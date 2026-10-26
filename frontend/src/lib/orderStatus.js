// Order status colours, always shown with a text label (readable for colour-blind people and in sun).
export const ORDER_STATUS_STYLES = {
  placed: 'bg-sun-100 text-ink',
  accepted: 'bg-leaf-100 text-leaf-900',
  out_for_delivery: 'bg-leaf-100 text-leaf-900',
  delivered: 'bg-leaf-700 text-white',
  cancelled: 'bg-soil-100 text-soil-700',
  rejected: 'bg-danger-50 text-danger-800',
  failed: 'bg-danger-50 text-danger-800',
};
