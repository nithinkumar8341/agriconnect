import { Writable } from 'node:stream';
import { ConsoleSmsProvider } from '../src/services/sms/ConsoleSmsProvider.js';
import { createSmsProvider } from '../src/services/sms/index.js';
import { Msg91SmsProvider } from '../src/services/sms/Msg91SmsProvider.js';
import { otpMessage } from '../src/services/sms/templates.js';

describe('otpMessage', () => {
  it.each(['en', 'te', 'hi'])('includes the code and the 5-minute validity in %s', (language) => {
    const message = otpMessage(language, '482913');
    expect(message).toContain('482913');
    expect(message).toContain('5');
  });

  it('writes Telugu for te', () => {
    expect(otpMessage('te', '111111')).toMatch(/[ఀ-౿]/);
  });

  it('falls back to English for an unknown language', () => {
    expect(otpMessage('fr', '111111')).toBe(otpMessage('en', '111111'));
  });
});

describe('SMS providers', () => {
  it('creates the provider named in config', () => {
    expect(createSmsProvider({ provider: 'console' })).toBeInstanceOf(ConsoleSmsProvider);
    expect(createSmsProvider({ provider: 'msg91', msg91AuthKey: 'k' })).toBeInstanceOf(
      Msg91SmsProvider,
    );
    expect(() => createSmsProvider({ provider: 'pigeon' })).toThrow(/Unknown SMS provider/);
  });

  it('console provider prints the recipient and message', async () => {
    let printed = '';
    const output = new Writable({
      write(chunk, _encoding, callback) {
        printed += chunk;
        callback();
      },
    });

    await new ConsoleSmsProvider(output).send({ to: '+919876543210', message: 'hello' });

    expect(printed).toContain('[DEV SMS] to +919876543210: hello');
  });

  it('msg91 stub fails loudly instead of pretending to send', async () => {
    const provider = new Msg91SmsProvider({ authKey: 'k' });

    await expect(provider.send({ to: 'x', message: 'y' })).rejects.toThrow(/not implemented/);
  });
});
