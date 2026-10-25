import { z } from 'zod';
import { AppConfig } from '../models/AppConfig.js';
import { RETURN_REASONS } from '../models/ReturnRequest.js';
import { AppError } from '../utils/AppError.js';
import { recordAudit } from './audit.service.js';

const percent = z.number().min(0).max(100);
const positiveInt = z.number().int().positive();
const paise = z.number().int().min(0);

// Business thresholds that admins can tune without a deploy. Each key has a default and a schema;
// only overrides are stored in MongoDB. Amounts are paise.
export const APP_CONFIG_DEFINITIONS = Object.freeze({
  codCapNewBuyer: {
    default: 50000,
    schema: paise,
    description: 'Maximum COD order value (paise) for a buyer who is still "new".',
  },
  newBuyerDeliveredOrders: {
    default: 3,
    schema: positiveInt,
    description: 'Delivered orders after which a buyer is no longer "new".',
  },
  maxActiveCodOrders: {
    default: 2,
    schema: positiveInt,
    description: 'COD orders a buyer may have open (placed to out_for_delivery) at once.',
  },
  codBlockAfterFailedDeliveries: {
    default: 2,
    schema: positiveInt,
    description: 'Failed or refused COD deliveries after which COD is restricted.',
  },
  maxOrdersPerHourPerPhone: {
    default: 5,
    schema: positiveInt,
    description: 'Order velocity limit.',
  },
  maxOrdersPerHourPerDevice: {
    default: 5,
    schema: positiveInt,
    description: 'Order velocity limit.',
  },
  maxOrdersPerHourPerIp: { default: 10, schema: positiveInt, description: 'Order velocity limit.' },
  maxAccountsPerAddress: {
    default: 3,
    schema: positiveInt,
    description: 'Buyer accounts sharing one address before a fraud flag.',
  },
  returnWindowHours: {
    default: 4,
    schema: z.number().positive().max(72),
    description: 'Hours after delivery during which a return can be reported.',
  },
  returnReasons: {
    default: [...RETURN_REASONS],
    schema: z.array(z.enum(RETURN_REASONS)).min(1),
    description: 'Return reasons buyers may choose.',
  },
  platformFeePercent: {
    default: 0,
    schema: percent,
    description: 'Commission on produce value, deducted from farmer earnings.',
  },
  mandiCommissionPercentEstimate: {
    default: 10,
    schema: percent,
    description: 'Typical mandi commission, used only for the labelled earnings comparison.',
  },
  priceStaleAfterDays: {
    default: 7,
    schema: positiveInt,
    description: 'Mandi prices older than this show a "may be outdated" warning.',
  },
  lowStockPercent: {
    default: 20,
    schema: percent,
    description:
      'A listing counts as low on stock when what is left is at or below this % of what was listed.',
  },
  agentListingsNeedFarmerApproval: {
    default: true,
    schema: z.boolean(),
    description: 'Listings created by an agent wait for the farmer to confirm price and quantity.',
  },
});

function definitionFor(key) {
  const definition = APP_CONFIG_DEFINITIONS[key];
  if (!definition) {
    throw new AppError(400, 'UNKNOWN_CONFIG_KEY', `Unknown setting: ${key}`);
  }
  return definition;
}

export async function getAppConfig(key) {
  const definition = definitionFor(key);
  const override = await AppConfig.findOne({ key }).lean();
  return override ? override.value : definition.default;
}

export async function getAllAppConfig() {
  const overrides = await AppConfig.find().lean();
  const byKey = new Map(overrides.map((row) => [row.key, row]));
  return Object.entries(APP_CONFIG_DEFINITIONS).map(([key, definition]) => ({
    key,
    value: byKey.get(key)?.value ?? definition.default,
    default: definition.default,
    isOverridden: byKey.has(key),
    description: definition.description,
  }));
}

export async function setAppConfig(key, value, { actor, reason, requestId } = {}) {
  const definition = definitionFor(key);
  const parsed = definition.schema.safeParse(value);
  if (!parsed.success) {
    throw new AppError(400, 'INVALID_CONFIG_VALUE', `Invalid value for ${key}`, {
      issues: parsed.error.issues.map((issue) => issue.message),
    });
  }

  const before = await getAppConfig(key);
  const row = await AppConfig.findOneAndUpdate(
    { key },
    { value: parsed.data, updatedBy: actor.id },
    { upsert: true, returnDocument: 'after' },
  );
  await recordAudit({
    actor,
    action: 'app_config.updated',
    entityType: 'AppConfig',
    entityId: row._id,
    before: { [key]: before },
    after: { [key]: parsed.data },
    reason,
    requestId,
  });
  return parsed.data;
}
