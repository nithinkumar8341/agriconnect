import { useEffect, useState } from 'react';

// Placeholder screen until Prompt 4; text moves to i18n files there.
export default function App() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/health', { signal: controller.signal })
      .then((res) => res.json())
      .then(setHealth)
      .catch(() => setHealth(null));
    return () => controller.abort();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-green-50 p-4 text-center">
      <h1 className="text-3xl font-bold text-green-900">AgriConnect</h1>
      <p className="text-lg text-green-800">Hello from the frontend</p>
      {health && (
        <p className="text-base text-green-700">
          Backend: {health.status}, database: {health.db}
        </p>
      )}
    </main>
  );
}
