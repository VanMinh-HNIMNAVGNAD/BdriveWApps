/**
 * -------------------------------------------------
 * Purpose: Đáo ngược phụ thuộc (DIP) cho dịch vụ lưu trữ file (Storage Layer).
 * Responsibilities: Định nghĩa các phương thức chuẩn mà bất kỳ Storage Provider nào (AWS S3, Google Cloud Storage, Local Disk) cũng phải tuân thủ.
 * Used by: UploadService, ChunkedUploadService.
 * Depends on: Không phụ thuộc file nào khác.
 * Future expansion: Thêm phương thức generatePresignedDownloadUrl, copyFile, multipartUpload.
 * -------------------------------------------------
 * File này làm gì: Định nghĩa Interface contract cho Storage Adapter.
 * Không nên làm gì: Không chứa bất kỳ logic xử lý cụ thể của AWS SDK hay GCP SDK nào.
 * Khi nào được gọi: Được gọi bởi các Upload Services khi thực thi thao tác lưu/xóa/lấy URL file.
 * File nào sẽ gọi nó: UploadService, ChunkedUploadService.
 * Nó sẽ gọi file nào: Không gọi file nào.
 * Sau này có thể mở rộng ra sao: Hỗ trợ thêm các Cloud Storage Providers khác (Azure Blob Storage, Cloudflare R2).
 */

export interface IStorageProvider {
  /**
   * TODO: Khai báo phương thức upload file cơ bản.
   */
  uploadFile(fileBuffer: Buffer, destinationKey: string, mimeType: string): Promise<string>;

  /**
   * TODO: Khai báo phương thức tạo URL Upload trực tiếp (Presigned Upload URL).
   */
  generatePresignedUploadUrl(destinationKey: string, mimeType: string, expiresInSeconds: number): Promise<string>;

  /**
   * TODO: Khai báo phương thức xóa file trên Storage Provider.
   */
  deleteFile(destinationKey: string): Promise<void>;
}
