const HOUR_MS = 60 * 60 * 1000;

// Hourly removal of photos that were uploaded but never attached to a listing. Started only by
// server.js (never by tests); unref() lets the process exit during graceful shutdown.
export function startMediaCleanupJob({ mediaService, logger, intervalMs = HOUR_MS }) {
  async function run() {
    try {
      const removed = await mediaService.cleanupPendingPhotos();
      if (removed > 0) logger.info({ removed }, 'Removed unattached photos');
    } catch (err) {
      logger.error({ err }, 'Photo cleanup failed');
    }
  }
  const timer = setInterval(run, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
