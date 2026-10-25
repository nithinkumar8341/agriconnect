import { User } from '../models/User.js';
import { recordAudit, SYSTEM_ACTOR } from '../services/audit.service.js';
import { normalizeIndianPhone } from '../utils/phone.js';

// Creates the first admin (or promotes an existing account with --force). The admin sets
// their PIN on first login through /auth/pin/setup, so no PIN is ever passed on a command line.
export async function seedAdmin({ phone, language = 'en', force = false }) {
  const normalized = normalizeIndianPhone(phone ?? '');
  if (!normalized) {
    throw new Error('SEED_ADMIN_PHONE must be a valid 10-digit Indian mobile number');
  }

  const existing = await User.findOne({ phone: normalized });
  if (existing?.role === 'admin') {
    return { status: 'unchanged', userId: existing._id.toString() };
  }
  if (existing?.role && !force) {
    throw new Error(
      `That number already belongs to a ${existing.role}. Re-run with --force to make it an admin.`,
    );
  }

  const admin = await User.findOneAndUpdate(
    { phone: normalized },
    { $set: { role: 'admin', status: 'active' }, $setOnInsert: { phone: normalized, language } },
    { upsert: true, returnDocument: 'after', runValidators: true },
  );
  await recordAudit({
    actor: SYSTEM_ACTOR,
    action: 'user.role_granted',
    entityType: 'User',
    entityId: admin._id,
    before: { role: existing?.role ?? null },
    after: { role: 'admin' },
    reason: 'seed:admin',
  });

  return { status: existing ? 'promoted' : 'created', userId: admin._id.toString() };
}
