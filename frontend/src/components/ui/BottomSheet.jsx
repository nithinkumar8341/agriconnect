import { useEffect, useId, useRef } from 'react';

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Accessible modal sheet that slides up from the bottom (easy to reach with a thumb).
// Focus moves into the sheet, Tab stays inside it, Escape or the backdrop closes it,
// and focus returns to whatever opened it.
export function BottomSheet({ open, onClose, title, children }) {
  const titleId = useId();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const opener = document.activeElement;
    const panel = panelRef.current;
    (panel.querySelector('[data-autofocus]') ?? panel.querySelector(FOCUSABLE))?.focus();

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...panel.querySelectorAll(FOCUSABLE)];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div aria-hidden="true" className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-screen-sm rounded-t-3xl bg-white px-4 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
      >
        <h2 id={titleId} className="mb-3 text-xl font-bold">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
