import { z } from 'zod';
import { isDistrictInState, isPincodeInState } from '../data/districts.js';
import { LANGUAGES } from '../models/User.js';
import { isPointInIndia, PINCODE_PATTERN, WEEKDAYS } from '../models/shared.js';

const text = (max) => z.string().trim().min(1, 'is required').max(max);
const optionalText = (max) => z.string().trim().max(max).default('');
const pincode = z.string().trim().regex(PINCODE_PATTERN, 'must be a 6-digit pincode');
// Amounts arrive in paise, like everywhere else in the API.
const paise = (max) => z.number().int('must be whole paise').min(0).max(max);

// Clients send named fields; the server builds GeoJSON [lng, lat], so the order can't be swapped.
const location = z
  .object({ latitude: z.number(), longitude: z.number() })
  .refine(({ latitude, longitude }) => isPointInIndia([longitude, latitude]), {
    message: 'must be a location in India',
  });

export const farmerProfileSchema = z
  .object({
    name: text(80),
    state: z.enum(['Andhra Pradesh', 'Telangana']),
    district: text(80),
    mandal: text(80),
    village: text(80),
    pincode,
    location: location.nullable().default(null),
    deliveryRadiusKm: z.number().min(0).max(50),
    servicePincodes: z.array(pincode).max(30).default([]),
    deliveryDays: z
      .array(z.enum(WEEKDAYS))
      .min(1, 'pick at least one day')
      .refine((days) => new Set(days).size === days.length, 'days must not repeat'),
    cutoffTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'must be HH:mm'),
    minOrderValue: paise(1_000_000),
    deliveryFee: paise(50_000),
  })
  .superRefine((profile, ctx) => {
    if (!isDistrictInState(profile.state, profile.district)) {
      ctx.addIssue({
        code: 'custom',
        path: ['district'],
        message: 'is not a district of this state',
      });
    }
    if (!isPincodeInState(profile.state, profile.pincode)) {
      ctx.addIssue({ code: 'custom', path: ['pincode'], message: 'does not belong to this state' });
    }
    if (!profile.location && profile.deliveryRadiusKm > 0 && profile.servicePincodes.length === 0) {
      // Without a location the radius cannot be used, so pincodes are the only way to be found.
      ctx.addIssue({
        code: 'custom',
        path: ['servicePincodes'],
        message: 'add at least one pincode you deliver to, or share your location',
      });
    }
  });

export const buyerProfileSchema = z.object({
  name: text(80),
  address: z.object({
    label: optionalText(30),
    houseAndStreet: optionalText(120),
    landmark: text(120),
    area: optionalText(80),
    pincode,
    location: location.nullable().default(null),
  }),
});

export const updateMeSchema = z.object({ language: z.enum(LANGUAGES) });

export const districtsQuerySchema = z.object({
  state: z.enum(['Andhra Pradesh', 'Telangana']).optional(),
});
