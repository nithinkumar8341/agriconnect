import { Notification } from '../models/Notification.js';
import { AppError } from '../utils/AppError.js';

// In-app notifications store a template key and parameters; the app renders them in the reader's
// language. Pass a session to write one in the same transaction as the change it reports.
export async function notify({ userId, templateKey, params = {}, link }, { session } = {}) {
  const [notification] = await Notification.create([{ userId, templateKey, params, link }], {
    session,
  });
  return notification;
}

const toView = (n) => ({
  id: n._id.toString(),
  templateKey: n.templateKey,
  params: n.params,
  link: n.link ?? null,
  read: Boolean(n.readAt),
  createdAt: n.createdAt,
});

export async function listNotifications(user, { page, limit }) {
  const filter = { userId: user._id };
  const [items, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, readAt: null }),
  ]);
  return { items: items.map(toView), page, limit, total, unread };
}

export async function markRead(user, id) {
  const result = await Notification.updateOne(
    { _id: id, userId: user._id },
    { $set: { readAt: new Date() } },
  );
  if (result.matchedCount === 0) throw new AppError(404, 'NOT_FOUND', 'Not found');
}

export async function markAllRead(user) {
  await Notification.updateMany(
    { userId: user._id, readAt: null },
    { $set: { readAt: new Date() } },
  );
}
