// Indian mobile numbers start with 6-9. People type them with +91, 91, a leading 0, spaces or dashes.
const INDIAN_MOBILE = /^(?:\+91|91|0)?([6-9]\d{9})$/;

export function normalizeIndianPhone(input) {
  if (typeof input !== 'string') return null;
  const match = input.replace(/[\s-]/g, '').match(INDIAN_MOBILE);
  return match ? `+91${match[1]}` : null;
}

// For logs and support screens: enough to tell numbers apart, not enough to call someone.
export function maskPhone(phone) {
  if (typeof phone !== 'string' || phone.length < 7) return '[phone]';
  return `${phone.slice(0, 3)}******${phone.slice(-4)}`;
}
