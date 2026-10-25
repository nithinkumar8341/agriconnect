import { Construction } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Screen } from '../components/Screen.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';

// Placeholder for screens that later prompts build, so navigation can be tested end to end now.
export function ComingSoonPage({ titleKey }) {
  const { t } = useTranslation();
  return (
    <Screen title={t(titleKey)}>
      <EmptyState
        icon={Construction}
        title={t('comingSoon.title')}
        message={t('comingSoon.message')}
      />
    </Screen>
  );
}
