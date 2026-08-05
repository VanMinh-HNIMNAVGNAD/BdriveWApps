# Mục đích
Tài liệu này quy định quy chuẩn tổ chức thư mục chuẩn Enterprise cho dự án DriveX, giúp các nhà phát triển dễ dàng tìm kiếm, mở rộng và bảo trì code.

# Khi nào cần cập nhật
- Khi bổ sung một module nghiệp vụ mới vào dự án.
- Khi thay đổi cấu trúc thư mục quy chuẩn của hệ thống.

# Thành phần liên quan
- Toàn bộ thư mục `src/` trong dự án Backend.

# Luồng hoạt động
Cấu trúc thư mục tổ chức dạng Feature-based và Layered Architecture kết hợp:

```text
src/
├── common/                     # Module toàn cục chứa tiện ích dùng chung
│   ├── constants/              # Enums (ErrorCode, UserRole, StorageProvider)
│   ├── context/                # Request Context & AsyncLocalStorage
│   ├── exceptions/             # Domain Base Exceptions & Module Exceptions
│   ├── filters/                # Global HTTP Exception Filters
│   ├── interceptors/           # Global Response Transform Interceptors
│   ├── interfaces/             # API Response Contracts
│   ├── logger/                 # Structured App Logger & Audit Logger
│   ├── middleware/             # Correlation Request ID Middleware
│   └── pipes/                  # Global Custom Validation Pipes
├── entities/                   # TypeORM Database Entities
├── auth/                       # Module Xác thực (Login, Register, JWT)
├── files/                      # Module Quản lý File
│   ├── controllers/            # REST Endpoints
│   ├── services/               # Business Logic Services
│   ├── dto/                    # Validation Data Transfer Objects
│   ├── exceptions/             # Domain Exceptions riêng của File
│   └── interfaces/             # Storage Contracts
├── storage/                    # Module tích hợp Cloud Storage (S3, GCS)
└── main.ts                     # File khởi tạo ứng dụng NestJS
```

# Quy tắc
1. Không đặt các file dùng chung ở cấp root `src/`, luôn đưa vào `common/`.
2. Mọi feature module phải tự đóng gói DTO, Service, Controller trong thư mục riêng của mình.
3. Không import chéo các file private của module khác; nếu cần dùng chung, hãy export qua Module.

# TODO
- [ ] Bổ sung thư mục `migrations/` cho TypeORM Database Schema versioning.
- [ ] Bổ sung thư mục `test/` chứa E2E và Integration Tests.

# Future Expansion
- Khi hệ thống mở rộng lên Monorepo (NestJS Monorepo), chuyển `common` thành một Shared Library (`libs/common`).

# Notes
- Đặt tên file theo chuẩn kebab-case (ví dụ: `upload-file.dto.ts`, `file-too-large.exception.ts`).
