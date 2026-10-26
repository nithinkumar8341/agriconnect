import { Camera, CircleAlert, CircleCheck, CloudOff, Images, RotateCw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MAX_PHOTOS } from '../../hooks/usePhotoUploads.js';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';

const PICKER =
  'flex min-h-14 flex-1 cursor-pointer items-center justify-center gap-3 rounded-2xl px-4 py-3 text-lg font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-leaf-900';

// A hidden file input inside a label, so the whole big button opens the picker and keyboard users
// still reach a real input. capture="environment" opens the phone's back camera directly.
function PickerButton({ icon: Icon, label, capture, onFiles, disabled, primary }) {
  return (
    <label
      className={`${PICKER} ${primary ? 'bg-leaf-700 text-white' : 'border-2 border-leaf-700 bg-white text-leaf-800'} ${
        disabled ? 'pointer-events-none opacity-50' : ''
      }`}
    >
      <input
        type="file"
        accept="image/*"
        {...(capture && { capture: 'environment' })}
        multiple={!capture}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          onFiles(event.target.files);
          // Reset so choosing the same file again still fires a change.
          event.target.value = '';
        }}
      />
      <Icon aria-hidden="true" className="size-6 shrink-0" />
      {label}
    </label>
  );
}

function PhotoTile({ photo, onRemove, onRetry }) {
  const { t } = useTranslation('farmer');
  const percent = Math.round(photo.progress * 100);
  const statusText =
    photo.status === 'uploading'
      ? t('sell.status.uploading', { percent })
      : t(`sell.status.${photo.status}`);
  const errorText =
    photo.status === 'failed' && t(`sell.errors.${photo.errorCode}`, { defaultValue: '' });

  return (
    <li className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-soil-200 bg-white">
      <div className="relative aspect-square bg-soil-100">
        {photo.previewUrl && (
          <img src={photo.previewUrl} alt="" className="size-full object-cover" />
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('sell.remove')}
          className="absolute top-1 right-1 grid size-12 place-items-center rounded-full bg-ink/70 text-white"
        >
          <X aria-hidden="true" className="size-6" />
        </button>
      </div>
      <div className="flex flex-col gap-2 p-2">
        <p
          role="status"
          className={`flex items-center gap-1 text-base font-semibold ${
            photo.status === 'failed' ? 'text-danger-700' : 'text-ink'
          }`}
        >
          {photo.status === 'uploaded' && (
            <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-leaf-700" />
          )}
          {photo.status === 'waiting' && (
            <CloudOff aria-hidden="true" className="size-5 shrink-0" />
          )}
          {photo.status === 'failed' && (
            <CircleAlert aria-hidden="true" className="size-5 shrink-0" />
          )}
          {statusText}
        </p>
        {photo.status === 'uploading' && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={statusText}
            className="h-2 overflow-hidden rounded-full bg-soil-100"
          >
            <div className="h-full bg-leaf-600" style={{ width: `${percent}%` }} />
          </div>
        )}
        {errorText && <p className="text-sm text-danger-800">{errorText}</p>}
        {photo.status === 'failed' && !photo.unreadable && (
          <button
            type="button"
            onClick={onRetry}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-leaf-700 font-semibold text-leaf-800"
          >
            <RotateCw aria-hidden="true" className="size-5" />
            {t('sell.retry')}
          </button>
        )}
      </div>
    </li>
  );
}

// Photos for a listing: up to 5, compressed on the phone, uploaded with progress, and kept on
// the phone when there is no internet until they can be sent.
// `optional`: the listing works without one (the crop's stock photo is shown instead).
export function PhotoStep({ uploads, optional = false }) {
  const { t } = useTranslation('farmer');
  const online = useOnlineStatus();
  const hasWaiting = uploads.photos.some((photo) => photo.status === 'waiting');

  return (
    <section aria-labelledby="photos-heading" className="flex flex-col gap-4">
      <h2 id="photos-heading" className="text-2xl font-bold">
        {optional ? t('sell.ownPhotoHeading') : t('sell.photosHeading')}
      </h2>
      <p className="text-lg text-ink-muted">
        {optional ? t('sell.ownPhotoHint') : t('sell.photosHint', { max: MAX_PHOTOS })}
      </p>

      <div className="flex flex-col gap-3 min-[380px]:flex-row">
        <PickerButton
          icon={Camera}
          label={t('sell.takePhoto')}
          capture
          primary
          onFiles={uploads.add}
          disabled={!uploads.canAddMore}
        />
        <PickerButton
          icon={Images}
          label={t('sell.gallery')}
          onFiles={uploads.add}
          disabled={!uploads.canAddMore}
        />
      </div>

      {uploads.photos.length > 0 && (
        <>
          <p className="font-semibold text-ink-muted">
            {t('sell.count', { count: uploads.photos.length, max: MAX_PHOTOS })}
          </p>
          <ul className="grid grid-cols-2 gap-3">
            {uploads.photos.map((photo) => (
              <PhotoTile
                key={photo.id}
                photo={photo}
                onRemove={() => uploads.remove(photo.id)}
                onRetry={() => uploads.retry(photo.id)}
              />
            ))}
          </ul>
        </>
      )}

      {hasWaiting && !online && (
        <p className="flex items-start gap-2 rounded-2xl bg-sun-100 px-4 py-3 text-lg">
          <CloudOff aria-hidden="true" className="mt-1 size-6 shrink-0" />
          {t('sell.waitingNote')}
        </p>
      )}
    </section>
  );
}
