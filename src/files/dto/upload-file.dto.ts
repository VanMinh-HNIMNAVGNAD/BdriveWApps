import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

/**
 * -------------------------------------------------
 * Purpose: Validation và Data Transfer Object cho request upload file đơn.
 * Responsibilities: Kiểm tra định dạng dữ liệu đầu vào khi client khởi tạo hoặc upload file.
 * Used by: UploadController, AppValidationPipe.
 * Depends on: class-validator, class-transformer.
 * Future expansion: Thêm validation cho tags, encryption preference, retention period.
 * -------------------------------------------------
 * File này làm gì: Định nghĩa thuộc tính DTO gửi từ client khi upload file.
 * Không nên làm gì: Không chứa logic truy vấn DB hoặc kiểm tra dung lượng thực tế của file.
 * Khi nào được gọi: Được gọi tự động bởi ValidationPipe khi client gửi HTTP POST Request.
 * File nào sẽ gọi nó: UploadController.
 * Nó sẽ gọi file nào: Không gọi file nào.
 * Sau me có thể mở rộng ra sao: Thêm custom decorators để validate đuôi file chuyên sâu.
 */

export class UploadFileDto {
  @IsNotEmpty()
  @IsString()
  // TODO: Tên tệp tin được upload từ client
  filename: string;

  @IsOptional()
  @IsString()
  // TODO: ID thư mục cha chứa file (nếu rỗng sẽ nằm ở Root directory)
  folderId?: string;

  @IsNotEmpty()
  @IsNumber()
  // TODO: Kích thước file tính theo bytes
  size: number;

  @IsNotEmpty()
  @IsString()
  // TODO: Định dạng MIME của file (ví dụ: application/pdf, image/png)
  mimeType: string;
}
