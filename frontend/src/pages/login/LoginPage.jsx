import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../../auth/authContext.js';
import { homePathFor, ROLE_HOME } from '../../auth/roles.js';
import { FullPageLoading } from '../../components/FullPageLoading.jsx';
import { LanguagePicker } from '../../components/LanguagePicker.jsx';
import { Screen } from '../../components/Screen.jsx';
import { BigButton } from '../../components/ui/BigButton.jsx';
import { useToast } from '../../components/ui/toastContext.js';
import { hasChosenLanguage } from '../../i18n/index.js';
import { authErrorMessage } from '../../lib/authErrors.js';
import { OtpStep } from './OtpStep.jsx';
import { PhoneStep } from './PhoneStep.jsx';
import { PinStep } from './PinStep.jsx';

const DEFAULT_COOLDOWN_SECONDS = 30;

// After login, return to the screen that sent the person here, if it belongs to their role.
function destinationAfterLogin(from, user, profile) {
  const home = homePathFor(user, profile);
  const ownArea = ROLE_HOME[user.role];
  return from && ownArea && home === ownArea && from.startsWith(ownArea) ? from : home;
}

// Language (first visit only) -> phone -> OTP -> PIN (agents and admins only).
export function LoginPage() {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(() => (hasChosenLanguage() ? 'phone' : 'language'));
  const [askedLanguage] = useState(step === 'language');
  const [phone, setPhone] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [codeRound, setCodeRound] = useState({ key: 0, cooldown: DEFAULT_COOLDOWN_SECONDS });
  const [pinChallenge, setPinChallenge] = useState(null);

  if (auth.status === 'loading') return <FullPageLoading />;
  if (auth.status === 'authenticated') {
    return (
      <Navigate to={destinationAfterLogin(location.state?.from, auth.user, auth.profile)} replace />
    );
  }

  function goTo(nextStep) {
    setError('');
    setStep(nextStep);
  }

  async function run(kind, action) {
    setBusy(kind);
    setError('');
    try {
      return await action();
    } finally {
      setBusy(null);
    }
  }

  // Used for the first code and for "Send a new code".
  async function sendCode({ isResend = false } = {}) {
    await run(isResend ? 'resend' : 'send', async () => {
      try {
        const data = await auth.requestOtp({ phone, language: i18n.language });
        setCodeRound((round) => ({ key: round.key + 1, cooldown: data.resendAfterSeconds }));
        if (isResend) toast.show(t('otp.resent'));
        goTo('otp');
      } catch (err) {
        if (err.code === 'OTP_COOLDOWN') {
          // A code was sent moments ago (for example after pressing Back): use that one.
          const wait = err.details?.retryAfterSeconds ?? DEFAULT_COOLDOWN_SECONDS;
          setCodeRound((round) => ({ key: round.key + 1, cooldown: wait }));
          goTo('otp');
          return;
        }
        setError(authErrorMessage(t, err));
      }
    });
  }

  async function verifyCode(otp) {
    return run('verify', async () => {
      try {
        const data = await auth.verifyOtp({
          phone,
          otp,
          language: i18n.language,
          rememberDevice: remember,
        });
        if (data.pinToken) {
          setPinChallenge({ mode: data.next, pinToken: data.pinToken });
          goTo('pin');
        }
        return true;
      } catch (err) {
        setError(authErrorMessage(t, err));
        return false;
      }
    });
  }

  async function submitPin(pin) {
    return run('pin', async () => {
      try {
        const submitPinAction = pinChallenge.mode === 'pin_setup' ? auth.setupPin : auth.verifyPin;
        await submitPinAction({ pinToken: pinChallenge.pinToken, pin });
        return true;
      } catch (err) {
        if (err.code === 'PIN_TOKEN_INVALID' || err.code === 'PIN_ALREADY_SET') {
          setPinChallenge(null);
          setStep('phone');
        }
        setError(authErrorMessage(t, err));
        return false;
      }
    });
  }

  function back() {
    if (step === 'otp' || step === 'pin') goTo('phone');
    else if (step === 'phone' && askedLanguage) goTo('language');
    else navigate('/');
  }

  const titles = {
    language: t('language.title'),
    phone: t('phone.title'),
    otp: t('otp.title'),
    pin: t(pinChallenge?.mode === 'pin_setup' ? 'pin.setupTitle' : 'pin.title'),
  };

  return (
    <Screen title={titles[step]} onBack={back}>
      {step === 'language' && (
        <>
          <LanguagePicker />
          <BigButton icon={ArrowRight} onClick={() => goTo('phone')}>
            {t('language.continue')}
          </BigButton>
        </>
      )}
      {step === 'phone' && (
        <PhoneStep
          phone={phone}
          onPhoneChange={setPhone}
          remember={remember}
          onRememberChange={setRemember}
          onSubmit={() => sendCode()}
          sending={busy === 'send'}
          error={error}
        />
      )}
      {step === 'otp' && (
        <OtpStep
          phone={phone}
          onVerify={verifyCode}
          verifying={busy === 'verify'}
          error={error}
          onChangeNumber={() => goTo('phone')}
          onResend={() => sendCode({ isResend: true })}
          resending={busy === 'resend'}
          resendKey={codeRound.key}
          cooldownSeconds={codeRound.cooldown}
        />
      )}
      {step === 'pin' && pinChallenge && (
        <PinStep
          mode={pinChallenge.mode}
          onSubmit={submitPin}
          submitting={busy === 'pin'}
          error={error}
        />
      )}
    </Screen>
  );
}
