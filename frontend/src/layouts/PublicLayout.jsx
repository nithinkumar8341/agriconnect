import { Outlet } from 'react-router';

export function PublicLayout() {
  return (
    <main id="main" tabIndex={-1} className="pb-8 outline-none">
      <Outlet />
    </main>
  );
}
