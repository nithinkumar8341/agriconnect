// Display helpers. Amounts from the API are integer paise; people read rupees.
export function formatRupees(paise, language) {
  const rupees = paise / 100;
  return new Intl.NumberFormat(`${language}-IN`, {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function formatQuantity(value, language) {
  return new Intl.NumberFormat(`${language}-IN`, { maximumFractionDigits: 2 }).format(value);
}

export function formatDate(value, language) {
  return new Intl.DateTimeFormat(`${language}-IN`, { day: 'numeric', month: 'short' }).format(
    new Date(value),
  );
}

export function formatTime(hhmm, language) {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return new Intl.DateTimeFormat(`${language}-IN`, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2000, 0, 1, hours, minutes),
  );
}

// Crop and district names come from the API in en/te/hi; fall back to English for anything else.
export const localName = (names, language) => names?.[language] ?? names?.en ?? '';
