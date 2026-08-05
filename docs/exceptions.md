# Mục đích
Tài liệu này quy định kiến trúc và cách thức xử lý ngoại lệ (Exception Handling), mã lỗi (ErrorCode), và chuẩn hóa JSON Response toàn ứng dụng DriveX.

# Khi nào cần cập nhật
- Khi định nghĩa thêm mã lỗi `ErrorCode` cho module mới.
- Khi cập nhật cấu trúc JSON Response hoặc thay đổi luồng xử lý Exception Filter.

# Thành phần liên quan
- `ErrorCode` ([error-code.enum.ts](file:///home/minh/code/driveR/backend/src/common/constants/error-code.enum.ts))
- `BaseException` ([base.exception.ts](file:///home/minh/code/driveR/backend/src/common/exceptions/base.exception.ts))
- `AllExceptionsFilter` ([http-exception.filter.ts](file:///home/minh/code/driveR/backend/src/common/filters/http-exception.filter.ts))
- `AppValidationPipe` ([app-validation.pipe.ts](file:///home/minh/code/driveR/backend/src/common/pipes/app-validation.pipe.ts))
- Các Exception thuộc từng Domain Module.

# Luồng hoạt động

```text
[Exception xảy ra trong Service]
               │
               ▼
   (Throw Domain Exception) ──► Kế thừa từ BaseException (ví dụ: FileNotFoundException)
               │
               ▼
    [AllExceptionsFilter]   ──► Bắt Exception ngắt dòng
               │
               ├──► Phân loại Exception (BaseException vs Nest HttpException vs Unknown Error)
               ├──► Lấy Request ID từ AsyncLocalStorage Context
               ├──► Ghi log JSON qua AppLoggerService & AuditLoggerService
               └──► Trả về HTTP Payload dạng IErrorResponse JSON
```

Cấu trúc Error Response thống nhất:
```json
{
  "success": false,
  "statusCode": 404,
  "errorCode": "FILE_4000_NOT_FOUND",
  "messageKey": "file.error.not_found",
  "args": { "fileId": "123" },
  "timestamp": "2026-07-29T10:40:48.123Z",
  "path": "/api/v1/files/123",
  "requestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
}
```

# Quy tắc
1. Không sử dụng trực tiếp `throw new Error()` hoặc `throw new HttpException()` trong Business Services. Luôn dùng hoặc tạo mới Domain Exception kế thừa `BaseException`.
2. Không hardcode văn bản thông báo lỗi tiếng Việt hay tiếng Anh trong Exception constructor; dùng `messageKey` phục vụ đa ngôn ngữ i18n.
3. Không trả về thông tin chi tiết Stack Trace cho Client ở môi trường Production.

# TODO
- [ ] Tích hợp gói `@nestjs/i18n` để dịch tự động `messageKey` thành thông điệp đa ngôn ngữ dựa theo header `Accept-Language`.

# Future Expansion
- Tích hợp Sentry / Bugsnag SDK vào `AllExceptionsFilter` để tự động gửi thông báo Real-time Alert khi gặp lỗi Unhandled HTTP 500.

# Notes
- Mã lỗi `ErrorCode` được phân vùng rõ ràng theo dải số (AUTH: 2000-2999, USER: 3000-3999, FILE: 4000-4999, FOLDER: 5000-5999, STORAGE: 6000-6999).
