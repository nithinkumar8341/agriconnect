import { storage } from './storage.js';

// Where the buyer is shopping from: { lat, lng } from the phone or a saved address, and/or a
// pincode. Kept on the phone so the choice survives restarts; it is sent only with searches.
const KEY = 'agc.buyerLocation';
const PINCODE = /^[1-9]\d{5}$/;

const isValid = (location) =>
  Boolean(location) && (PINCODE.test(location.pincode ?? '') || Number.isFinite(location.lat));

export function loadBuyerLocation() {
  try {
    const saved = JSON.parse(storage.get(KEY) ?? 'null');
    return isValid(saved) ? saved : null;
  } catch {
    return null;
  }
}

export function saveBuyerLocation(location) {
  storage.set(KEY, JSON.stringify(location));
}

// The default delivery address from onboarding, used until the buyer picks something else.
export function locationFromProfile(profile) {
  const addresses = profile?.addresses ?? [];
  const address = addresses.find((a) => a.isDefault) ?? addresses[0];
  if (!address) return null;
  return {
    pincode: address.pincode,
    ...(address.location && { lat: address.location.latitude, lng: address.location.longitude }),
  };
}

export function locationParams(location) {
  const params = new URLSearchParams();
  if (Number.isFinite(location?.lat)) {
    params.set('lat', String(location.lat));
    params.set('lng', String(location.lng));
  }
  if (location?.pincode) params.set('pincode', location.pincode);
  return params;
}

export const isPincode = (value) => PINCODE.test(value);
