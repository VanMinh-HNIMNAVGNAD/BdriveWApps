import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../../common/exceptions/base.exception';
import { ErrorCode } from '../../common/constants/error-code.enum';

/**
 * -------------------------------------------------
 * Purpose: Báo lỗi khi kích thước tệp upload vượt quá hạn ngạch (quota) của User hoặc giới hạn hệ thống.
 * Responsibilities: Cung cấp HTTP Status 413 Payload Too Large và mã lỗi FILE_TOO_LARGE.
 * Used by: UploadService, ChunkedUploadService.
 * Depends on: BaseException, ErrorCode.
 * Future expansion: Thêm gợi ý nâng cấp gói dung lượng Drive.
 * -------------------------------------------------
 * File này làm gì: Exception riêng khi file vượt quá kích thước cho phép.
 * Không nên làm gì: Không chứa logic tính toán dung lượng.
 * Khi nào được gọi: Được throw khi kiểm tra size > maxSize hoặc Quota bị tràn.
 * File nào sẽ gọi nó: UploadService, ChunkedUploadService.
 * Nó sẽ gọi file nào: BaseException.
 * Sau này có thể mở rộng ra sao: Thêm tier recommendation message key.
 */

export class FileTooLargeException extends BaseException {
  public readonly errorCode = ErrorCode.FILE_TOO_LARGE;
  public readonly httpStatus = HttpStatus.PAYLOAD_TOO_LARGE;

  constructor(size: number, maxSize: number) {
    super('file.error.too_large', { size, maxSize });
  }
}
