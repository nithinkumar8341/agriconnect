import { AuditLog } from '../models/AuditLog.js';

export const SYSTEM_ACTOR = Object.freeze({ id: null, role: 'system' });

// actor: { id, role } for a logged-in user (pass req.user via actorFromUser), or SYSTEM_ACTOR.
// Pass a Mongoose session to write the entry in the same transaction as the change it describes.
export async function recordAudit(
  { actor, action, entityType, entityId, before = null, after = null, reason, requestId },
  { session } = {},
) {
  const [entry] = await AuditLog.create(
    [
      {
        actorId: actor.id,
        actorRole: actor.role,
        action,
        entityType,
        entityId,
        before,
        after,
        reason,
        requestId,
      },
    ],
    { session },
  );
  return entry;
}

export function actorFromUser(user) {
  return { id: user._id, role: user.role };
}
