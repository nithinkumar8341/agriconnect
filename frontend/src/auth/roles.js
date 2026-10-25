export const ROLE_HOME = {
  farmer: '/farmer',
  buyer: '/buyer',
  agent: '/agent',
  admin: '/admin',
};

// Farmers and buyers fill in a profile before using the app; agents and admins are set up by an admin.
export const PROFILE_ROLES = ['farmer', 'buyer'];

export const LOGIN_PATH = '/login';
export const CHOOSE_ROLE_PATH = '/onboarding/role';
export const onboardingPathFor = (role) => `/onboarding/${role}`;

export function needsProfile(user, profile) {
  return PROFILE_ROLES.includes(user?.role) && profile === null;
}

// Where a signed-in person belongs right now: choose a role, finish their profile, or their home.
export function homePathFor(user, profile) {
  if (!user) return LOGIN_PATH;
  if (!user.role) return CHOOSE_ROLE_PATH;
  if (needsProfile(user, profile)) return onboardingPathFor(user.role);
  return ROLE_HOME[user.role];
}
