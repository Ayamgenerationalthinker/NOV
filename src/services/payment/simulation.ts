/**
 * Simulated payments exist only to click through checkout locally without gateway keys.
 * They are allowed ONLY when NODE_ENV !== 'production' AND PAYMENT_SIMULATION=true.
 * Read from process.env at call time so a misconfigured build can never cache "enabled".
 */
export function isPaymentSimulationEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.PAYMENT_SIMULATION === 'true';
}

export class PaymentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentConfigurationError';
  }
}
