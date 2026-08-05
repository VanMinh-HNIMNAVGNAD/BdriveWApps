import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ErrorCode } from '../constants/error-code.enum';
import { IValidationFieldError } from '../interfaces/api-response.interface';

export class ValidationException extends BaseException {
  public readonly errorCode = ErrorCode.VALIDATION_FAILED;
  public readonly httpStatus = HttpStatus.BAD_REQUEST;

  constructor(public override readonly details: IValidationFieldError[]) {
    super('common.error.validation_failed', undefined, details);
  }
}
