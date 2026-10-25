import { RotateCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BigButton } from '../../components/ui/BigButton.jsx';

// Counts down the server's resend cooldown, then offers "Send a new code".
// The parent remounts it (new key) each time a code is sent, which restarts the count.
export function ResendTimer({ seconds, onResend, sending }) {
  const { t } = useTranslation('auth');
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const id = setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  if (remaining > 0) {
    return (
      <p className="text-center text-lg text-ink-muted">
        {t('otp.resendIn', { seconds: remaining })}
      </p>
    );
  }
  return (
    <BigButton icon={RotateCw} variant="secondary" loading={sending} onClick={onResend}>
      {t('otp.resend')}
    </BigButton>
  );
}
