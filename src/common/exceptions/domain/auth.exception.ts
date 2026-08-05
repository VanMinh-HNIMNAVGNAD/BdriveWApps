import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../base.exception';
import { ErrorCode } from '../../constants/error-code.enum';

export class InvalidCredentialsException extends BaseException {
  public readonly errorCode = ErrorCode.AUTH_INVALID_CREDENTIALS;
  public readonly httpStatus = HttpStatus.UNAUTHORIZED;

  constructor(details?: Record<string, any>) {
    super('auth.error.invalid_credentials', undefined, details);
  }
}

export class TokenExpiredException extends BaseException {
  public readonly errorCode = ErrorCode.AUTH_TOKEN_EXPIRED;
  public readonly httpStatus = HttpStatus.UNAUTHORIZED;

  constructor() {
    super('auth.error.token_expired');
  }
}

export class UnauthorizedAccessException extends BaseException {
  public readonly errorCode = ErrorCode.AUTH_UNAUTHORIZED;
  public readonly httpStatus = HttpStatus.UNAUTHORIZED;

  constructor(resource?: string) {
    super('auth.error.unauthorized', { resource });
  }
}
