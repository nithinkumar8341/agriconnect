import { Check, LocateFixed } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGeolocation } from '../../hooks/useGeolocation.js';
import { isPincode } from '../../lib/buyerLocation.js';
import { TextField } from '../form/TextField.jsx';
import { BigButton, BottomSheet } from '../ui/index.js';

// Choose where to shop from: the phone's location (asked only on tap) or a typed pincode.
export function LocationSheet({ open, current, onClose, onChange }) {
  const { t } = useTranslation('buyer');
  const geo = useGeolocation();
  const [pincode, setPincode] = useState(current?.pincode ?? '');
  const [error, setError] = useState('');

  async function useMyLocation() {
    const found = await geo.locate();
    if (found) onChange({ lat: found.latitude, lng: found.longitude });
  }

  function usePincode() {
    if (!isPincode(pincode)) {
      setError(t('location.pincodeError'));
      return;
    }
    onChange({ pincode });
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={t('location.title')}>
      <div className="flex flex-col gap-4">
        <p className="text-lg text-ink-muted">{t('location.why')}</p>
        {geo.status !== 'unsupported' && (
          <BigButton
            icon={LocateFixed}
            variant="secondary"
            loading={geo.status === 'locating'}
            onClick={useMyLocation}
          >
            {t('location.useLocation')}
          </BigButton>
        )}
        {(geo.status === 'denied' || geo.status === 'unavailable') && (
          <p role="status" className="rounded-2xl bg-sun-100 px-4 py-3 text-lg">
            {t('location.denied')}
          </p>
        )}
        <TextField
          label={t('location.pincodeLabel')}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          value={pincode}
          onChange={(event) => {
            setError('');
            setPincode(event.target.value.replace(/\D/g, ''));
          }}
          error={error}
        />
        <BigButton icon={Check} onClick={usePincode}>
          {t('location.save')}
        </BigButton>
      </div>
    </BottomSheet>
  );
}
