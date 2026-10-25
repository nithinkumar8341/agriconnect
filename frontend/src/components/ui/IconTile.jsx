import { Link } from 'react-router';

const TILE =
  'relative flex min-h-36 flex-col items-center justify-center gap-3 rounded-2xl border-2 bg-white p-4 text-center text-lg font-semibold leading-snug shadow-sm transition-colors';

// A large square shortcut for home screens. `hint` explains a disabled tile (for example "Coming soon")
// so it never looks broken; `badge` shows a count such as new orders.
export function IconTile({ icon: Icon, label, to, onClick, badge, badgeLabel, disabled, hint }) {
  const hasBadge = badge > 0;
  // Stacked spans would be read as one run-on word ("Orders3new"), so the spoken name is built
  // explicitly. It starts with the visible label, which voice-control users say to activate it.
  const accessibleName = [label, hasBadge && `${badge} ${badgeLabel ?? ''}`.trim(), hint]
    .filter(Boolean)
    .join(', ');

  const body = (
    <>
      <span className="grid size-16 place-items-center rounded-full bg-leaf-50 text-leaf-700">
        <Icon aria-hidden="true" className="size-9" />
      </span>
      <span>{label}</span>
      {hint && <span className="text-sm font-normal text-ink-muted">{hint}</span>}
      {hasBadge && (
        <span
          aria-hidden="true"
          className="absolute top-2 right-2 grid min-w-8 place-items-center rounded-full bg-danger-700 px-2 text-base font-bold text-white"
        >
          {badge}
        </span>
      )}
    </>
  );

  if (disabled) {
    return (
      <div
        role="group"
        aria-disabled="true"
        aria-label={accessibleName}
        className={`${TILE} border-soil-200 text-ink-muted opacity-80`}
      >
        {body}
      </div>
    );
  }

  const interactive = `${TILE} border-soil-200 text-ink hover:border-leaf-600 active:bg-leaf-50`;
  if (to) {
    return (
      <Link to={to} aria-label={accessibleName} className={interactive}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={accessibleName} className={interactive}>
      {body}
    </button>
  );
}
