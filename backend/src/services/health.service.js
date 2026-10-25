import mongoose from 'mongoose';

const CONNECTED = 1;
const PING_TIMEOUT_MS = 2_000;

async function pingDatabase() {
  if (mongoose.connection.readyState !== CONNECTED) {
    return false;
  }
  // A health check that hangs is as bad as one that fails, so the ping is bounded.
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve(false), PING_TIMEOUT_MS).unref();
  });
  const ping = mongoose.connection.db
    .admin()
    .ping()
    .then(() => true)
    .catch(() => false);
  return Promise.race([ping, timeout]);
}

export async function getHealth() {
  const dbUp = await pingDatabase();
  return {
    status: dbUp ? 'ok' : 'degraded',
    db: dbUp ? 'up' : 'down',
    uptimeSeconds: Math.round(process.uptime()),
  };
}
