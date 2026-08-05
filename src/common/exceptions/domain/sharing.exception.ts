import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../base.exception';
import { ErrorCode } from '../../constants/error-code.enum';

export class PermissionDeniedException extends BaseException {
  public readonly errorCode = ErrorCode.SHARING_PERMISSION_DENIED;
  public readonly httpStatus = HttpStatus.FORBIDDEN;

  constructor(action: string, resourceId: string) {
    super('sharing.error.permission_denied', { action, resourceId });
  }
}

export class ShareLinkExpiredException extends BaseException {
  public readonly errorCode = ErrorCode.SHARING_LINK_EXPIRED;
  public readonly httpStatus = HttpStatus.GONE;

  constructor(linkId: string) {
    super('sharing.error.link_expired', { linkId });
  }
}

export class ShareLinkNotFoundException extends BaseException {
  public readonly errorCode = ErrorCode.SHARING_LINK_NOT_FOUND;
  public readonly httpStatus = HttpStatus.NOT_FOUND;

  constructor(token: string) {
    super('sharing.error.link_not_found', { token });
  }
}
