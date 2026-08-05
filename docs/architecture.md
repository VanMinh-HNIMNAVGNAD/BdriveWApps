# Mục đích
File này đóng vai trò là tài liệu kiến trúc tổng thể (System Architecture Blueprint) cho toàn bộ dự án DriveX. Nó mô tả các tầng kiến trúc (Clean Architecture), nguyên lý thiết kế (SOLID), và cách các module giao tiếp với nhau.

# Khi nào cần cập nhật
- Khi có sự thay đổi về mặt kiến trúc hệ thống (ví dụ: bổ sung Microservices, Event-Driven Architecture, Caching Layer).
- Khi thay đổi các nguyên tắc phát triển hoặc tích hợp các công nghệ cốt lõi mới.

# Thành phần liên quan
- NestJS Core Framework (v11)
- TypeORM (PostgreSQL Database)
- CommonModule (Exception Handling, Interceptor, Logger, Middleware)
- Các Feature Modules: AuthModule, FilesModule, StorageModule, UserModule, SharingModule, TrashModule, VersioningModule.

# Luồng hoạt động
Sơ đồ luồng xử lý Request/Response tổng thể trong hệ thống DriveX:

```text
[Client Request]
       │
       ▼
[RequestIdMiddleware] ──► (Gắn Correlation UUID & Khởi tạo AsyncLocalStorage context)
       │
       ▼
[AppValidationPipe]   ──► (Kiểm tra & Format DTO; phát ra ValidationException nếu sai)
       │
       ▼
[JwtAuthGuard]        ──► (Xác thực JWT Token & Phân quyền)
       │
       ▼
[Controller Layer]    ──► (Tiếp nhận HTTP Endpoint, điều hướng đến Service)
       │
       ▼
[Service Layer]       ──► (Xử lý Orchestration Nghiệp vụ, Ném Domain Exception nếu thất bại)
       │
       ├──► [Repository / Database] (PostgreSQL TypeORM)
       └──► [Storage Provider]      (AWS S3 / Google Cloud Storage)
       │
       ▼
[TransformInterceptor]──► (Bọc Response thành công vào JSON Envelope chuẩn)
       │
       ▼
[AllExceptionsFilter] ──► (Bắt mọi Exception, log JSON & trả về Error JSON Envelope)
```

# Quy tắc
1. **Clean Architecture**: Tầng Domain (Service/Exception) tuyệt đối không dính dáng đến HTTP Transport (Express Request/Response).
2. **Single Responsibility**: Mỗi class/module chỉ chịu trách nhiệm duy nhất cho một miền nghiệp vụ.
3. **Dependency Inversion**: Service giao tiếp với Cloud Storage thông qua Interface `IStorageProvider`, không gọi trực tiếp AWS/GCP SDK trong business logic.
4. **No Code Hardcode**: Không hardcode chuỗi thông báo lỗi, dùng Message Keys cho i18n.

# TODO
- [ ] Thiết kế cơ chế Async Event Driven với RabbitMQ/Kafka khi hệ thống tăng tải.
- [ ] Triển khai Caching Layer với Redis cho User Quota và File Metadata.

# Future Expansion
- Tách các module nặng (Upload Worker, Search Indexer, Video Transcoder) thành các Microservices độc lập kết nối qua gRPC hoặc Message Queue.

# Notes
- Mọi Request đi qua hệ thống đều bắt buộc có `X-Request-Id` để soi vết log toàn trình.
