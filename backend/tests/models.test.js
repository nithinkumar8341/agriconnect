import { OtpRequest } from '../src/models/OtpRequest.js';
import { Session } from '../src/models/Session.js';
import { User } from '../src/models/User.js';
import { connectTestDb, dropTestDbAndDisconnect } from './helpers/db.js';

describe('auth models', () => {
  beforeAll(async () => {
    await connectTestDb('models-test');
    await Promise.all([User.syncIndexes(), OtpRequest.syncIndexes(), Session.syncIndexes()]);
  });

  afterAll(async () => {
    await dropTestDbAndDisconnect();
  });

  it('enforces one user per phone number', async () => {
    await User.create({ phone: '+919876543210' });

    await expect(User.create({ phone: '+919876543210' })).rejects.toThrow(/duplicate key/);
  });

  it('rejects phone numbers that are not normalised', async () => {
    await expect(User.create({ phone: '9876543210' })).rejects.toThrow(/phone/);
  });

  it('starts new users with no role, Telugu, active', async () => {
    const user = await User.create({ phone: '+919000000001' });

    expect(user).toMatchObject({ role: null, language: 'te', status: 'active' });
  });

  it('never selects the PIN hash by default or exposes it publicly', async () => {
    await User.create({ phone: '+919000000002', role: 'agent', pinHash: 'hash' });
    const user = await User.findOne({ phone: '+919000000002' });

    expect(user.pinHash).toBeUndefined();
    expect(user.toPublic()).not.toHaveProperty('pinHash');
    expect(user.toPublic()).toMatchObject({ phone: '+919000000002', role: 'agent' });
  });

  it('creates TTL indexes so expired OTPs and sessions are deleted automatically', async () => {
    const otpIndexes = await OtpRequest.collection.indexes();
    const sessionIndexes = await Session.collection.indexes();

    expect(otpIndexes).toContainEqual(
      expect.objectContaining({ key: { purgeAt: 1 }, expireAfterSeconds: 0 }),
    );
    expect(sessionIndexes).toContainEqual(
      expect.objectContaining({ key: { expiresAt: 1 }, expireAfterSeconds: 0 }),
    );
    expect(sessionIndexes).toContainEqual(
      expect.objectContaining({ key: { tokenHash: 1 }, unique: true }),
    );
  });
});
