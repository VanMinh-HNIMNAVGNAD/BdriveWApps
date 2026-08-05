import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

/**
 * -------------------------------------------------
 * Purpose: Validation dữ liệu cho từng chunk file gửi lên server trong quá trình Multipart Upload.
 * Responsibilities: Đảm bảo đúng Upload Session ID, vị trí index của chunk và ETag mã hóa.
 * Used by: UploadController, ChunkedUploadService.
 * Depends on: class-validator.
 * Future expansion: Thêm chunk MD5 hash validation per chunk.
 * -------------------------------------------------
 * File này làm gì: Kiểm tra dữ liệu khi client gửi từng mảnh file (Chunk).
 * Không nên làm gì: Không lưu trực tiếp buffer vào file system.
 * Khi nào được gọi: Gọi lặp lại cho từng chunk (ví dụ từ chunk 1 đến chunk N).
 * File nào sẽ gọi nó: UploadController.
 * Nó sẽ gọi file nào: Không gọi file nào.
 * Sau này có thể mở rộng ra sao: Thêm retry token để khôi phục khi ngắt kết nối mạng (Resumable Upload).
 */

export class UploadChunkDto {
  @IsNotEmpty()
  @IsString()
  // TODO: Session ID khởi tạo từ InitChunkUpload
  uploadId: string;

  @IsNotEmpty()
  @IsNumber()
  // TODO: Thứ tự của chunk (1-indexed hoặc 0-indexed)
  chunkIndex: number;

  @IsNotEmpty()
  @IsString()
  // TODO: Mã MD5/ETag của chunk để kiểm tra tính toàn vẹn
  chunkHash: string;
}
