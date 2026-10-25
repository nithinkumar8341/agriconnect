import { useEffect, useState } from 'react';

// Placeholder screen for the bootstrap phase; text moves to i18n files in Prompt 4.
export default function App() {
  const [apiMessage, setApiMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/hello', { signal: controller.signal })
      .then((res) => res.json())
      .then((body) => setApiMessage(body.message))
      .catch(() => setApiMessage(''));
    return () => controller.abort();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-green-50 p-4 text-center">
      <h1 className="text-3xl font-bold text-green-900">AgriConnect</h1>
      <p className="text-lg text-green-800">Hello from the frontend</p>
      {apiMessage && <p className="text-base text-green-700">Backend says: {apiMessage}</p>}
    </main>
  );
}
