import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../base.exception';
import { ErrorCode } from '../../constants/error-code.enum';

export class ItemInTrashException extends BaseException {
  public readonly errorCode = ErrorCode.TRASH_ITEM_IN_TRASH;
  public readonly httpStatus = HttpStatus.BAD_REQUEST;

  constructor(itemId: string) {
    super('trash.error.item_in_trash', { itemId });
  }
}

export class ItemNotInTrashException extends BaseException {
  public readonly errorCode = ErrorCode.TRASH_ITEM_NOT_IN_TRASH;
  public readonly httpStatus = HttpStatus.BAD_REQUEST;

  constructor(itemId: string) {
    super('trash.error.item_not_in_trash', { itemId });
  }
}
