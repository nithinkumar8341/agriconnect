import { isPincodeInState, isValidPincode } from './locationRules.js';

// Shared by farmer onboarding and the farmer profile page, so both apply the same defaults,
// checks and API shape. The form holds rupees (what people think in); the API takes paise.

export const INITIAL_FARMER_FORM = {
  name: '',
  state: 'Andhra Pradesh',
  district: '',
  mandal: '',
  village: '',
  pincode: '',
  location: null,
  deliveryRadiusKm: 10,
  servicePincodes: [],
  deliveryDays: ['mon', 'wed', 'fri'],
  cutoffTime: '18:00',
  minOrderRupees: 100,
  deliveryFeeRupees: 20,
};

export function farmerFormFromProfile(profile) {
  return {
    name: profile.name,
    state: profile.state,
    district: profile.district,
    mandal: profile.mandal,
    village: profile.village,
    pincode: profile.pincode,
    location: profile.location,
    deliveryRadiusKm: profile.deliveryRadiusKm,
    servicePincodes: [...profile.servicePincodes],
    deliveryDays: [...profile.deliveryDays],
    cutoffTime: profile.cutoffTime,
    minOrderRupees: profile.minOrderValue / 100,
    deliveryFeeRupees: profile.deliveryFee / 100,
  };
}

export function farmerFormToPayload(form) {
  return {
    name: form.name.trim(),
    state: form.state,
    district: form.district,
    mandal: form.mandal.trim(),
    village: form.village.trim(),
    pincode: form.pincode,
    location: form.location && {
      latitude: form.location.latitude,
      longitude: form.location.longitude,
    },
    deliveryRadiusKm: form.deliveryRadiusKm,
    servicePincodes: form.servicePincodes,
    deliveryDays: form.deliveryDays,
    cutoffTime: form.cutoffTime,
    minOrderValue: Math.round(form.minOrderRupees * 100),
    deliveryFee: Math.round(form.deliveryFeeRupees * 100),
  };
}

export const stateLabel = (t, state) =>
  state === 'Telangana' ? t('common:states.telangana') : t('common:states.andhraPradesh');

// `t` must be bound to the onboarding namespace.
export function validateFarmerDetails(form, t) {
  const required = t('errors.required');
  const errors = {};
  if (!form.name.trim()) errors.name = required;
  if (!form.district) errors.district = t('errors.pickDistrict');
  if (!form.mandal.trim()) errors.mandal = required;
  if (!form.village.trim()) errors.village = required;
  if (!isValidPincode(form.pincode)) errors.pincode = t('errors.pincode');
  else if (!isPincodeInState(form.state, form.pincode)) {
    errors.pincode = t('errors.pincodeState', { state: stateLabel(t, form.state) });
  }
  return errors;
}

export function validateFarmerDelivery(form, t) {
  const errors = {};
  if (form.deliveryDays.length === 0) errors.deliveryDays = t('errors.pickDay');
  if (!form.location && form.servicePincodes.length === 0) {
    errors.servicePincodes = t('farmer.servicePincodesRequired');
  }
  return errors;
}

export function saveErrorMessage(t, error) {
  return error.code === 'VALIDATION_ERROR' || error.code === 'NETWORK_ERROR'
    ? `${t(`common:errors.${error.code}`)} ${t('errors.saveFailed')}`
    : t('errors.saveFailed');
}
