import type { AppError, AppErrorCode } from '@/types';

/** Error terklasifikasi yang dilempar router; aiService mengubahnya menjadi Result. */
export class RouterError extends Error {
  readonly appError: AppError;
  constructor(appError: AppError) {
    super(appError.message);
    this.name = 'RouterError';
    this.appError = appError;
  }
  get code(): AppErrorCode {
    return this.appError.code;
  }
}

export class NoEligibleKeyError extends RouterError {
  constructor(message: string, retryAt?: number) {
    super({ code: 'no_eligible_key', message, retryAt });
    this.name = 'NoEligibleKeyError';
  }
}

export class RateLimitedError extends RouterError {
  constructor(appError: AppError) {
    super(appError);
    this.name = 'RateLimitedError';
  }
}

export class InvalidJsonError extends RouterError {
  constructor(message: string, rawOutput: string) {
    super({ code: 'invalid_json', message, rawOutput });
    this.name = 'InvalidJsonError';
  }
}
