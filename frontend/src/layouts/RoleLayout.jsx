import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { ChatWidget } from '../components/ai/ChatWidget.jsx';
import { BottomNav } from '../components/ui/BottomNav.jsx';

// Logged-in area for one role: the screen, plus the bottom menu. Bottom padding keeps the last
// item on a screen from hiding behind the fixed menu.
export function RoleLayout({ navItems }) {
  const { t } = useTranslation();
  const items = navItems.map(({ labelKey, ...item }) => ({ ...item, label: t(labelKey) }));

  return (
    <>
      <main id="main" tabIndex={-1} className="pb-28 outline-none">
        <Outlet />
      </main>
      <ChatWidget />
      <BottomNav items={items} />
    </>
  );
}
