import { pauseExpiredListings } from '../services/product.service.js';

const HOUR_MS = 60 * 60 * 1000;

// Hourly: pause listings older than their crop's shelf life. Started only by server.js.
export function startListingExpiryJob({ logger, intervalMs = HOUR_MS }) {
  async function run() {
    try {
      const paused = await pauseExpiredListings();
      if (paused > 0) logger.info({ paused }, 'Paused listings past their shelf life');
    } catch (err) {
      logger.error({ err }, 'Listing expiry job failed');
    }
  }
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
