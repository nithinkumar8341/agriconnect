import { useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { routes } from './app/routes.jsx';
import { AuthProvider } from './auth/AuthProvider.jsx';
import { ToastProvider } from './components/ui/ToastProvider.jsx';

// Tests pass their own (memory) router and API client; the real app uses browser history.
export default function App({ router, client }) {
  const [activeRouter] = useState(() => router ?? createBrowserRouter(routes));

  return (
    <AuthProvider client={client}>
      <ToastProvider>
        <RouterProvider router={activeRouter} />
      </ToastProvider>
    </AuthProvider>
  );
}
