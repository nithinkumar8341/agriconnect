import mongoose from 'mongoose';
import { AppConfig } from '../src/models/AppConfig.js';
import { AuditLog } from '../src/models/AuditLog.js';
import {
  APP_CONFIG_DEFINITIONS,
  getAllAppConfig,
  getAppConfig,
  setAppConfig,
} from '../src/services/appConfig.service.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';

const admin = { id: new mongoose.Types.ObjectId(), role: 'admin' };

describe('AppConfig service', () => {
  beforeAll(() => connectTestDb('app-config-test'));
  afterAll(() => dropTestDbAndDisconnect());
  beforeEach(() => AppConfig.deleteMany({}));

  it('returns the documented defaults when nothing is stored', async () => {
    expect(await getAppConfig('codCapNewBuyer')).toBe(50000);
    expect(await getAppConfig('returnWindowHours')).toBe(4);
    expect(await getAppConfig('platformFeePercent')).toBe(0);
    expect(await getAppConfig('returnReasons')).toEqual([
      'damaged',
      'rotten',
      'wrong_item',
      'underweight',
    ]);
  });

  it('every definition has a default that passes its own schema', () => {
    for (const [key, definition] of Object.entries(APP_CONFIG_DEFINITIONS)) {
      expect({ key, ok: definition.schema.safeParse(definition.default).success }).toEqual({
        key,
        ok: true,
      });
    }
  });

  it('stores a validated override and audits the change', async () => {
    await setAppConfig('returnWindowHours', 6, { actor: admin, reason: 'pilot feedback' });

    expect(await getAppConfig('returnWindowHours')).toBe(6);
    const audit = await AuditLog.findOne({ action: 'app_config.updated' }).sort({ createdAt: -1 });
    expect(audit).toMatchObject({
      actorRole: 'admin',
      before: { returnWindowHours: 4 },
      after: { returnWindowHours: 6 },
      reason: 'pilot feedback',
    });
  });

  it('rejects invalid values and unknown keys', async () => {
    await expect(setAppConfig('platformFeePercent', 150, { actor: admin })).rejects.toMatchObject({
      code: 'INVALID_CONFIG_VALUE',
    });
    await expect(
      setAppConfig('returnReasons', ['changed_mind'], { actor: admin }),
    ).rejects.toMatchObject({
      code: 'INVALID_CONFIG_VALUE',
    });
    await expect(getAppConfig('noSuchKey')).rejects.toMatchObject({ code: 'UNKNOWN_CONFIG_KEY' });
    expect(await AppConfig.countDocuments()).toBe(0);
  });

  it('lists every setting with its default and whether it is overridden', async () => {
    await setAppConfig('maxActiveCodOrders', 3, { actor: admin });

    const all = await getAllAppConfig();

    expect(all).toHaveLength(Object.keys(APP_CONFIG_DEFINITIONS).length);
    expect(all.find((s) => s.key === 'maxActiveCodOrders')).toMatchObject({
      value: 3,
      default: 2,
      isOverridden: true,
    });
    expect(all.find((s) => s.key === 'codCapNewBuyer')).toMatchObject({ isOverridden: false });
  });
});
