import { ConsoleSmsProvider } from './ConsoleSmsProvider.js';
import { Msg91SmsProvider } from './Msg91SmsProvider.js';

// Every provider implements: async send({ to, message }). Callers never know which one is active.
export function createSmsProvider(smsConfig) {
  switch (smsConfig.provider) {
    case 'msg91':
      return new Msg91SmsProvider({ authKey: smsConfig.msg91AuthKey });
    case 'console':
      return new ConsoleSmsProvider();
    default:
      throw new Error(`Unknown SMS provider: ${smsConfig.provider}`);
  }
}
