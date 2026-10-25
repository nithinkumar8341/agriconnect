import express from 'express';

// Building the app separately from server.js lets tests import it without opening a port.
export function createApp() {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/v1/hello', (req, res) => {
    res.json({ service: 'backend', message: 'Hello from AgriConnect' });
  });

  return app;
}
