import { RequireRole } from '../auth/RequireRole.jsx';
import { CHOOSE_ROLE_PATH, LOGIN_PATH } from '../auth/roles.js';
import { ROLE_SECTIONS } from '../layouts/navigation.js';
import { PublicLayout } from '../layouts/PublicLayout.jsx';
import { RoleLayout } from '../layouts/RoleLayout.jsx';
import { RootLayout } from '../layouts/RootLayout.jsx';
import { ComingSoonPage } from '../pages/ComingSoonPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { RoleHomePage } from '../pages/RoleHomePage.jsx';
import { WelcomePage } from '../pages/WelcomePage.jsx';

// The component gallery ships only in development unless explicitly enabled for a preview build.
const devUiEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_UI === 'true';

const devUiRoute = {
  path: 'dev/ui/*',
  lazy: async () => ({ Component: (await import('../pages/DevUiPage.jsx')).DevUiPage }),
};

// One protected area per role: /farmer, /buyer, /agent, /admin. Each nav entry other than home
// is a placeholder screen until its prompt builds it.
const roleRoutes = ROLE_SECTIONS.map(({ role, nav }) => ({
  path: role,
  element: <RequireRole roles={[role]} />,
  children: [
    {
      element: <RoleLayout navItems={nav} />,
      children: [
        { index: true, element: <RoleHomePage /> },
        ...nav
          .filter((item) => !item.end)
          .map((item) => ({
            path: item.to.slice(role.length + 2),
            element: <ComingSoonPage titleKey={item.labelKey} />,
          })),
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
}));

export const routes = [
  {
    element: <RootLayout />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { index: true, element: <WelcomePage /> },
          // Login and role choice screens arrive in Prompt 5.
          { path: LOGIN_PATH.slice(1), element: <ComingSoonPage titleKey="actions.login" /> },
          {
            path: CHOOSE_ROLE_PATH.slice(1),
            element: <ComingSoonPage titleKey="comingSoon.title" />,
          },
          ...(devUiEnabled ? [devUiRoute] : []),
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      ...roleRoutes,
    ],
  },
];
