import { LocateFixed, MapPinCheck, MapPinOff, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useGeolocation } from '../../hooks/useGeolocation.js';
import { BigButton } from '../ui/BigButton.jsx';

const FALLBACK_MESSAGES = {
  denied: 'location.denied',
  unavailable: 'location.unavailable',
  unsupported: 'location.unsupported',
};

// Explains why we want the location before asking, and treats "no" as a normal answer with a
// pincode fallback, never as an error that blocks the person.
export function LocationCapture({ why, value, onChange }) {
  const { t } = useTranslation('onboarding');
  const geo = useGeolocation();
  const fallbackKey = FALLBACK_MESSAGES[geo.status];

  async function shareLocation() {
    const position = await geo.locate();
    if (position) onChange(position);
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white p-4">
      <p className="text-lg">{why}</p>
      {value ? (
        <>
          <p className="flex items-start gap-2 text-lg font-semibold text-leaf-800">
            <MapPinCheck aria-hidden="true" className="mt-1 size-6 shrink-0" />
            {t('location.saved', { meters: value.accuracyMeters ?? '?' })}
          </p>
          <BigButton
            icon={Trash2}
            variant="secondary"
            onClick={() => {
              geo.reset();
              onChange(null);
            }}
          >
            {t('location.remove')}
          </BigButton>
        </>
      ) : (
        geo.status !== 'unsupported' && (
          <BigButton icon={LocateFixed} loading={geo.status === 'locating'} onClick={shareLocation}>
            {geo.status === 'locating' ? t('location.finding') : t('location.use')}
          </BigButton>
        )
      )}
      <div role="status">
        {!value && fallbackKey && (
          <p className="flex items-start gap-2 text-lg text-ink">
            <MapPinOff aria-hidden="true" className="mt-1 size-6 shrink-0 text-soil-700" />
            {t(fallbackKey)}
          </p>
        )}
      </div>
    </section>
  );
}
