import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

/**
 * -------------------------------------------------
 * Purpose: Validation dữ liệu khi khởi tạo session upload file lớn chia nhỏ (Chunked / Multipart Upload).
 * Responsibilities: Kiểm tra thông số tổng dung lượng, số lượng chunk và thông tin file ban đầu.
 * Used by: UploadController, ChunkedUploadService.
 * Depends on: class-validator.
 * Future expansion: Thêm checksum (MD5/SHA256) toàn bộ file để verify integrity sau khi merge.
 * -------------------------------------------------
 * File này làm gì: Khai báo cấu trúc Request Payload để tạo Multipart Session trên S3/GCS.
 * Không nên làm gì: Không thực thi logic chia file.
 * Khi nào được gọi: Khi client bắt đầu upload file dung lượng lớn (>100MB).
 * File nào sẽ gọi nó: UploadController.
 * Nó sẽ gọi file nào: Không gọi file nào.
 * Sau này có thể mở rộng ra sao: Bổ sung chunk hashing parameters.
 */

export class InitChunkUploadDto {
  @IsNotEmpty()
  @IsString()
  filename: string;

  @IsNotEmpty()
  @IsNumber()
  totalSize: number;

  @IsNotEmpty()
  @IsNumber()
  totalChunks: number;

  @IsNotEmpty()
  @IsString()
  mimeType: string;

  @IsOptional()
  @IsString()
  folderId?: string;
}
