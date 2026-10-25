// Client-side copies of the server's checks, so mistakes are shown while typing.
// The server repeats every check (backend/src/data/districts.js) and is the authority.
const PINCODE_PREFIXES = { 'Andhra Pradesh': ['51', '52', '53'], Telangana: ['50'] };

export const isValidPincode = (pincode) => /^[1-9]\d{5}$/.test(pincode);

export const isPincodeInState = (state, pincode) =>
  (PINCODE_PREFIXES[state] ?? []).some((prefix) => pincode.startsWith(prefix));

export const STATES = ['Andhra Pradesh', 'Telangana'];
