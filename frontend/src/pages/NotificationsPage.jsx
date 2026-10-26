import { Bell, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/authContext.js';
import { Screen } from '../components/Screen.jsx';
import { BigButton, EmptyState, ErrorState, SkeletonList } from '../components/ui/index.js';
import { useApiRequest } from '../hooks/useApiRequest.js';

// The updates inbox for farmers and buyers. Each entry is a template key plus parameters,
// rendered here in the reader's current language.
export function NotificationsPage() {
  const { t, i18n } = useTranslation('common');
  const { client } = useAuth();
  const navigate = useNavigate();
  const inbox = useApiRequest(
    (signal) => client.get('/notifications?limit=50', { signal }),
    'notifications',
  );
  const when = (at) =>
    new Intl.DateTimeFormat(`${i18n.language}-IN`, {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    }).format(new Date(at));

  async function open(item) {
    if (!item.read) await client.post(`/notifications/${item.id}/read`, {}).catch(() => {});
    if (item.link) navigate(item.link);
    else inbox.reload();
  }

  async function markAll() {
    await client.post('/notifications/read-all', {}).catch(() => {});
    inbox.reload();
  }

  return (
    <Screen title={t('notifications.title')}>
      {inbox.loading && <SkeletonList rows={4} />}
      {inbox.error && <ErrorState error={inbox.error} onRetry={inbox.reload} />}
      {inbox.data?.items.length === 0 && (
        <EmptyState icon={Bell} title={t('notifications.empty')} />
      )}
      {inbox.data?.items.length > 0 && (
        <>
          {inbox.data.unread > 0 && (
            <BigButton icon={CheckCheck} variant="secondary" onClick={markAll}>
              {t('notifications.markAll')}
            </BigButton>
          )}
          <ul className="flex flex-col gap-2">
            {inbox.data.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => open(item)}
                  className={`flex w-full flex-col gap-1 rounded-2xl border-2 p-4 text-left ${
                    item.read ? 'border-soil-200 bg-white' : 'border-leaf-600 bg-leaf-50'
                  }`}
                >
                  <span className={`text-lg ${item.read ? '' : 'font-bold'}`}>
                    {t(`notifications.${item.templateKey}`, {
                      ...item.params,
                      reason: item.params.reason ?? '',
                    })}
                  </span>
                  <span className="text-base text-ink-muted">{when(item.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Screen>
  );
}
