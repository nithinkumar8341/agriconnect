// People type, paste or autofill numbers as "+91 98765-43210", "09876543210" or "919876543210".
// We keep only the 10-digit national number; the server normalises again and is the authority.
export function toNationalNumber(raw) {
  let digits = String(raw).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export const isValidMobile = (national) => /^[6-9]\d{9}$/.test(national);

export const formatPhone = (national) => `+91 ${national.slice(0, 5)} ${national.slice(5)}`;
