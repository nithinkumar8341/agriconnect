import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageLoading } from '../components/FullPageLoading.jsx';
import { useAuth } from './authContext.js';
import {
  CHOOSE_ROLE_PATH,
  homePathFor,
  LOGIN_PATH,
  needsProfile,
  onboardingPathFor,
} from './roles.js';

// Client-side guards for a better experience only: they decide which screens to show.
// Real protection is on the server, which checks role and ownership on every request.
export function RequireRole({ roles }) {
  const { status, user, profile } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoading />;
  if (status !== 'authenticated') {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location.pathname }} />;
  }
  if (!user.role) return <Navigate to={CHOOSE_ROLE_PATH} replace />;
  if (!roles.includes(user.role)) return <Navigate to={homePathFor(user, profile)} replace />;
  if (needsProfile(user, profile)) return <Navigate to={onboardingPathFor(user.role)} replace />;
  return <Outlet />;
}

// Onboarding screens: only for a signed-in person who still has that step to do.
// step is 'role', 'farmer' or 'buyer'.
export function RequireOnboardingStep({ step }) {
  const { status, user, profile } = useAuth();

  if (status === 'loading') return <FullPageLoading />;
  if (status !== 'authenticated') return <Navigate to={LOGIN_PATH} replace />;

  const stepIsDue =
    step === 'role' ? !user.role : user.role === step && needsProfile(user, profile);
  if (!stepIsDue) return <Navigate to={homePathFor(user, profile)} replace />;
  return <Outlet />;
}
