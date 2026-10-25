import { BuyerProfile } from '../models/BuyerProfile.js';
import { FarmerProfile } from '../models/FarmerProfile.js';

const toPoint = (location) =>
  location ? { type: 'Point', coordinates: [location.longitude, location.latitude] } : undefined;

const fromPoint = (point) =>
  point?.coordinates ? { latitude: point.coordinates[1], longitude: point.coordinates[0] } : null;

// This is the owner's own view (exact location included). Buyers will get a separate public view
// with approximate distance only (Prompt 9).
export function toOwnFarmerProfile(profile) {
  return {
    name: profile.name,
    state: profile.state,
    district: profile.district,
    mandal: profile.mandal,
    village: profile.village,
    pincode: profile.pincode,
    location: fromPoint(profile.location),
    deliveryRadiusKm: profile.deliveryRadiusKm,
    servicePincodes: [...profile.servicePincodes],
    deliveryDays: [...profile.deliveryDays],
    cutoffTime: profile.cutoffTime,
    minOrderValue: profile.minOrderValue,
    deliveryFee: profile.deliveryFee,
    verificationLevel: profile.verificationLevel,
  };
}

export function toOwnBuyerProfile(profile) {
  return {
    name: profile.name,
    addresses: profile.addresses.map((address) => ({
      id: address._id.toString(),
      label: address.label,
      houseAndStreet: address.houseAndStreet,
      landmark: address.landmark,
      area: address.area,
      pincode: address.pincode,
      location: fromPoint(address.location),
      isDefault: address.isDefault,
    })),
  };
}

export async function getOwnProfile(user) {
  if (user.role === 'farmer') {
    const profile = await FarmerProfile.findOne({ userId: user._id });
    return profile ? toOwnFarmerProfile(profile) : null;
  }
  if (user.role === 'buyer') {
    const profile = await BuyerProfile.findOne({ userId: user._id });
    return profile ? toOwnBuyerProfile(profile) : null;
  }
  return null;
}

// Only fields the farmer may set are written. verificationLevel and agentId are never taken from
// the request: the validator strips them and this update does not mention them.
export async function saveFarmerProfile(user, data) {
  const { location, ...fields } = data;
  // Sharing no location (or withdrawing it) removes the stored point rather than keeping an old one.
  const update = location
    ? { $set: { ...fields, location: toPoint(location) } }
    : { $set: fields, $unset: { location: 1 } };
  const profile = await FarmerProfile.findOneAndUpdate({ userId: user._id }, update, {
    upsert: true,
    returnDocument: 'after',
    runValidators: true,
    setDefaultsOnInsert: true,
  });
  return toOwnFarmerProfile(profile);
}

// Onboarding sets the name and the default delivery address; other saved addresses are kept.
export async function saveBuyerProfile(user, { name, address }) {
  const nextAddress = { ...address, location: toPoint(address.location), isDefault: true };
  const existing = await BuyerProfile.findOne({ userId: user._id });

  if (!existing) {
    const created = await BuyerProfile.create({
      userId: user._id,
      name,
      addresses: [nextAddress],
    });
    return toOwnBuyerProfile(created);
  }

  existing.name = name;
  const defaultIndex = existing.addresses.findIndex((a) => a.isDefault);
  if (defaultIndex === -1) {
    existing.addresses.push(nextAddress);
  } else {
    existing.addresses[defaultIndex].set(nextAddress);
  }
  await existing.save();
  return toOwnBuyerProfile(existing);
}
