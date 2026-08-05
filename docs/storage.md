# Mục đích
Tài liệu này quy định chiến lược lưu trữ dữ liệu đa mây (Multi-Cloud Storage Strategy) của DriveX, cách tích hợp và chuyển đổi giữa các nhà cung cấp lưu trữ (AWS S3, Google Cloud Storage, Local Disk Storage).

# Khi nào cần cập nhật
- Khi bổ sung một nhà cung cấp bộ nhớ Cloud mới (ví dụ: Cloudflare R2, Azure Blob Storage).
- Khi thay đổi quy tắc đặt tên Storage Key (object key naming convention).

# Thành phần liên quan
- `StorageModule` ([storage.module.ts](file:///home/minh/code/driveR/backend/src/storage/storage.module.ts))
- `StorageService` ([storage.service.ts](file:///home/minh/code/driveR/backend/src/storage/storage.service.ts))
- `IStorageProvider` ([storage-provider.interface.ts](file:///home/minh/code/driveR/backend/src/files/interfaces/storage-provider.interface.ts))

# Luồng hoạt động

```text
               [Upload / Download Service]
                            │
                            ▼
                [IStorageProvider Contract]
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
  [AwsS3Storage]    [GcsStorage]     [LocalStorage]
  (Production)      (Backup/Cloud)   (Local Development)
```

# Quy tắc
1. **DIP Contract**: Tất cả các Storage Adapter đều phải triển khai (implement) đầy đủ các phương thức trong `IStorageProvider`.
2. **Object Key Naming**: Storage Key tuyệt đối không sử dụng tên file gốc của người dùng để tránh trùng lặp và vấn đề bảo mật path traversal.
   Cấu trúc Key quy chuẩn: `tenants/{tenantId}/users/{userId}/year/month/{uuid}.bin`
3. **Encryption at Rest**: Mọi file lưu trên S3/GCS đều phải bật mã hóa phía server (Server-Side Encryption SSE-S3 / SSE-KMS).

# TODO
- [ ] Triển khai tự động chuyển đổi file ít truy cập (Hot Storage) sang Cold Storage (S3 Glacier / GCS Coldline) sau 90 ngày để tiết kiệm chi phí.

# Future Expansion
- Triển khai thuật toán mã hóa phía Client (Client-Side Zero-Knowledge Encryption) để đảm bảo không ai ngoại trừ người dùng xem được nội dung tệp.

# Notes
- Ở môi trường Local Development, hệ thống ưu tiên sử dụng `LocalStorage` hoặc MinIO Container để không phát sinh chi phí Cloud.
