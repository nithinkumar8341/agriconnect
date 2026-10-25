import { Check, LogOut, MonitorSmartphone, PencilLine, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { DeliverySettingsFields } from '../../components/farmer/DeliverySettingsFields.jsx';
import { FarmerDetailsFields } from '../../components/farmer/FarmerDetailsFields.jsx';
import { FormAlert } from '../../components/form/FormAlert.jsx';
import { LocationCapture } from '../../components/form/LocationCapture.jsx';
import { LanguagePicker } from '../../components/LanguagePicker.jsx';
import { Screen } from '../../components/Screen.jsx';
import { BigButton, ConfirmSheet, useToast } from '../../components/ui/index.js';
import { useDistricts } from '../../hooks/useCatalog.js';
import {
  farmerFormFromProfile,
  farmerFormToPayload,
  saveErrorMessage,
  stateLabel,
  validateFarmerDelivery,
  validateFarmerDetails,
} from '../../lib/farmerProfileForm.js';
import { formatRupees, formatTime, localName } from '../../lib/format.js';
import { formatPhone } from '../../lib/phone.js';

function Section({ title, action, children }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col">
      <dt className="text-base text-ink-muted">{label}</dt>
      <dd className="text-lg font-semibold">{children}</dd>
    </div>
  );
}

function ProfileSummary({ profile, onEdit }) {
  const { t, i18n } = useTranslation(['farmer', 'onboarding', 'common']);
  const language = i18n.language;
  const districts = useDistricts();
  const district =
    districts.data?.states
      .flatMap((entry) => entry.districts)
      .find((entry) => entry.en === profile.district) ?? null;
  const editButton = (
    <button
      type="button"
      onClick={onEdit}
      className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-leaf-700 px-3 font-semibold text-leaf-800 hover:bg-leaf-50"
    >
      <PencilLine aria-hidden="true" className="size-5" />
      {t('profile.edit')}
    </button>
  );

  return (
    <>
      <Section title={t('profile.farm')} action={editButton}>
        <dl className="flex flex-col gap-3">
          <Row label={t('onboarding:farmer.name')}>{profile.name}</Row>
          <Row label={t('onboarding:farmer.village')}>
            {profile.village}, {profile.mandal}
          </Row>
          <Row label={t('onboarding:farmer.district')}>
            {district ? localName(district, language) : profile.district},{' '}
            {stateLabel(t, profile.state)}
          </Row>
          <Row label={t('onboarding:farmer.pincode')}>{profile.pincode}</Row>
        </dl>
      </Section>

      <Section title={t('profile.location')}>
        <p className="text-lg">
          {profile.location ? t('profile.locationShared') : t('profile.noLocation')}
        </p>
      </Section>

      <Section title={t('profile.delivery')}>
        <dl className="flex flex-col gap-3">
          <Row label={t('profile.days')}>
            {profile.deliveryDays.map((day) => t(`common:weekdays.${day}`)).join(', ')}
          </Row>
          <Row label={t('onboarding:farmer.cutoff')}>
            {t('profile.cutoff', { time: formatTime(profile.cutoffTime, language) })}
          </Row>
          {profile.location && (
            <Row label={t('onboarding:farmer.radius')}>
              {t('profile.radius', { km: profile.deliveryRadiusKm })}
            </Row>
          )}
          <Row label={t('onboarding:farmer.minOrder')}>
            {formatRupees(profile.minOrderValue, language)}
          </Row>
          <Row label={t('onboarding:farmer.fee')}>
            {formatRupees(profile.deliveryFee, language)}
          </Row>
          {profile.servicePincodes.length > 0 && (
            <Row label={t('onboarding:farmer.servicePincodes')}>
              {profile.servicePincodes.join(', ')}
            </Row>
          )}
        </dl>
      </Section>
    </>
  );
}

function ProfileEditor({ profile, onDone }) {
  const { t } = useTranslation(['onboarding', 'farmer', 'common']);
  const { client, setProfile } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(() => farmerFormFromProfile(profile));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  async function save(event) {
    event.preventDefault();
    const found = { ...validateFarmerDetails(form, t), ...validateFarmerDelivery(form, t) };
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setSaveError(t('common:errors.VALIDATION_ERROR'));
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const { profile: saved } = await client.put('/profile/farmer', farmerFormToPayload(form));
      setProfile(saved);
      toast.show(t('farmer:profile.saved'));
      onDone();
    } catch (err) {
      setSaveError(saveErrorMessage(t, err));
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={save} className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold">{t('farmer:profile.editTitle')}</h2>
      <FarmerDetailsFields form={form} setForm={setForm} errors={errors} />
      <h3 className="text-xl font-bold">{t('farmer:profile.location')}</h3>
      <LocationCapture
        why={t('location.farmerWhy')}
        value={form.location}
        onChange={(location) => setForm((current) => ({ ...current, location }))}
      />
      <h3 className="text-xl font-bold">{t('farmer:profile.delivery')}</h3>
      <DeliverySettingsFields form={form} setForm={setForm} errors={errors} />
      <FormAlert message={saveError} />
      <BigButton type="submit" icon={Check} loading={saving}>
        {t('farmer:profile.save')}
      </BigButton>
      <BigButton icon={X} variant="secondary" onClick={onDone} disabled={saving}>
        {t('common:actions.cancel')}
      </BigButton>
    </form>
  );
}

// The farmer's own details, delivery settings, language and account actions.
export function FarmerProfilePage() {
  const { t } = useTranslation(['farmer', 'common']);
  const { user, profile, logout, logoutAll } = useAuth();
  const [editing, setEditing] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(action) {
    setBusy(true);
    await action().catch(() => {});
  }

  return (
    <Screen title={t('profile.title')} showBack={false}>
      {profile &&
        (editing ? (
          <ProfileEditor profile={profile} onDone={() => setEditing(false)} />
        ) : (
          <ProfileSummary profile={profile} onEdit={() => setEditing(true)} />
        ))}

      {!editing && (
        <>
          <Section title={t('profile.language')}>
            <LanguagePicker />
          </Section>

          <Section title={t('profile.account')}>
            <dl>
              <Row label={t('profile.phone')}>{formatPhone(user.phone.slice(3))}</Row>
            </dl>
            <BigButton icon={LogOut} variant="secondary" loading={busy} onClick={() => run(logout)}>
              {t('common:actions.logout')}
            </BigButton>
            <BigButton
              icon={MonitorSmartphone}
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirmAll(true)}
            >
              {t('profile.logoutAll')}
            </BigButton>
          </Section>
        </>
      )}

      <ConfirmSheet
        open={confirmAll}
        tone="danger"
        confirmIcon={MonitorSmartphone}
        title={t('profile.logoutAllTitle')}
        message={t('profile.logoutAllMessage')}
        confirmLabel={t('profile.logoutAllConfirm')}
        loading={busy}
        onCancel={() => setConfirmAll(false)}
        onConfirm={() => run(logoutAll)}
      />
    </Screen>
  );
}
