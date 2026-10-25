import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormAlert } from '../../components/form/FormAlert.jsx';
import { TextField } from '../../components/form/TextField.jsx';
import { BigButton } from '../../components/ui/BigButton.jsx';

const isValidPin = (pin) => /^\d{4,6}$/.test(pin);

// Second step for agents and admins: enter the PIN, or create one on first login.
export function PinStep({ mode, onSubmit, submitting, error }) {
  const { t } = useTranslation('auth');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const isSetup = mode === 'pin_setup';
  const digitsOnly = (value) => value.replace(/\D/g, '').slice(0, 6);

  async function submit(event) {
    event.preventDefault();
    const errors = {};
    if (!isValidPin(pin)) errors.pin = t('pin.invalidFormat');
    else if (isSetup && confirm !== pin) errors.confirm = t('pin.mismatch');
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const ok = await onSubmit(pin);
    if (!ok) {
      setPin('');
      setConfirm('');
    }
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6">
      <p className="text-lg">{t(isSetup ? 'pin.setupIntro' : 'pin.intro')}</p>
      <TextField
        label={t('pin.label')}
        error={fieldErrors.pin}
        type="password"
        inputMode="numeric"
        autoComplete={isSetup ? 'new-password' : 'current-password'}
        maxLength={6}
        value={pin}
        onChange={(event) => setPin(digitsOnly(event.target.value))}
        className="[&_input]:text-2xl [&_input]:tracking-[0.4em]"
      />
      {isSetup && (
        <TextField
          label={t('pin.confirmLabel')}
          error={fieldErrors.confirm}
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={6}
          value={confirm}
          onChange={(event) => setConfirm(digitsOnly(event.target.value))}
          className="[&_input]:text-2xl [&_input]:tracking-[0.4em]"
        />
      )}
      <FormAlert message={error} />
      <BigButton type="submit" icon={KeyRound} loading={submitting}>
        {t(isSetup ? 'pin.setupSubmit' : 'pin.submit')}
      </BigButton>
    </form>
  );
}
