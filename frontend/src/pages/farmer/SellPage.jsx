import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PhotoStep } from '../../components/farmer/PhotoStep.jsx';
import { Screen } from '../../components/Screen.jsx';

// The selling flow. Prompt 7 builds step 1 (photos); crop, quantity, price, harvest date and
// publishing are added by Prompt 8, which will attach the uploaded photos to the new listing.
export function SellPage() {
  const { t } = useTranslation('farmer');
  return (
    <Screen title={t('sell.title')}>
      <PhotoStep />
      <p className="flex items-start gap-2 rounded-2xl bg-white px-4 py-3 text-lg text-ink-muted">
        <Info aria-hidden="true" className="mt-1 size-6 shrink-0 text-leaf-700" />
        {t('sell.nextSoon')}
      </p>
    </Screen>
  );
}
