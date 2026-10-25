import { RequireOnboardingStep, RequireRole } from '../auth/RequireRole.jsx';
import { CHOOSE_ROLE_PATH, LOGIN_PATH, onboardingPathFor } from '../auth/roles.js';
import { ROLE_SECTIONS } from '../layouts/navigation.js';
import { PublicLayout } from '../layouts/PublicLayout.jsx';
import { RoleLayout } from '../layouts/RoleLayout.jsx';
import { RootLayout } from '../layouts/RootLayout.jsx';
import { BuyerHomePage } from '../pages/buyer/BuyerHomePage.jsx';
import { FarmerPublicPage } from '../pages/buyer/FarmerPublicPage.jsx';
import { ProductDetailPage } from '../pages/buyer/ProductDetailPage.jsx';
import { ComingSoonPage } from '../pages/ComingSoonPage.jsx';
import { FarmerHomePage } from '../pages/farmer/FarmerHomePage.jsx';
import { FarmerProfilePage } from '../pages/farmer/FarmerProfilePage.jsx';
import { MyProductsPage } from '../pages/farmer/MyProductsPage.jsx';
import { SellPage } from '../pages/farmer/SellPage.jsx';
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

// Screens built so far, by role and path ('' = home). Any other menu entry shows a placeholder.
const BUILT_SCREENS = {
  buyer: {
    '': <BuyerHomePage />,
    'products/:id': <ProductDetailPage />,
    'farmers/:id': <FarmerPublicPage />,
  },
  farmer: {
    '': <FarmerHomePage />,
    products: <MyProductsPage />,
    profile: <FarmerProfilePage />,
    sell: <SellPage />,
  },
};

// Destinations reached from home tiles (not the bottom menu) whose screens come in later prompts.
const TILE_PLACEHOLDERS = {
  farmer: [
    { path: 'prices', titleKey: 'farmer:tiles.prices' }, // Prompt 18
  ],
};

// One protected area per role: /farmer, /buyer, /agent, /admin.
const roleRoutes = ROLE_SECTIONS.map(({ role, nav }) => {
  const built = BUILT_SCREENS[role] ?? {};
  const navPaths = nav.filter((item) => !item.end).map((item) => item.to.slice(role.length + 2));
  return {
    path: role,
    element: <RequireRole roles={[role]} />,
    children: [
      {
        element: <RoleLayout navItems={nav} />,
        children: [
          { index: true, element: built[''] ?? <RoleHomePage /> },
          ...nav
            .filter((item) => !item.end)
            .map((item) => {
              const path = item.to.slice(role.length + 2);
              return {
                path,
                element: built[path] ?? <ComingSoonPage titleKey={item.labelKey} />,
              };
            }),
          // Built screens reached from home tiles rather than the bottom menu (for example Sell).
          ...Object.entries(built)
            .filter(([path]) => path && !navPaths.includes(path))
            .map(([path, element]) => ({ path, element })),
          ...(TILE_PLACEHOLDERS[role] ?? []).map(({ path, titleKey }) => ({
            path,
            element: <ComingSoonPage titleKey={titleKey} />,
          })),
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  };
});

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
