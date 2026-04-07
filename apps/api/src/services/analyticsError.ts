// =============================================================================
// Analytics Error Class
// =============================================================================

export class AnalyticsError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AnalyticsError';
    this.code = code;
  }
}
