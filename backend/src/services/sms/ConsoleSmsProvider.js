// Development only (config rejects it in production): prints the SMS so you can log in without a gateway.
// It writes to stdout directly rather than through pino, whose redaction would hide the code.
export class ConsoleSmsProvider {
  constructor(output = process.stdout) {
    this.output = output;
  }

  async send({ to, message }) {
    this.output.write(`\n[DEV SMS] to ${to}: ${message}\n\n`);
  }
}
