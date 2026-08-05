import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../base.exception';
import { ErrorCode } from '../../constants/error-code.enum';

export class StorageUploadFailedException extends BaseException {
  public readonly errorCode = ErrorCode.STORAGE_UPLOAD_FAILED;
  public readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

  constructor(provider: string, reason?: string) {
    super('storage.error.upload_failed', { provider, reason });
  }
}

export class StorageProviderUnavailableException extends BaseException {
  public readonly errorCode = ErrorCode.STORAGE_PROVIDER_UNAVAILABLE;
  public readonly httpStatus = HttpStatus.SERVICE_UNAVAILABLE;

  constructor(provider: string) {
    super('storage.error.provider_unavailable', { provider });
  }
}

export class StorageDeleteFailedException extends BaseException {
  public readonly errorCode = ErrorCode.STORAGE_DELETE_FAILED;
  public readonly httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;

  constructor(key: string, provider: string) {
    super('storage.error.delete_failed', { key, provider });
  }
}
