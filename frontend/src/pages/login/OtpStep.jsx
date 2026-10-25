import { LifeBuoy, PencilLine, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormAlert } from '../../components/form/FormAlert.jsx';
import { TextField } from '../../components/form/TextField.jsx';
import { BigButton } from '../../components/ui/BigButton.jsx';
import { formatPhone } from '../../lib/phone.js';
import { ResendTimer } from './ResendTimer.jsx';

const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE;

export function OtpStep({
  phone,
  onVerify,
  verifying,
  error,
  onChangeNumber,
  onResend,
  resending,
  resendKey,
  cooldownSeconds,
}) {
  const { t } = useTranslation('auth');
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState('');

  async function verify(value) {
    if (!/^\d{6}$/.test(value)) {
      setFieldError(t('otp.invalidFormat'));
      return;
    }
    setFieldError('');
    const ok = await onVerify(value);
    // A wrong code is cleared so the next attempt starts fresh.
    if (!ok) setCode('');
  }

  function handleChange(event) {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    // SMS autofill and fast typists finish the code in one go; submit without an extra tap.
    if (digits.length === 6 && !verifying) verify(digits);
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        verify(code);
      }}
      className="flex flex-col gap-6"
    >
      <p className="text-lg">{t('otp.sentTo', { phone: formatPhone(phone) })}</p>
      <TextField
        label={t('otp.label')}
        error={fieldError}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={handleChange}
        className="[&_input]:text-center [&_input]:text-3xl [&_input]:tracking-[0.5em]"
      />
      <FormAlert message={error} />
      <BigButton type="submit" icon={ShieldCheck} loading={verifying}>
        {t('otp.submit')}
      </BigButton>
      <ResendTimer
        key={resendKey}
        seconds={cooldownSeconds}
        onResend={onResend}
        sending={resending}
      />
      <BigButton icon={PencilLine} variant="ghost" onClick={onChangeNumber}>
        {t('otp.changeNumber')}
      </BigButton>
      {SUPPORT_PHONE && (
        <a
          href={`tel:${SUPPORT_PHONE}`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl text-lg font-semibold text-leaf-800 underline"
        >
          <LifeBuoy aria-hidden="true" className="size-6" />
          {t('otp.help')}
        </a>
      )}
    </form>
  );
}
