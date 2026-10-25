import { RequireOnboardingStep, RequireRole } from '../auth/RequireRole.jsx';
import { CHOOSE_ROLE_PATH, LOGIN_PATH, onboardingPathFor } from '../auth/roles.js';
import { ROLE_SECTIONS } from '../layouts/navigation.js';
import { PublicLayout } from '../layouts/PublicLayout.jsx';
import { RoleLayout } from '../layouts/RoleLayout.jsx';
import { RootLayout } from '../layouts/RootLayout.jsx';
import { ComingSoonPage } from '../pages/ComingSoonPage.jsx';
import { LoginPage } from '../pages/login/LoginPage.jsx';
import { NotFoundPage } from '../pages/NotFoundPage.jsx';
import { BuyerOnboardingPage } from '../pages/onboarding/BuyerOnboardingPage.jsx';
import { ChooseRolePage } from '../pages/onboarding/ChooseRolePage.jsx';
import { FarmerOnboardingPage } from '../pages/onboarding/FarmerOnboardingPage.jsx';
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
          { path: LOGIN_PATH.slice(1), element: <LoginPage /> },
          {
            element: <RequireOnboardingStep step="role" />,
            children: [{ path: CHOOSE_ROLE_PATH.slice(1), element: <ChooseRolePage /> }],
          },
          {
            element: <RequireOnboardingStep step="farmer" />,
            children: [
              { path: onboardingPathFor('farmer').slice(1), element: <FarmerOnboardingPage /> },
            ],
          },
          {
            element: <RequireOnboardingStep step="buyer" />,
            children: [
              { path: onboardingPathFor('buyer').slice(1), element: <BuyerOnboardingPage /> },
            ],
          },
          ...(devUiEnabled ? [devUiRoute] : []),
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      ...roleRoutes,
    ],
  },
];
