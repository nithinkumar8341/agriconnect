import { Writable } from 'node:stream';
import { createLogger } from '../src/config/logger.js';

function captureLogs() {
  const lines = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  return { lines, stream };
}

describe('createLogger', () => {
  it('redacts OTPs, PINs, tokens and phone numbers', () => {
    const { lines, stream } = captureLogs();
    const logger = createLogger({ env: 'production', logLevel: 'info' }, stream);

    logger.info(
      {
        phone: '+919876543210',
        otp: '482913',
        user: { pin: '4321', refreshToken: 'refresh-secret' },
        req: { headers: { authorization: 'Bearer access-secret', cookie: 'rt=cookie-secret' } },
      },
      'login attempt',
    );

    const output = lines.join('');
    for (const secret of [
      '9876543210',
      '482913',
      '4321',
      'refresh-secret',
      'access-secret',
      'cookie-secret',
    ]) {
      expect(output).not.toContain(secret);
    }
    expect(output).toContain('[REDACTED]');
    expect(output).toContain('login attempt');
  });
});
