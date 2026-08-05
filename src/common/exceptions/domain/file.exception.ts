import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../base.exception';
import { ErrorCode } from '../../constants/error-code.enum';

export class FileNotFoundException extends BaseException {
  public readonly errorCode = ErrorCode.FILE_NOT_FOUND;
  public readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(fileId: string) {
    super('file.error.not_found', { fileId });
  }
}

export class FileTooLargeException extends BaseException {
  public readonly errorCode = ErrorCode.FILE_TOO_LARGE;
  public readonly httpStatus = HttpStatus.PAYLOAD_TOO_LARGE;

  constructor(size: number, maxSize: number) {
    super('file.error.too_large', { size, maxSize });
  }
}

export class InvalidFileTypeException extends BaseException {
  public readonly errorCode = ErrorCode.FILE_INVALID_TYPE;
  public readonly httpStatus = HttpStatus.BAD_REQUEST;

  constructor(mimeType: string, allowedTypes: string[]) {
    super('file.error.invalid_type', { mimeType, allowedTypes: allowedTypes.join(', ') });
  }
}

export class FileLockedException extends BaseException {
  public readonly errorCode = ErrorCode.FILE_LOCKED;
  public readonly httpStatus = HttpStatus.LOCKED;

  constructor(fileId: string, lockedBy: string) {
    super('file.error.locked', { fileId, lockedBy });
  }
}
