import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-code.enum';

/**
 * Clean Architecture Domain Base Exception.
 * Business logic exceptions extend this class.
 * Decoupled from HTTP details, but specifies standard status code mapping for API transport.
 */
export abstract class BaseException extends Error {
  public abstract readonly errorCode: ErrorCode;
  public abstract readonly httpStatus: HttpStatus;

  constructor(
    public readonly messageKey: string,
    public readonly args?: Record<string, any>,
    public readonly details?: Record<string, any>,
  ) {
    super(messageKey);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
