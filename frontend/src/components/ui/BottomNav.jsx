import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

// Thumb-reachable main menu, always icon plus label. NavLink sets aria-current="page" on the
// active item, which screen readers announce and the styles below highlight.
export function BottomNav({ items }) {
  const { t } = useTranslation();

  return (
    <nav
      aria-label={t('nav.label')}
      className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-soil-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul
        className="mx-auto grid max-w-screen-sm"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ to, icon: Icon, label, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-sm font-semibold leading-tight ${
                  isActive ? 'bg-leaf-50 text-leaf-800' : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              <Icon aria-hidden="true" className="size-7" />
              <span className="text-center">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
