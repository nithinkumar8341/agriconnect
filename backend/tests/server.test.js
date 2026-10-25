import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const SERVER_PATH = fileURLToPath(new URL('../src/server.js', import.meta.url));
const PORT = 4599;

function startServer(env) {
  const child = spawn(process.execPath, [SERVER_PATH], {
    env: { PATH: process.env.PATH, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => (output += chunk));
  child.stderr.on('data', (chunk) => (output += chunk));
  return { child, getOutput: () => output };
}

async function waitForHealth(url, attempts = 50) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Server not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Server did not become healthy at ${url}`);
}

describe('server process', () => {
  it('exits with code 1 and names the bad variables when config is invalid', async () => {
    const { child, getOutput } = startServer({ MONGODB_URI: 'not-a-uri', PORT: 'abc' });

    const [exitCode] = await once(child, 'exit');

    expect(exitCode).toBe(1);
    expect(getOutput()).toContain('MONGODB_URI');
    expect(getOutput()).toContain('PORT');
  });

  // Windows cannot deliver SIGTERM to a process, so this runs on Linux/macOS (and in CI).
  const itOnPosix = process.platform === 'win32' ? it.skip : it;

  itOnPosix(
    'shuts down gracefully on SIGTERM',
    async () => {
      const { child, getOutput } = startServer({
        NODE_ENV: 'test',
        LOG_LEVEL: 'info',
        PORT: String(PORT),
        MONGODB_URI: process.env.MONGO_TEST_URI.replace('/?', '/server-test?'),
      });
      await waitForHealth(`http://localhost:${PORT}/api/v1/health`);

      child.kill('SIGTERM');
      const [exitCode] = await once(child, 'exit');

      expect(exitCode).toBe(0);
      expect(getOutput()).toContain('Shutdown complete');
    },
    20_000,
  );
});
