import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Storage as GoogleCloudStorage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { User } from '../entities/user.entity';
import { FileItem } from '../entities/file-item.entity';
import { FileVersion } from '../entities/file-version.entity';
import { ActivityLog } from '../entities/activity-log.entity';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';

@Injectable()
export class StorageService {
  private r2Client: S3Client | null = null;
  private b2Client: S3Client | null = null;
  private gcsStorage: GoogleCloudStorage | null = null;

  private r2Bucket: string;
  private b2Bucket: string;
  private gcsBucket: string;
  private defaultProvider: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(FileItem)
    private fileRepository: Repository<FileItem>,
    @InjectRepository(FileVersion)
    private fileVersionRepository: Repository<FileVersion>,
    @InjectRepository(ActivityLog)
    private activityLogRepository: Repository<ActivityLog>,
  ) {
    // Đọc provider mặc định từ nested config (map từ STORAGE_PROVIDER trong .env root)
    this.defaultProvider = this.configService.get<string>('storage.provider') ?? 'google_cloud';

    // 1. Initialize Cloudflare R2 Client
    const r2Endpoint = this.configService.get<string>('storage.r2.endpoint');
    const r2AccessKey = this.configService.get<string>('storage.r2.accessKeyId');
    const r2SecretKey = this.configService.get<string>('storage.r2.secretAccessKey');
    // Không fallback hardcode — thiếu bucket name sẽ throw rõ ràng khi dùng
    this.r2Bucket = this.configService.get<string>('storage.r2.bucketName') ?? '';

    if (r2Endpoint && r2AccessKey && !r2AccessKey.includes('your_access_key')) {
      this.r2Client = new S3Client({
        region: 'auto',
        endpoint: r2Endpoint,
        credentials: { accessKeyId: r2AccessKey, secretAccessKey: r2SecretKey || '' },
      });
    }

    // 2. Initialize Backblaze B2 Client
    const b2Endpoint = this.configService.get<string>('storage.b2.endpoint') ?? 'https://s3.us-west-004.backblazeb2.com';
    const b2AccessKey = this.configService.get<string>('storage.b2.accessKeyId');
    const b2SecretKey = this.configService.get<string>('storage.b2.secretAccessKey');
    // Không fallback hardcode — thiếu bucket name sẽ throw rõ ràng khi dùng
    this.b2Bucket = this.configService.get<string>('storage.b2.bucketName') ?? '';
    const b2Region = this.configService.get<string>('storage.b2.region') ?? 'us-west-004';

    if (b2AccessKey) {
      this.b2Client = new S3Client({
        region: b2Region,
        endpoint: b2Endpoint,
        credentials: { accessKeyId: b2AccessKey, secretAccessKey: b2SecretKey || '' },
      });
    }

    // 3. Initialize Google Cloud Storage Client
    const gcsKeyPath =
      this.configService.get<string>('storage.gcs.keyFilePath') ?? './config/google-service-account.json';
    // Không fallback hardcode — thiếu bucket name sẽ throw rõ ràng khi dùng
    this.gcsBucket = this.configService.get<string>('storage.gcs.bucketName') ?? '';
    const absoluteKeyPath = path.resolve(gcsKeyPath);

    if (fs.existsSync(absoluteKeyPath)) {
      this.gcsStorage = new GoogleCloudStorage({ keyFilename: absoluteKeyPath });
    }
  }

  async getPresignedUploadUrl(userId: string, dto: GetUploadUrlDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    // 1. Quota Check
    const currentUsed = Number(user.storageUsedBytes) || 0;
    const limit = Number(user.storageLimitBytes) || 2147483648;
    if (currentUsed + dto.sizeBytes > limit) {
      throw new BadRequestException(
        `Dung lượng bộ nhớ không đủ. Bạn đã dùng ${(currentUsed / (1024 * 1024 * 1024)).toFixed(2)}GB / ${(limit / (1024 * 1024 * 1024)).toFixed(2)}GB.`,
      );
    }

    // 2. Multi-Cloud Dynamic Plan Tier Routing Strategy
    // Free tier (storageLimitBytes <= 2GB): BẮT BUỘC dùng google_cloud, KHÔNG fallback sang R2/B2
    // Premium tier (storageLimitBytes > 2GB hoặc ADMIN): Cho phép chọn provider, fallback chain đầy đủ
    let targetProvider = dto.targetProvider;
    const isPremium = Number(user.storageLimitBytes) > 2147483648 || user.role === 'ADMIN';

    if (!targetProvider) {
      // Free tier → luôn force GCS. Premium tier → dùng default provider từ config
      targetProvider = isPremium ? (this.defaultProvider || 'google_cloud') : 'google_cloud';
    }

    // Ngăn Free user cố tình chỉ định R2/B2 qua dto.targetProvider
    if (!isPremium && targetProvider !== 'google_cloud') {
      targetProvider = 'google_cloud';
    }

    // 3. Generate unique storage key
    const sanitizedFilename = dto.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `uploads/${userId}/${randomUUID()}_${sanitizedFilename}`;
    let uploadUrl = '';

    try {
      if (targetProvider === 'google_cloud' && this.gcsStorage) {
        try {
          const [url] = await this.gcsStorage
            .bucket(this.gcsBucket)
            .file(storageKey)
            .getSignedUrl({
              version: 'v4',
              action: 'write',
              expires: Date.now() + 15 * 60 * 1000,
              contentType: dto.mimeType,
            });
          uploadUrl = url;
        } catch (gcsErr) {
          if (!isPremium) {
            // Free tier: GCS lỗi → KHÔNG fallback sang R2/B2 (tránh phát sinh chi phí ngoài dự kiến)
            throw new InternalServerErrorException(
              'Dịch vụ lưu trữ tạm thời gặp sự cố. Vui lòng thử lại sau.',
            );
          }
          // Premium tier: Cho phép fallback sang R2 → B2
          console.warn('[Storage] GCS Signed URL failed (Premium user), falling back to Cloudflare R2:', gcsErr);
          targetProvider = this.r2Client ? 'cloudflare_r2' : 'backblaze_b2';
        }
      }

      if (!uploadUrl && targetProvider === 'cloudflare_r2') {
        if (!this.r2Client && this.b2Client) targetProvider = 'backblaze_b2';
        if (this.r2Client) {
          const command = new PutObjectCommand({ Bucket: this.r2Bucket, Key: storageKey, ContentType: dto.mimeType });
          uploadUrl = await getSignedUrl(this.r2Client, command, { expiresIn: 900 });
        }
      }

      if (!uploadUrl && targetProvider === 'backblaze_b2') {
        if (this.b2Client) {
          const command = new PutObjectCommand({ Bucket: this.b2Bucket, Key: storageKey, ContentType: dto.mimeType });
          uploadUrl = await getSignedUrl(this.b2Client, command, { expiresIn: 900 });
        }
      }

      if (!uploadUrl) {
        throw new InternalServerErrorException('Không có nhà cung cấp lưu trữ Cloud nào khả dụng');
      }
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof InternalServerErrorException) {
        throw err;
      }
      throw new InternalServerErrorException(`Không thể khởi tạo presigned upload URL: ${err?.message || err}`);
    }

    return {
      uploadUrl,
      storageKey,
      storageProvider: targetProvider,
      name: dto.name,
      sizeBytes: dto.sizeBytes,
      mimeType: dto.mimeType,
      parentId: dto.parentId || null,
    };
  }

  async confirmUpload(userId: string, dto: ConfirmUploadDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    let parentPath = '/';
    if (dto.parentId) {
      const parentFolder = await this.fileRepository.findOne({
        where: { id: dto.parentId, ownerId: userId, isTrash: false, type: 'folder' },
      });
      if (!parentFolder) {
        throw new NotFoundException('Thư mục cha không tồn tại');
      }
      parentPath = (parentFolder.path || '/') + parentFolder.id + '/';
    }

    const suspiciousExts = ['.exe', '.bat', '.vbs', '.sh', '.cmd', '.scr', '.msi', '.jar', '.ps1', '.dll'];
    const nameLower = (dto.name || '').toLowerCase();
    const isSuspicious = suspiciousExts.some((ext) => nameLower.endsWith(ext));

    // Generate unique name if collision exists
    let finalName = dto.name;
    let baseName = dto.name;
    let ext = '';
    
    const lastDotIndex = dto.name.lastIndexOf('.');
    if (lastDotIndex > 0) {
      baseName = dto.name.substring(0, lastDotIndex);
      ext = dto.name.substring(lastDotIndex);
    }
    
    let counter = 1;
    while (true) {
      const existingFile = await this.fileRepository.findOne({
        where: {
          name: finalName,
          parentId: dto.parentId || (null as any),
          ownerId: userId,
          isTrash: false,
          type: 'file',
        },
      });

      if (!existingFile) break;

      finalName = `${baseName}(${counter})${ext}`;
      counter++;
    }

    // Save new File record
    const newFile = this.fileRepository.create({
      name: finalName,
      type: 'file',
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      storageProvider: dto.storageProvider || this.defaultProvider,
      storageKey: dto.storageKey,
      parentId: dto.parentId || null,
      path: parentPath,
      ownerId: userId,
      isStarred: false,
      isSpam: isSuspicious,
      suspiciousReason: isSuspicious ? 'Phát hiện tệp thực thi nghi ngờ có nguy cơ độc hại (Virus/Spam Guard)' : undefined,
      isTrash: false,
    });

    const fileToReturn = await this.fileRepository.save(newFile);

    // Log activity
    const log = this.activityLogRepository.create({
      userId,
      fileId: fileToReturn.id,
      action: 'UPLOAD_FILE',
      details: { fileName: finalName, sizeBytes: dto.sizeBytes },
    });
    await this.activityLogRepository.save(log);

    await this.userRepository.query(
      `UPDATE users SET storage_used_bytes = storage_used_bytes + $1 WHERE id = $2`,
      [dto.sizeBytes, userId],
    );

    const updatedUser = await this.userRepository.findOne({ where: { id: userId } });

    return {
      file: fileToReturn,
      storageInfo: {
        usedBytes: Number(updatedUser?.storageUsedBytes || 0),
        limitBytes: Number(updatedUser?.storageLimitBytes || 2147483648),
        usedGB: (Number(updatedUser?.storageUsedBytes || 0) / (1024 * 1024 * 1024)).toFixed(2),
        limitGB: (Number(updatedUser?.storageLimitBytes || 2147483648) / (1024 * 1024 * 1024)).toFixed(2),
      },
    };
  }

  async getPresignedDownloadUrl(userId: string, fileId: string) {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, ownerId: userId, isTrash: false },
    });

    if (!file || file.type !== 'file' || !file.storageKey) {
      throw new NotFoundException('Tệp tin không tồn tại hoặc đã bị chuyển vào thùng rác');
    }

    let downloadUrl = '';
    const provider = file.storageProvider || this.defaultProvider;

    try {
      if (provider === 'google_cloud') {
        if (!this.gcsStorage) {
          throw new InternalServerErrorException('Google Cloud Storage chưa được cấu hình');
        }
        const [url] = await this.gcsStorage
          .bucket(this.gcsBucket)
          .file(file.storageKey)
          .getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000,
            promptSaveAs: file.name,
          });
        downloadUrl = url;
      } else if (provider === 'backblaze_b2') {
        if (!this.b2Client) {
          throw new InternalServerErrorException('Backblaze B2 chưa được cấu hình');
        }
        const command = new GetObjectCommand({
          Bucket: this.b2Bucket,
          Key: file.storageKey,
          ResponseContentDisposition: `attachment; filename="${encodeURIComponent(file.name)}"`,
        });
        downloadUrl = await getSignedUrl(this.b2Client, command, { expiresIn: 900 });
      } else if (provider === 'cloudflare_r2') {
        if (!this.r2Client) {
          throw new InternalServerErrorException('Cloudflare R2 chưa được cấu hình');
        }
        const command = new GetObjectCommand({
          Bucket: this.r2Bucket,
          Key: file.storageKey,
          ResponseContentDisposition: `attachment; filename="${encodeURIComponent(file.name)}"`,
        });
        downloadUrl = await getSignedUrl(this.r2Client, command, { expiresIn: 900 });
      } else {
        throw new BadRequestException(`Nhà cung cấp lưu trữ '${provider}' không hợp lệ`);
      }
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof InternalServerErrorException) {
        throw err;
      }
      throw new InternalServerErrorException(`Không thể tạo presigned download URL: ${err?.message || err}`);
    }

    // Update access count and last accessed time
    file.accessCount = (file.accessCount || 0) + 1;
    file.lastAccessedAt = new Date();
    await this.fileRepository.save(file);

    return {
      downloadUrl,
      id: file.id,
      name: file.name,
      sizeBytes: Number(file.sizeBytes),
      mimeType: file.mimeType,
      storageProvider: provider,
    };
  }

  async getPresignedPreviewUrl(userId: string, fileId: string) {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, ownerId: userId, isTrash: false },
    });

    if (!file || file.type !== 'file' || !file.storageKey) {
      throw new NotFoundException('Tệp tin không tồn tại hoặc đã bị chuyển vào thùng rác');
    }

    let previewUrl = '';
    const provider = file.storageProvider || this.defaultProvider;

    try {
      if (provider === 'google_cloud') {
        if (!this.gcsStorage) {
          throw new InternalServerErrorException('Google Cloud Storage chưa được cấu hình');
        }
        const [url] = await this.gcsStorage
          .bucket(this.gcsBucket)
          .file(file.storageKey)
          .getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000,
            responseDisposition: 'inline',
            responseType: file.mimeType || 'application/octet-stream',
          });
        previewUrl = url;
      } else if (provider === 'backblaze_b2') {
        if (!this.b2Client) {
          throw new InternalServerErrorException('Backblaze B2 chưa được cấu hình');
        }
        const command = new GetObjectCommand({
          Bucket: this.b2Bucket,
          Key: file.storageKey,
          ResponseContentDisposition: 'inline',
          ResponseContentType: file.mimeType || 'application/octet-stream',
        });
        previewUrl = await getSignedUrl(this.b2Client, command, { expiresIn: 900 });
      } else if (provider === 'cloudflare_r2') {
        if (!this.r2Client) {
          throw new InternalServerErrorException('Cloudflare R2 chưa được cấu hình');
        }
        const command = new GetObjectCommand({
          Bucket: this.r2Bucket,
          Key: file.storageKey,
          ResponseContentDisposition: 'inline',
          ResponseContentType: file.mimeType || 'application/octet-stream',
        });
        previewUrl = await getSignedUrl(this.r2Client, command, { expiresIn: 900 });
      } else {
        throw new BadRequestException(`Nhà cung cấp lưu trữ '${provider}' không hợp lệ`);
      }
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof InternalServerErrorException) {
        throw err;
      }
      throw new InternalServerErrorException(`Không thể tạo presigned preview URL: ${err?.message || err}`);
    }

    // Update access count and last accessed time for preview
    file.accessCount = (file.accessCount || 0) + 1;
    file.lastAccessedAt = new Date();
    await this.fileRepository.save(file);

    return {
      previewUrl,
      id: file.id,
      name: file.name,
      sizeBytes: Number(file.sizeBytes),
      mimeType: file.mimeType,
      storageProvider: provider,
    };
  }

  async getFileTextContent(userId: string, fileId: string) {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, ownerId: userId, isTrash: false },
    });

    if (!file || file.type !== 'file') {
      throw new NotFoundException('Tệp tin không tồn tại hoặc đã bị xóa');
    }

    if (Number(file.sizeBytes) > 2 * 1024 * 1024) {
      throw new BadRequestException('Tệp có dung lượng quá lớn (>2MB), vui lòng tải về để xem');
    }

    try {
      const previewInfo = await this.getPresignedPreviewUrl(userId, fileId);
      const response = await fetch(previewInfo.previewUrl);
      if (!response.ok) {
        return {
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          sizeBytes: Number(file.sizeBytes),
          content: `// Không thể tải trực tiếp nội dung tệp. Vui lòng tải xuống tệp để xem.`,
        };
      }

      const content = await response.text();
      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
        content,
      };
    } catch {
      return {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
        content: `// Lỗi khi đọc nội dung tệp tin. Vui lòng thử tải xuống tệp.`,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Chunked / Resumable Upload (GCS native resumable upload)
  // Luồng: initChunkedGcsUpload → uploadChunkToGcs (lặp N lần) → completeChunkedGcsUpload
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Khởi tạo GCS Resumable Upload Session.
   * Trả về resumableUrl (GCS session URI) để client PUT từng chunk trực tiếp lên GCS.
   * storageKey được tạo sẵn để gắn với userId → đảm bảo chỉ owner mới hoàn tất upload.
   */
  async initChunkedGcsUpload(
    userId: string,
    name: string,
    totalSizeBytes: number,
    mimeType: string,
    origin?: string,
    chunkSize = 10 * 1024 * 1024, // 10MB default
  ) {
    if (!this.gcsStorage || !this.gcsBucket) {
      throw new InternalServerErrorException('GCS chưa được cấu hình — không thể dùng chunked upload');
    }

    const sanitizedFilename = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uploadId = randomUUID().replace(/-/g, '');
    const storageKey = `chunks/${userId}/${uploadId}_${sanitizedFilename}`;
    const totalChunks = Math.ceil(totalSizeBytes / chunkSize);

    // Khởi tạo GCS Resumable Upload Session → nhận session URI
    const file = this.gcsStorage.bucket(this.gcsBucket).file(storageKey);
    const [resumableUrl] = await file.createResumableUpload({
      origin: origin || 'http://localhost:5173', // Bắt buộc phải có origin chính xác để GCS áp dụng CORS policy
      metadata: {
        contentType: mimeType || 'application/octet-stream',
        metadata: {
          uploadId,
          userId,     // Gắn userId vào GCS object metadata → verify khi complete
          originalName: name,
        },
      },
    });

    return {
      uploadId,
      resumableUrl,  // Client dùng URL này để PUT chunk
      storageKey,
      chunkSize,
      totalChunks,
      totalSizeBytes,
      status: 'INITIATED',
    };
  }

  /**
   * Hoàn tất chunked upload: verify userId trong GCS metadata → tạo FileItem DB record.
   * Quan trọng: kiểm tra userId trong GCS object metadata để ngăn upload vào tài khoản khác.
   */
  async completeChunkedGcsUpload(
    userId: string,
    storageKey: string,
    name: string,
    sizeBytes: number,
    mimeType: string,
    parentId?: string,
  ) {
    if (!this.gcsStorage || !this.gcsBucket) {
      throw new InternalServerErrorException('GCS chưa được cấu hình');
    }

    // ── Bước 1: Kiểm tra GCS metadata — userId phải khớp ──
    const file = this.gcsStorage.bucket(this.gcsBucket).file(storageKey);
    let metadata: any;
    try {
      [metadata] = await file.getMetadata();
    } catch {
      throw new NotFoundException('File upload chưa tồn tại hoặc đã bị xóa trên cloud');
    }

    const embeddedUserId = metadata?.metadata?.userId;
    if (embeddedUserId && embeddedUserId !== userId) {
      throw new BadRequestException('Không thể hoàn tất upload: tài khoản không khớp với session');
    }

    // ── Bước 2: Kiểm tra quota ──
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Người dùng không tồn tại');

    const currentUsed = Number(user.storageUsedBytes) || 0;
    const limit = Number(user.storageLimitBytes) || 2147483648;
    if (currentUsed + sizeBytes > limit) {
      // Xóa file tạm trên GCS để không lãng phí storage
      await file.delete({ ignoreNotFound: true });
      throw new BadRequestException('Dung lượng bộ nhớ không đủ để hoàn tất upload');
    }

    // ── Bước 3: Resolve parentPath ──
    let parentPath = '/';
    if (parentId) {
      const parentFolder = await this.fileRepository.findOne({
        where: { id: parentId, ownerId: userId, isTrash: false, type: 'folder' },
      });
      if (!parentFolder) throw new NotFoundException('Thư mục cha không tồn tại');
      parentPath = (parentFolder.path || '/') + parentFolder.id + '/';
    }

    // ── Bước 4: Xử lý trùng tên (giống confirmUpload) ──
    const suspiciousExts = ['.exe', '.bat', '.vbs', '.sh', '.cmd', '.scr', '.msi', '.jar', '.ps1', '.dll'];
    const isSuspicious = suspiciousExts.some((ext) => name.toLowerCase().endsWith(ext));

    let finalName = name;
    const lastDotIndex = name.lastIndexOf('.');
    const baseName = lastDotIndex > 0 ? name.substring(0, lastDotIndex) : name;
    const ext = lastDotIndex > 0 ? name.substring(lastDotIndex) : '';
    let counter = 1;
    while (true) {
      const existing = await this.fileRepository.findOne({
        where: { name: finalName, parentId: parentId || (null as any), ownerId: userId, isTrash: false, type: 'file' },
      });
      if (!existing) break;
      finalName = `${baseName}(${counter})${ext}`;
      counter++;
    }

    // ── Bước 5: Tạo FileItem record ──
    const newFile = this.fileRepository.create({
      name: finalName,
      type: 'file',
      mimeType: mimeType || 'application/octet-stream',
      sizeBytes,
      storageProvider: 'google_cloud',
      storageKey,
      parentId: parentId || null,
      path: parentPath,
      ownerId: userId,
      isStarred: false,
      isSpam: isSuspicious,
      suspiciousReason: isSuspicious ? 'Phát hiện tệp thực thi nghi ngờ (Chunk Upload)' : undefined,
      isTrash: false,
    });
    const savedFile = await this.fileRepository.save(newFile);

    // Activity log
    await this.activityLogRepository.save(
      this.activityLogRepository.create({
        userId,
        fileId: savedFile.id,
        action: 'UPLOAD_FILE',
        details: { fileName: finalName, sizeBytes, method: 'chunked' },
      }),
    );

    // Cập nhật quota
    await this.userRepository.query(
      `UPDATE users SET storage_used_bytes = storage_used_bytes + $1 WHERE id = $2`,
      [sizeBytes, userId],
    );

    const updatedUser = await this.userRepository.findOne({ where: { id: userId } });

    return {
      file: savedFile,
      originalName: name,
      finalName,
      renamed: finalName !== name,
      storageInfo: {
        usedBytes: Number(updatedUser?.storageUsedBytes || 0),
        limitBytes: Number(updatedUser?.storageLimitBytes || 2147483648),
      },
    };
  }

  async deletePhysicalFile(storageProvider: string, storageKey: string): Promise<boolean> {
    if (!storageKey) return false;

    const provider = storageProvider || this.defaultProvider;

    try {
      if (provider === 'google_cloud' && this.gcsStorage) {
        await this.gcsStorage.bucket(this.gcsBucket).file(storageKey).delete({ ignoreNotFound: true });
        return true;
      } else if (provider === 'backblaze_b2' && this.b2Client) {
        const command = new DeleteObjectCommand({ Bucket: this.b2Bucket, Key: storageKey });
        await this.b2Client.send(command);
        return true;
      } else if (provider === 'cloudflare_r2' && this.r2Client) {
        const command = new DeleteObjectCommand({ Bucket: this.r2Bucket, Key: storageKey });
        await this.r2Client.send(command);
        return true;
      }
    } catch (error) {
      console.error(`Lỗi khi xóa file vật lý trên cloud (${provider} - ${storageKey}):`, error);
      return false;
    }
    return false;
  }

  async uploadProxy(
    userId: string,
    file: Express.Multer.File,
    parentId?: string,
    targetProvider?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn tệp để tải lên');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const fileSize = BigInt(file.size);
    const currentUsed = BigInt(user.storageUsedBytes || '0');
    const limit = BigInt(user.storageLimitBytes || '2147483648');

    if (currentUsed + fileSize > limit) {
      throw new BadRequestException('Dung lượng lưu trữ của bạn đã vượt quá giới hạn (Quota Exceeded)');
    }

    let parentPath = '';
    let validParentId: string | null = null;
    if (parentId && parentId !== 'undefined' && parentId !== 'null' && parentId.trim() !== '') {
      const parentFolder = await this.fileRepository.findOne({ where: { id: parentId, ownerId: userId, type: 'folder' } });
      if (parentFolder) {
        validParentId = parentFolder.id;
        parentPath = parentFolder.path ? `${parentFolder.path}/${parentFolder.id}` : `/${parentFolder.id}`;
      }
    }

    // Áp dụng cùng rule Free/Premium như getPresignedUploadUrl()
    const isPremiumProxy = Number(user.storageLimitBytes) > 2147483648 || user.role === 'ADMIN';

    if (!targetProvider) {
      targetProvider = isPremiumProxy ? (this.defaultProvider || 'google_cloud') : 'google_cloud';
    }

    // Ngăn Free user cố tình chỉ định R2/B2
    if (!isPremiumProxy && targetProvider !== 'google_cloud') {
      targetProvider = 'google_cloud';
    }

    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const sanitizedFilename = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `uploads/${userId}/${randomUUID()}_${sanitizedFilename}`;

    let uploaded = false;

    // 1. GCS
    if (targetProvider === 'google_cloud' && this.gcsStorage) {
      try {
        await this.gcsStorage.bucket(this.gcsBucket).file(storageKey).save(file.buffer, {
          contentType: file.mimetype || 'application/octet-stream',
          resumable: false,
        });
        uploaded = true;
      } catch (gcsErr) {
        if (!isPremiumProxy) {
          // Free tier: GCS lỗi → KHÔNG fallback sang R2/B2
          throw new InternalServerErrorException(
            'Dịch vụ lưu trữ tạm thời gặp sự cố. Vui lòng thử lại sau.',
          );
        }
        // Premium tier: Cho phép fallback
        console.warn('[Storage] Proxy GCS upload failed (Premium user), falling back to Cloudflare R2 / B2:', gcsErr);
        targetProvider = this.r2Client ? 'cloudflare_r2' : 'backblaze_b2';
      }
    }

    // 2. Cloudflare R2
    if (!uploaded && targetProvider === 'cloudflare_r2' && this.r2Client) {
      try {
        await this.r2Client.send(new PutObjectCommand({
          Bucket: this.r2Bucket,
          Key: storageKey,
          Body: file.buffer,
          ContentType: file.mimetype || 'application/octet-stream',
        }));
        uploaded = true;
      } catch (r2Err) {
        console.warn('Proxy R2 upload failed, falling back to Backblaze B2:', r2Err);
        targetProvider = 'backblaze_b2';
      }
    }

    // 3. Backblaze B2
    if (!uploaded && this.b2Client) {
      try {
        await this.b2Client.send(new PutObjectCommand({
          Bucket: this.b2Bucket,
          Key: storageKey,
          Body: file.buffer,
          ContentType: file.mimetype || 'application/octet-stream',
        }));
        uploaded = true;
        targetProvider = 'backblaze_b2';
      } catch (b2Err) {
        console.error('Proxy B2 upload failed:', b2Err);
      }
    }

    if (!uploaded) {
      throw new InternalServerErrorException('Tải tệp lên Cloud thất bại ở tất cả nhà cung cấp');
    }

    let finalName = originalName;
    let baseName = originalName;
    let ext = '';
    
    const lastDotIndex = originalName.lastIndexOf('.');
    if (lastDotIndex > 0) {
      baseName = originalName.substring(0, lastDotIndex);
      ext = originalName.substring(lastDotIndex);
    }
    
    let counter = 1;
    while (true) {
      const existingFile = await this.fileRepository.findOne({
        where: {
          name: finalName,
          parentId: validParentId || (null as any),
          ownerId: userId,
          isTrash: false,
          type: 'file',
        },
      });

      if (!existingFile) break;

      finalName = `${baseName}(${counter})${ext}`;
      counter++;
    }

    const fileItem = this.fileRepository.create({
      name: finalName,
      sizeBytes: Number(file.size),
      mimeType: file.mimetype || 'application/octet-stream',
      type: 'file',
      parentId: validParentId,
      ownerId: userId,
      storageProvider: targetProvider,
      storageKey,
      path: parentPath,
      storageTier: 'HOT',
    });

    const savedFile = await this.fileRepository.save(fileItem);

    user.storageUsedBytes = Number(currentUsed + fileSize);
    await this.userRepository.save(user);

    return {
      message: 'Tải tệp lên thành công',
      file: savedFile,
      userStorageUsed: user.storageUsedBytes,
    };
  }
}
