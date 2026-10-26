import { Camera, Check, Send } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { errorMessageKey } from '../../lib/apiErrors.js';
import { compressImage } from '../../lib/imageCompression.js';
import { FormAlert } from '../form/FormAlert.jsx';
import { TextField } from '../form/TextField.jsx';
import { BigButton, BottomSheet, PresetChips, useToast } from '../ui/index.js';

const REASONS = ['damaged', 'rotten', 'wrong_item', 'underweight'];

// Report a problem with a delivered order: tap a reason, take one photo, send.
export function ReturnSheet({ orderId, onClose, onDone }) {
  const { t } = useTranslation(['buyer', 'common']);
  const { client } = useAuth();
  const toast = useToast();
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function addPhoto(file) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('photo', await compressImage(file), 'problem.jpg');
      setPhoto((await client.upload('/uploads/photos', form)).asset);
    } catch (err) {
      setError(t(`common:${errorMessageKey(err)}`));
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    setError('');
    try {
      await client.post(`/orders/${orderId}/return`, {
        reason,
        note: note.trim() || undefined,
        photoAssetId: photo.id,
      });
      toast.show(t('returns.sent'));
      onDone();
    } catch (err) {
      setError(t(`common:${errorMessageKey(err)}`));
      setBusy(false);
    }
  }

  return (
    <BottomSheet open onClose={onClose} title={t('returns.title')}>
      <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pb-2">
        <PresetChips
          label={t('returns.reason')}
          options={REASONS}
          value={reason}
          onChange={setReason}
          formatOption={(key) => t(`returns.reasons.${key}`)}
        />
        <label className="flex min-h-14 cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-leaf-700 bg-white px-6 py-3 text-lg font-semibold text-leaf-800">
          {photo ? (
            <Check aria-hidden="true" className="size-6" />
          ) : (
            <Camera aria-hidden="true" className="size-6" />
          )}
          {photo ? t('returns.photoAdded') : t('returns.photo')}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => addPhoto(event.target.files?.[0])}
          />
        </label>
        <TextField
          label={t('returns.note')}
          value={note}
          maxLength={500}
          onChange={(event) => setNote(event.target.value)}
        />
        <FormAlert message={error} />
        <BigButton icon={Send} loading={busy} disabled={!reason || !photo} onClick={send}>
          {t('returns.send')}
        </BigButton>
      </div>
    </BottomSheet>
  );
}
