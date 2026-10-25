export const ROLE_HOME = {
  farmer: '/farmer',
  buyer: '/buyer',
  agent: '/agent',
  admin: '/admin',
};

export const LOGIN_PATH = '/login';
export const CHOOSE_ROLE_PATH = '/onboarding/role';

export function homePathFor(user) {
  if (!user) return LOGIN_PATH;
  return ROLE_HOME[user.role] ?? CHOOSE_ROLE_PATH;
}
