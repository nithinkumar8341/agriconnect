import { Navigate, Outlet, useLocation } from 'react-router';
import { FullPageLoading } from '../components/FullPageLoading.jsx';
import { useAuth } from './authContext.js';
import { CHOOSE_ROLE_PATH, homePathFor, LOGIN_PATH } from './roles.js';

// Client-side guard for a better experience only: it decides which screens to show.
// Real protection is on the server, which checks role and ownership on every request.
export function RequireRole({ roles }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoading />;
  if (status !== 'authenticated') {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location.pathname }} />;
  }
  if (!user.role) return <Navigate to={CHOOSE_ROLE_PATH} replace />;
  if (!roles.includes(user.role)) return <Navigate to={homePathFor(user)} replace />;
  return <Outlet />;
}
