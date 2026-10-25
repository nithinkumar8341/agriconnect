import {
  ClipboardList,
  House,
  Package,
  Settings,
  ShoppingBasket,
  ShoppingCart,
  UserRound,
  Users,
  Wheat,
} from 'lucide-react';

// Bottom-menu items per role. `labelKey` is an i18n key; at most 4-5 items so labels stay readable.
// Screens other than home are placeholders until their prompt builds them.
export const ROLE_SECTIONS = [
  {
    role: 'farmer',
    nav: [
      { to: '/farmer', icon: House, labelKey: 'nav.home', end: true },
      { to: '/farmer/products', icon: Wheat, labelKey: 'nav.products' },
      { to: '/farmer/orders', icon: ClipboardList, labelKey: 'nav.orders' },
      { to: '/farmer/profile', icon: UserRound, labelKey: 'nav.profile' },
    ],
  },
  {
    role: 'buyer',
    nav: [
      { to: '/buyer', icon: ShoppingBasket, labelKey: 'nav.home', end: true },
      { to: '/buyer/cart', icon: ShoppingCart, labelKey: 'nav.cart' },
      { to: '/buyer/orders', icon: ClipboardList, labelKey: 'nav.orders' },
      { to: '/buyer/profile', icon: UserRound, labelKey: 'nav.profile' },
    ],
  },
  {
    role: 'agent',
    nav: [
      { to: '/agent', icon: House, labelKey: 'nav.home', end: true },
      { to: '/agent/farmers', icon: Users, labelKey: 'nav.farmers' },
      { to: '/agent/profile', icon: UserRound, labelKey: 'nav.profile' },
    ],
  },
  {
    role: 'admin',
    nav: [
      { to: '/admin', icon: House, labelKey: 'nav.home', end: true },
      { to: '/admin/users', icon: Users, labelKey: 'nav.users' },
      { to: '/admin/orders', icon: Package, labelKey: 'nav.orders' },
      { to: '/admin/settings', icon: Settings, labelKey: 'nav.settings' },
    ],
  },
];
