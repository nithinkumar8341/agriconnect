import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAuth } from '../auth/authContext.js';
import { useApiRequest } from '../hooks/useApiRequest.js';
import { usePolling } from '../hooks/usePolling.js';

// Header button to the updates inbox, with the unread count. Checks again every minute.
export function NotificationBell({ to }) {
  const { t } = useTranslation('common');
  const { client } = useAuth();
  const inbox = useApiRequest(
    (signal) => client.get('/notifications?limit=1', { signal }),
    'notification-count',
  );
  usePolling(inbox.reload, 60_000);
  const unread = inbox.data?.unread ?? 0;

  return (
    <Link
      to={to}
      aria-label={unread ? t('notifications.open', { count: unread }) : t('notifications.openNone')}
      className="relative grid size-12 place-items-center rounded-xl border-2 border-soil-200 bg-white hover:border-leaf-600"
    >
      <Bell aria-hidden="true" className="size-6" />
      {unread > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 grid min-w-6 place-items-center rounded-full bg-danger-700 px-1 text-sm font-bold text-white"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
