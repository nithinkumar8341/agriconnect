import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { BigButton } from '../../components/ui/BigButton.jsx';

// "Not you? Log out" at the bottom of onboarding, for someone who used the wrong number
// or picked up a phone that was still logged in.
export function LogoutLink() {
  const { t } = useTranslation('onboarding');
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);

  return (
    <BigButton
      icon={LogOut}
      variant="ghost"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        await logout().catch(() => {});
      }}
    >
      {t('role.notYou')}
    </BigButton>
  );
}
