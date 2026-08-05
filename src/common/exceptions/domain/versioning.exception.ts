import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../base.exception';
import { ErrorCode } from '../../constants/error-code.enum';

export class VersionNotFoundException extends BaseException {
  public readonly errorCode = ErrorCode.VERSION_NOT_FOUND;
  public readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(fileId: string, versionId: string) {
    super('versioning.error.not_found', { fileId, versionId });
  }
}

export class VersionLimitExceededException extends BaseException {
  public readonly errorCode = ErrorCode.VERSION_LIMIT_EXCEEDED;
  public readonly httpStatus = HttpStatus.BAD_REQUEST;

  constructor(fileId: string, maxVersions: number) {
    super('versioning.error.limit_exceeded', { fileId, maxVersions });
  }
}
