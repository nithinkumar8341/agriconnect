import { useAuth } from '../auth/authContext.js';
import { loadBuyerLocation, locationFromProfile, locationParams } from '../lib/buyerLocation.js';

// Query string with where the buyer is shopping from, for distance and "delivers here" checks.
export function useBuyerLocationParams() {
  const { profile } = useAuth();
  return locationParams(loadBuyerLocation() ?? locationFromProfile(profile)).toString();
}
