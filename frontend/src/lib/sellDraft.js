import { storage } from './storage.js';

// The unfinished listing's choices (crop, quantity, price, harvest date, which step). Photos are
// kept separately in IndexedDB by usePhotoUploads. Stored on the phone so closing the app or losing
// signal never loses a half-made listing. No personal data, so localStorage is fine.
const KEY = 'agc.sellDraft';

export const EMPTY_SELL_DRAFT = {
  step: 1,
  cropSlug: null,
  unit: null,
  quantity: null,
  priceRupees: null,
  harvestChoice: 'today',
  harvestDate: null,
  publishWhenOnline: false,
};

export function loadSellDraft() {
  try {
    const saved = JSON.parse(storage.get(KEY) ?? 'null');
    return saved ? { ...EMPTY_SELL_DRAFT, ...saved } : EMPTY_SELL_DRAFT;
  } catch {
    return EMPTY_SELL_DRAFT;
  }
}

export function saveSellDraft(draft) {
  storage.set(KEY, JSON.stringify(draft));
}

export function clearSellDraft() {
  storage.set(KEY, 'null');
}

// Calendar date in the phone's local time, as YYYY-MM-DD (what <input type="date"> uses).
export function localDateString(date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

// The harvest moment sent to the server: now for "today", noon local time for an earlier day.
export function harvestDateFor({ harvestChoice, harvestDate }, now = new Date()) {
  if (harvestChoice === 'today') return now;
  if (harvestChoice === 'yesterday') return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [year, month, day] = harvestDate.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
