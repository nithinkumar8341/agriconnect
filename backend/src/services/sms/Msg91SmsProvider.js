// Placeholder for the production gateway. Indian SMS needs a DLT-registered sender ID and
// pre-approved templates before any provider will deliver, so this fails loudly until that exists.
export class Msg91SmsProvider {
  constructor({ authKey }) {
    this.authKey = authKey;
  }

  async send() {
    throw new Error(
      'Msg91SmsProvider is not implemented yet: it needs DLT-approved templates (see docs/decisions/0003-authentication.md)',
    );
  }
}
