import { BuyerProfile } from '../models/BuyerProfile.js';
import { FraudFlag } from '../models/FraudFlag.js';
import { getAppConfig } from './appConfig.service.js';

// "12, Temple Road " and "12 temple road" are the same place for this rule.
const normalise = (text) =>
  (text ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

// Rule "duplicate_address": many buyer accounts using one delivery address is a common sign of
// fake accounts used to abuse cash on delivery. It flags the orders for an admin to review; it
// never blocks a real household (a family may share an address).
export async function checkDuplicateAddress(orders, { logger } = {}) {
  try {
    const [order] = orders;
    if (!order) return [];
    const { pincode, landmark, houseAndStreet } = order.delivery.address;
    const place = normalise(`${houseAndStreet} ${landmark}`);
    const limit = await getAppConfig('maxAccountsPerAddress');
    const profiles = await BuyerProfile.find({ 'addresses.pincode': pincode })
      .select('userId addresses')
      .lean();
    const accounts = profiles.filter((p) =>
      p.addresses.some(
        (a) => a.pincode === pincode && normalise(`${a.houseAndStreet} ${a.landmark}`) === place,
      ),
    ).length;
    if (accounts <= limit) return [];

    return FraudFlag.insertMany(
      orders.map((o) => ({
        subjectType: 'order',
        subjectId: o._id,
        ruleId: 'duplicate_address',
        severity: 'medium',
        action: 'admin_review',
        evidence: { accounts, limit, pincode, landmark },
      })),
    );
  } catch (err) {
    // A failed check must not fail an order that is already placed.
    logger?.warn({ err }, 'duplicate address check failed');
    return [];
  }
}
