import { Check, CirclePause, CirclePlay, Copy, PackageX, PencilLine, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/authContext.js';
import { errorMessageKey } from '../../lib/apiErrors.js';
import { localName } from '../../lib/format.js';
import { FormAlert } from '../form/FormAlert.jsx';
import {
  BigButton,
  BottomSheet,
  ConfirmSheet,
  PresetChips,
  QuantityStepper,
  useToast,
} from '../ui/index.js';

// Which actions make sense for each status (the server enforces the same rules).
const ACTIONS_BY_STATUS = {
  available: ['edit', 'pause', 'outOfStock', 'sellAgain', 'delete'],
  out_of_stock: ['edit', 'pause', 'sellAgain', 'delete'],
  paused: ['edit', 'resume', 'sellAgain', 'delete'],
};
const ICONS = {
  edit: PencilLine,
  pause: CirclePause,
  resume: CirclePlay,
  outOfStock: PackageX,
  sellAgain: Copy,
  delete: Trash2,
};

// "Manage" on a listing: one sheet with large, clearly worded actions; editing, selling again
// and deleting open their own short sheet. onChanged() refreshes the list afterwards.
export function ManageListing({ product, open, onClose, onChanged }) {
  const { t, i18n } = useTranslation(['farmer', 'common']);
  const { client } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState('menu');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const expired = product.status === 'paused' && product.pausedReason === 'expired';
  const [form, setForm] = useState({
    priceRupees: product.pricePerUnit / 100,
    quantity: product.quantity,
    harvest: expired ? 'today' : 'keep',
    sellAgainQuantity: product.quantity || product.crop?.quantityStep || 1,
  });
  const unit = t(`common:units.${product.unit}`);
  const step = product.crop?.quantityStep ?? 1;
  const cropName = localName(product.crop?.names, i18n.language);

  function close() {
    setMode('menu');
    setError('');
    onClose();
  }

  async function run(doneKey, request) {
    setBusy(true);
    setError('');
    try {
      await request();
      toast.show(t(`products.done.${doneKey}`));
      setBusy(false);
      close();
      onChanged();
    } catch (err) {
      setBusy(false);
      setError(
        t(`products.errors.${err.code}`, { defaultValue: '' }) ||
          t(`sell.errors.${err.code}`, { defaultValue: '' }) ||
          t(`common:${errorMessageKey(err)}`),
      );
    }
  }

  const base = `/products/${product.id}`;
  const handlers = {
    edit: () => setMode('edit'),
    sellAgain: () => setMode('sellAgain'),
    delete: () => setMode('delete'),
    pause: () => run('pause', () => client.post(`${base}/status`, { action: 'pause' })),
    resume: () => run('resume', () => client.post(`${base}/status`, { action: 'resume' })),
    outOfStock: () =>
      run('outOfStock', () => client.post(`${base}/status`, { action: 'mark_out_of_stock' })),
  };

  function saveEdit() {
    const body = {};
    const price = Math.round(form.priceRupees * 100);
    if (price !== product.pricePerUnit) body.pricePerUnit = price;
    if (form.quantity !== product.quantity) body.quantity = form.quantity;
    if (form.harvest === 'today') body.harvestDate = new Date().toISOString();
    if (Object.keys(body).length === 0) return close();
    return run('edit', () => client.patch(base, body));
  }

  if (mode === 'delete') {
    return (
      <ConfirmSheet
        open={open}
        tone="danger"
        confirmIcon={Trash2}
        title={t('products.deleteTitle')}
        message={t('products.deleteMessage')}
        confirmLabel={t('products.deleteConfirm')}
        loading={busy}
        onCancel={close}
        onConfirm={() => run('delete', () => client.delete(base))}
      />
    );
  }

  if (mode === 'edit') {
    return (
      <BottomSheet open={open} onClose={close} title={t('products.editTitle')}>
        <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pb-2">
          <QuantityStepper
            label={t('sell.price', { unit })}
            value={form.priceRupees}
            onChange={(priceRupees) => setForm((f) => ({ ...f, priceRupees }))}
            step={1}
            min={1}
            max={10_000}
            unitLabel="₹"
          />
          <QuantityStepper
            label={t('sell.quantity')}
            value={form.quantity}
            onChange={(quantity) => setForm((f) => ({ ...f, quantity }))}
            step={step}
            min={step}
            max={100_000}
            unitLabel={unit}
          />
          <PresetChips
            label={t('sell.harvest')}
            options={['keep', 'today']}
            value={form.harvest}
            onChange={(harvest) => setForm((f) => ({ ...f, harvest }))}
            formatOption={(o) => t(o === 'keep' ? 'products.harvestKeep' : 'products.harvestToday')}
          />
          <FormAlert message={error} />
          <BigButton icon={Check} loading={busy} onClick={saveEdit}>
            {t('products.save')}
          </BigButton>
        </div>
      </BottomSheet>
    );
  }

  if (mode === 'sellAgain') {
    return (
      <BottomSheet
        open={open}
        onClose={close}
        title={t('products.sellAgainTitle', { crop: cropName })}
      >
        <div className="flex flex-col gap-5">
          <p className="text-lg text-ink-muted">{t('products.sellAgainHint')}</p>
          <QuantityStepper
            label={t('sell.quantity')}
            value={form.sellAgainQuantity}
            onChange={(sellAgainQuantity) => setForm((f) => ({ ...f, sellAgainQuantity }))}
            step={step}
            min={step}
            max={100_000}
            unitLabel={unit}
          />
          <FormAlert message={error} />
          <BigButton
            icon={Copy}
            loading={busy}
            onClick={() =>
              run('sellAgain', () =>
                client.post(`${base}/duplicate`, { quantity: form.sellAgainQuantity }),
              )
            }
          >
            {t('products.actions.sellAgain')}
          </BigButton>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open={open} onClose={close} title={t('products.manageTitle', { crop: cropName })}>
      <div className="flex flex-col gap-3">
        {ACTIONS_BY_STATUS[product.status].map((action) => (
          <BigButton
            key={action}
            icon={ICONS[action]}
            variant={action === 'delete' ? 'danger' : 'secondary'}
            disabled={busy || (action === 'resume' && expired)}
            onClick={handlers[action]}
          >
            {t(`products.actions.${action}`)}
          </BigButton>
        ))}
        <FormAlert message={error} />
      </div>
    </BottomSheet>
  );
}
