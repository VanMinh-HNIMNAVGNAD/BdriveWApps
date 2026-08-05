import { ValidationError, ValidationPipe, ValidationPipeOptions } from '@nestjs/common';
import { ValidationException } from '../exceptions/validation.exception';
import { IValidationFieldError } from '../interfaces/api-response.interface';

export class AppValidationPipe extends ValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const formattedErrors = this.formatValidationErrors(errors);
        return new ValidationException(formattedErrors);
      },
      ...options,
    });
  }

  private formatValidationErrors(
    errors: ValidationError[],
    parentPath = '',
  ): IValidationFieldError[] {
    const result: IValidationFieldError[] = [];

    for (const err of errors) {
      const fieldPath = parentPath ? `${parentPath}.${err.property}` : err.property;

      if (err.constraints) {
        result.push({
          field: fieldPath,
          errors: Object.values(err.constraints),
        });
      }

      if (err.children && err.children.length > 0) {
        result.push(...this.formatValidationErrors(err.children, fieldPath));
      }
    }

    return result;
  }
}
