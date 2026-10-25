import { randomUUID } from 'node:crypto';
import { BuyerProfile } from '../models/BuyerProfile.js';
import { Crop } from '../models/Crop.js';
import { FarmerProfile } from '../models/FarmerProfile.js';
import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Session } from '../models/Session.js';
import { User } from '../models/User.js';
import { getAppConfig } from '../services/appConfig.service.js';
import { computeOrderPricing } from '../services/pricing.service.js';
import { DEMO_AGENT, DEMO_BUYERS, DEMO_FARMERS, DEMO_ORDERS } from './demo.data.js';
import { seedCrops } from './seedCrops.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// Stock stays reserved for these; cancelled, rejected and failed orders give it back.
const STOCK_HOLDING_STATUSES = new Set(['placed', 'accepted', 'out_for_delivery', 'delivered']);

const DEMO_PHONES = [DEMO_AGENT, ...DEMO_FARMERS, ...DEMO_BUYERS].map((entry) => entry.phone);

// Only ever touches records flagged isDemo, so real data in the same database is never affected.
async function removeExistingDemoData() {
  const demoUserIds = (await User.find({ isDemo: true }).select('_id')).map((u) => u._id);
  await Promise.all([
    Order.deleteMany({ isDemo: true }),
    Product.deleteMany({ isDemo: true }),
    FarmerProfile.deleteMany({ isDemo: true }),
    BuyerProfile.deleteMany({ isDemo: true }),
    Session.deleteMany({ userId: { $in: demoUserIds } }),
  ]);
  await User.deleteMany({ isDemo: true });
}

async function assertDemoPhonesAreFree() {
  const clash = await User.findOne({ phone: { $in: DEMO_PHONES }, isDemo: { $ne: true } });
  if (clash) {
    throw new Error(`A real (non-demo) account uses demo phone ${clash.phone}; refusing to seed.`);
  }
}

function startOfDay(offsetDays) {
  const date = new Date(Date.now() + offsetDays * DAY_MS);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function statusHistory(statusPath, { buyerId, farmerId, cancelReason }) {
  const startedAt = Date.now() - statusPath.length * 60 * 60 * 1000;
  return statusPath.map((status, index) => ({
    status,
    at: new Date(startedAt + index * 60 * 60 * 1000),
    byUserId: status === 'placed' || status === 'cancelled' ? buyerId : farmerId,
    ...(status === 'cancelled' && { reason: cancelReason }),
  }));
}

export async function seedDemo({ isProduction, allowProduction = false }) {
  if (isProduction && !allowProduction) {
    throw new Error(
      'Refusing to seed demo data in production. Set ALLOW_DEMO_SEED=true to override.',
    );
  }

  await seedCrops();
  await assertDemoPhonesAreFree();
  await removeExistingDemoData();

  const crops = new Map((await Crop.find()).map((crop) => [crop.slug, crop]));
  const platformFeePercent = await getAppConfig('platformFeePercent');

  const agent = await User.create({ ...DEMO_AGENT, role: 'agent', isDemo: true });

  const farmers = new Map();
  for (const farmer of DEMO_FARMERS) {
    const user = await User.create({
      phone: farmer.phone,
      language: farmer.language,
      role: 'farmer',
      isDemo: true,
    });
    const profile = await FarmerProfile.create({
      ...farmer.profile,
      userId: user._id,
      agentId: farmer.assistedByAgent ? agent._id : null,
      isDemo: true,
    });
    const products = new Map();
    for (const listing of farmer.products) {
      const crop = crops.get(listing.crop);
      const product = await Product.create({
        farmerId: user._id,
        cropId: crop._id,
        quantity: listing.quantity,
        availableQuantity: listing.quantity,
        unit: crop.defaultUnit,
        pricePerUnit: listing.pricePerUnit,
        harvestDate: startOfDay(-1),
        createdByAgentId: farmer.assistedByAgent ? agent._id : null,
        isDemo: true,
      });
      products.set(listing.crop, product);
    }
    farmers.set(farmer.key, { user, profile, products });
  }

  const buyers = new Map();
  for (const buyer of DEMO_BUYERS) {
    const user = await User.create({
      phone: buyer.phone,
      language: buyer.language,
      role: 'buyer',
      isDemo: true,
    });
    const profile = await BuyerProfile.create({ ...buyer.profile, userId: user._id, isDemo: true });
    buyers.set(buyer.key, { user, profile });
  }

  for (const demoOrder of DEMO_ORDERS) {
    const farmer = farmers.get(demoOrder.farmer);
    const buyer = buyers.get(demoOrder.buyer);
    const address = buyer.profile.addresses.find((a) => a.isDefault);
    const finalStatus = demoOrder.statusPath.at(-1);

    const { items, priceBreakdown } = computeOrderPricing({
      items: demoOrder.items.map(({ crop: slug, quantity }) => {
        const product = farmer.products.get(slug);
        const crop = crops.get(slug);
        return {
          productId: product._id,
          cropId: crop._id,
          cropName: crop.names,
          unit: product.unit,
          quantity,
          pricePerUnit: product.pricePerUnit,
        };
      }),
      deliveryFee: farmer.profile.deliveryFee,
      platformFeePercent,
    });

    await Order.create({
      checkoutGroupId: randomUUID(),
      buyerId: buyer.user._id,
      farmerId: farmer.user._id,
      items,
      delivery: {
        slotDate: startOfDay(demoOrder.slotInDays),
        address: {
          name: buyer.profile.name,
          houseAndStreet: address.houseAndStreet,
          landmark: address.landmark,
          area: address.area,
          pincode: address.pincode,
          location: address.location,
        },
        fee: farmer.profile.deliveryFee,
      },
      priceBreakdown,
      paymentMethod: demoOrder.paymentMethod,
      paymentStatus: finalStatus === 'delivered' ? 'paid' : 'pending',
      status: finalStatus,
      statusHistory: statusHistory(demoOrder.statusPath, {
        buyerId: buyer.user._id,
        farmerId: farmer.user._id,
        cancelReason: demoOrder.cancelReason,
      }),
      deliveredAt: finalStatus === 'delivered' ? new Date() : null,
      isDemo: true,
    });

    // Keep stock consistent with the orders, as checkout would have left it.
    if (STOCK_HOLDING_STATUSES.has(finalStatus)) {
      for (const item of items) {
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { availableQuantity: -item.quantity } },
        );
      }
    }
  }

  return {
    agents: 1,
    farmers: farmers.size,
    buyers: buyers.size,
    products: await Product.countDocuments({ isDemo: true }),
    orders: DEMO_ORDERS.length,
  };
}
