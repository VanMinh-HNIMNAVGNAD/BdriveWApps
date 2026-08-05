# Mục đích
Tài liệu này chi tiết hóa kiến trúc và quy trình kỹ thuật cho hai cơ chế Upload File trong DriveX: **Direct Presigned URL Upload** (cho tệp nhỏ/trung bình) và **Multipart Chunked Upload** (cho tệp lớn).

# Khi nào cần cập nhật
- Khi thay đổi quy trình cấp phát Presigned URL hoặc thuật toán chunking file.
- Khi điều chỉnh ngưỡng phân loại giữa Single Upload và Chunked Upload.

# Thành phần liên quan
- `UploadController` ([upload.controller.ts](file:///home/minh/code/driveR/backend/src/files/controllers/upload.controller.ts))
- `UploadService` ([upload.service.ts](file:///home/minh/code/driveR/backend/src/files/services/upload.service.ts))
- `ChunkedUploadService` ([chunked-upload.service.ts](file:///home/minh/code/driveR/backend/src/files/services/chunked-upload.service.ts))
- `IStorageProvider` ([storage-provider.interface.ts](file:///home/minh/code/driveR/backend/src/files/interfaces/storage-provider.interface.ts))

# Luồng hoạt động

### 1. Direct Presigned URL Upload Flow (File < 100MB)
```text
[Client]                [NestJS API]               [Cloud Storage S3/GCS]
   │                         │                              │
   │ 1. POST /presigned-url  │                              │
   ├────────────────────────►│                              │
   │ (filename, size, mime)  │ (Check Quota & Create URL)   │
   │                         │                              │
   │ 2. Return Presigned URL │                              │
   │◄────────────────────────┤                              │
   │                         │                              │
   │ 3. Direct HTTP PUT File Payload                         │
   ├───────────────────────────────────────────────────────►│
   │ 4. HTTP 200 OK Status                                  │
   │◄───────────────────────────────────────────────────────┤
   │                         │                              │
   │ 5. POST /confirm/:id    │                              │
   ├────────────────────────►│                              │
   │                         │ (Update DB Status to ACTIVE) │
   │ 6. Response Success     │                              │
   │◄────────────────────────┤                              │
```

### 2. Chunked Multipart Upload Flow (File > 100MB)
```text
[Client]                [NestJS API]                  [Redis Cache]
   │                         │                              │
   │ 1. POST /chunk/init     │                              │
   ├────────────────────────►│ 2. Create Multipart Session    │
   │                         ├─────────────────────────────►│
   │ 3. Return uploadId      │                              │
   │◄────────────────────────┤                              │
   │                         │                              │
   │ 4. Loop POST /process   │                              │
   ├────────────────────────►│ 5. Store part ETag & status   │
   │    (chunk 1..N)         ├─────────────────────────────►│
   │                         │                              │
   │ 6. POST /complete       │                              │
   ├────────────────────────►│ 7. Fetch Parts & Complete Merge
   │                         │ (Call S3 CompleteMultipart)  │
   │ 8. Success Status       │                              │
   │◄────────────────────────┤                              │
```

# Quy tắc
1. Client không upload file dung lượng lớn trực tiếp qua API Server để tránh nghẽn I/O.
2. Mọi session Multipart Upload bắt buộc phải có thời gian hết hạn (TTL 24h) trên Redis để giải phóng bộ nhớ.
3. Luôn luôn kiểm tra dung lượng còn lại của User (Quota) trước khi cấp phát URL/Session Upload.

# TODO
- [ ] Bổ sung cơ chế tự động quét Virus (ClamAV) ngay khi nhận được tín hiệu Confirm Upload.
- [ ] Triển khai tự động trích xuất Thumbnail cho ảnh và PDF.

# Future Expansion
- Hỗ trợ Upload qua WebSocket / WebRTC cho môi trường mạng không ổn định hoặc đồng bộ dữ liệu Real-time Peer-to-Peer.

# Notes
- Ngưỡng chia tách giữa Direct Upload và Chunked Upload mặc định là **100MB**.
