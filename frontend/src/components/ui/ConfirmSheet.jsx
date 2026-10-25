import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BigButton } from './BigButton.jsx';
import { BottomSheet } from './BottomSheet.jsx';

// "Are you sure?" for actions that are hard to undo. Keyboard and screen-reader focus starts on
// Cancel, the safe choice, so pressing Enter straight away never confirms by accident.
export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmIcon = Check,
  tone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();

  return (
    <BottomSheet open={open} onClose={onCancel} title={title}>
      {message && <p className="mb-6 text-lg text-ink-muted">{message}</p>}
      <div className="flex flex-col gap-3">
        <BigButton
          icon={confirmIcon}
          variant={tone === 'danger' ? 'danger' : 'primary'}
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel ?? t('actions.confirm')}
        </BigButton>
        <BigButton
          icon={X}
          variant="secondary"
          onClick={onCancel}
          disabled={loading}
          data-autofocus
        >
          {cancelLabel ?? t('actions.cancel')}
        </BigButton>
      </div>
    </BottomSheet>
  );
}
