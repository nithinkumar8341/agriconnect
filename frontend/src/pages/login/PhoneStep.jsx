import { MessageSquareText } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormAlert } from '../../components/form/FormAlert.jsx';
import { TextField } from '../../components/form/TextField.jsx';
import { BigButton } from '../../components/ui/BigButton.jsx';
import { isValidMobile, toNationalNumber } from '../../lib/phone.js';

export function PhoneStep({
  phone,
  onPhoneChange,
  remember,
  onRememberChange,
  onSubmit,
  sending,
  error,
}) {
  const { t } = useTranslation('auth');
  const [fieldError, setFieldError] = useState('');

  function submit(event) {
    event.preventDefault();
    if (!isValidMobile(phone)) {
      setFieldError(t('phone.invalid'));
      return;
    }
    setFieldError('');
    onSubmit();
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6">
      <TextField
        label={t('phone.label')}
        hint={t('phone.hint')}
        error={fieldError}
        prefix={t('phone.countryCode')}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={phone}
        onChange={(event) => onPhoneChange(toNationalNumber(event.target.value))}
        className="[&_input]:text-2xl [&_input]:tracking-wider"
      />

      <label className="flex min-h-14 cursor-pointer items-start gap-3 rounded-2xl bg-white p-4">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => onRememberChange(event.target.checked)}
          className="mt-1 size-6 shrink-0 accent-leaf-700"
        />
        <span className="flex flex-col">
          <span className="text-lg font-semibold">{t('phone.remember')}</span>
          <span className="text-ink-muted">{t('phone.rememberHint')}</span>
        </span>
      </label>

      <FormAlert message={error} />
      <BigButton type="submit" icon={MessageSquareText} loading={sending}>
        {t('phone.submit')}
      </BigButton>
    </form>
  );
}
