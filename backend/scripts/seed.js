// Usage: node scripts/seed.js <crops|admin|demo|clear|indexes> [--force]
// Run through npm: npm run seed (= seed:demo) | seed:clear | seed:crops | seed:admin | db:indexes
import { connectDb, disconnectDb } from '../src/config/db.js';
import { loadConfig } from '../src/config/env.js';
import { createLogger } from '../src/config/logger.js';
import { syncAllIndexes } from '../src/models/index.js';
import { seedAdmin } from '../src/seeds/seedAdmin.js';
import { seedCrops } from '../src/seeds/seedCrops.js';
import { removeExistingDemoData, seedDemo } from '../src/seeds/seedDemo.js';

const TASKS = {
  indexes: async () => ({ indexes: 'synced' }),
  crops: () => seedCrops(),
  admin: () =>
    seedAdmin({ phone: process.env.SEED_ADMIN_PHONE, force: process.argv.includes('--force') }),
  demo: (config) =>
    seedDemo({
      isProduction: config.isProduction,
      allowProduction: process.env.ALLOW_DEMO_SEED === 'true',
    }),
  // Removes every isDemo record (and reviews of demo accounts); real data is never touched.
  clear: (config) => {
    if (config.isProduction && process.env.ALLOW_DEMO_SEED !== 'true') {
      throw new Error('Refusing to clear demo data in production. Set ALLOW_DEMO_SEED=true.');
    }
    return removeExistingDemoData();
  },
};

const taskName = process.argv[2];
if (!TASKS[taskName]) {
  console.error(`Usage: node scripts/seed.js <${Object.keys(TASKS).join('|')}> [--force]`);
  process.exit(1);
}

const config = loadConfig();
const logger = createLogger(config);

try {
  await connectDb(config.mongodbUri, logger);
  // Every task first makes sure the indexes match the models (unique keys, TTL, 2dsphere).
  await syncAllIndexes();
  const summary = await TASKS[taskName](config);
  console.log(`seed:${taskName} done`, summary);
  await disconnectDb();
} catch (err) {
  console.error(`seed:${taskName} failed: ${err.message}`);
  await disconnectDb();
  process.exit(1);
}
