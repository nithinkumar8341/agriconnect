import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ToastContext } from './toastContext.js';

const AUTO_DISMISS_MS = 5000;

const TONES = {
  success: { icon: CircleCheck, classes: 'bg-leaf-800 text-white' },
  error: { icon: CircleAlert, classes: 'bg-danger-700 text-white' },
};

// Short confirmations ("Listing saved"). The live region is always in the DOM so screen readers
// announce each new message; errors use role="alert" to interrupt, successes wait politely.
export function ToastProvider({ children }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message, { tone = 'success' } = {}) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current, { id, message, tone }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map(({ id, message, tone }) => {
          const { icon: Icon, classes } = TONES[tone];
          return (
            <div
              key={id}
              role={tone === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex w-full max-w-screen-sm items-center gap-3 rounded-2xl px-4 py-3 text-lg shadow-lg ${classes}`}
            >
              <Icon aria-hidden="true" className="size-6 shrink-0" />
              <span className="flex-1">{message}</span>
              <button
                type="button"
                onClick={() => dismiss(id)}
                aria-label={t('actions.dismiss')}
                className="grid size-12 shrink-0 place-items-center rounded-xl hover:bg-white/15"
              >
                <X aria-hidden="true" className="size-6" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
