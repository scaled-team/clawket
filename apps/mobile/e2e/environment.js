const {
  DetoxCircusEnvironment,
  SpecReporter,
  WorkerAssignReporter,
} = require('detox/runners/jest');

class CustomDetoxEnvironment extends DetoxCircusEnvironment {
  constructor(config, context) {
    super(config, context);

    // Keep per-spec timeout defensive; individual specs can override.
    this.initTimeout = 300000;

    // Lightweight console reporting; full Detox reporter is configured in
    // e2e/jest.config.js via `reporters`.
    this.registerListeners({
      SpecReporter,
      WorkerAssignReporter,
    });
  }
}

module.exports = CustomDetoxEnvironment;
