import { HttpStatus } from '@nestjs/common';
import { BaseException } from '../../common/exceptions/base.exception';
import { ErrorCode } from '../../common/constants/error-code.enum';

/**
 * -------------------------------------------------
 * Purpose: Báo lỗi khi loại tệp upload nằm trong danh sách cấm (.exe, .bat) hoặc không hỗ trợ.
 * Responsibilities: Trả về HTTP Status 400 Bad Request và mã lỗi FILE_INVALID_TYPE.
 * Used by: UploadService.
 * Depends on: BaseException, ErrorCode.
 * Future expansion: Thêm chi tiết danh sách MIME types hợp lệ.
 * -------------------------------------------------
 * File này làm gì: Exception riêng khi tệp tin không hợp lệ về định dạng MIME.
 * Không nên làm gì: Không thực thi logic quét virus hay inspect magic bytes.
 * Khi nào được gọi: Được throw khi validate MIME type thất bại.
 * File nào sẽ gọi nó: UploadService.
 * Nó sẽ gọi file nào: BaseException.
 * Sau này có thể mở rộng ra sao: Tích hợp thông báo quy định an toàn file của doanh nghiệp.
 */

export class InvalidFileTypeException extends BaseException {
  public readonly errorCode = ErrorCode.FILE_INVALID_TYPE;
  public readonly httpStatus = HttpStatus.BAD_REQUEST;

  constructor(mimeType: string, allowedTypes: string[]) {
    super('file.error.invalid_type', { mimeType, allowedTypes: allowedTypes.join(', ') });
  }
}
