import { getHealth } from '../services/health.service.js';

export async function healthCheck(req, res) {
  const health = await getHealth();
  // 503 tells the host's monitor to stop routing traffic here until the database is back.
  res.status(health.status === 'ok' ? 200 : 503).json(health);
}
