import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../base.exception';
import { ErrorCode } from '../../constants/error-code.enum';

export class UserNotFoundException extends BaseException {
  public readonly errorCode = ErrorCode.USER_NOT_FOUND;
  public readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(userId: string) {
    super('user.error.not_found', { userId });
  }
}

export class UserAlreadyExistsException extends BaseException {
  public readonly errorCode = ErrorCode.USER_ALREADY_EXISTS;
  public readonly httpStatus = HttpStatus.CONFLICT;

  constructor(email: string) {
    super('user.error.already_exists', { email });
  }
}

export class UserQuotaExceededException extends BaseException {
  public readonly errorCode = ErrorCode.USER_QUOTA_EXCEEDED;
  public readonly httpStatus = HttpStatus.PAYLOAD_TOO_LARGE;

  constructor(usedBytes: number, maxBytes: number) {
    super('user.error.quota_exceeded', { usedBytes, maxBytes });
  }
}
