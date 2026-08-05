import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../base.exception';
import { ErrorCode } from '../../constants/error-code.enum';

export class FolderNotFoundException extends BaseException {
  public readonly errorCode = ErrorCode.FOLDER_NOT_FOUND;
  public readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(folderId: string) {
    super('folder.error.not_found', { folderId });
  }
}

export class FolderAlreadyExistsException extends BaseException {
  public readonly errorCode = ErrorCode.FOLDER_ALREADY_EXISTS;
  public readonly httpStatus = HttpStatus.CONFLICT;

  constructor(name: string, parentId?: string) {
    super('folder.error.already_exists', { name, parentId });
  }
}

export class CircularDependencyException extends BaseException {
  public readonly errorCode = ErrorCode.FOLDER_CIRCULAR_DEPENDENCY;
  public readonly httpStatus = HttpStatus.UNPROCESSABLE_ENTITY;

  constructor(targetFolderId: string, parentId: string) {
    super('folder.error.circular_dependency', { targetFolderId, parentId });
  }
}
