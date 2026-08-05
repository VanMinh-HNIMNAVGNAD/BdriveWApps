import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { randomUUID } from 'crypto';
const archiver = require('archiver');
import { FileItem } from '../entities/file-item.entity';
import { FileShare } from '../entities/file-share.entity';
import { StorageService } from '../storage/storage.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameItemDto } from './dto/rename-item.dto';
import { GetFilesQueryDto } from './dto/get-files-query.dto';
import { MoveItemDto } from './dto/move-item.dto';
import { CopyItemDto } from './dto/copy-item.dto';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { AddShareAccessDto } from './dto/add-share-access.dto';

import { User } from '../entities/user.entity';
import { ActivityLog } from '../entities/activity-log.entity';
import { FileVersion } from '../entities/file-version.entity';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(FileItem)
    private fileRepository: Repository<FileItem>,
    @InjectRepository(FileShare)
    private fileShareRepository: Repository<FileShare>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(ActivityLog)
    private activityLogRepository: Repository<ActivityLog>,
    @InjectRepository(FileVersion)
    private fileVersionRepository: Repository<FileVersion>,
    private storageService: StorageService,
  ) { }

  async createFolder(userId: string, dto: CreateFolderDto) {
    let parentPath = '/';
    let parentFolder: FileItem | null = null;

    if (dto.parentId) {
      parentFolder = await this.fileRepository.findOne({
        where: { id: dto.parentId, ownerId: userId, isTrash: false, type: 'folder' },
      });

      if (!parentFolder) {
        throw new NotFoundException('Thư mục cha không tồn tại hoặc đã bị xóa');
      }

      parentPath = (parentFolder.path || '/') + parentFolder.id + '/';
    }

    // Auto-rename if folder name already exists in parent
    let folderName = dto.name.trim();
    let counter = 1;
    while (
      await this.fileRepository.findOne({
        where: {
          name: folderName,
          parentId: dto.parentId || (null as any),
          ownerId: userId,
          isTrash: false,
          type: 'folder',
        },
      })
    ) {
      folderName = `${dto.name.trim()} (${counter})`;
      counter++;
    }

    const newFolder = this.fileRepository.create({
      name: folderName,
      type: 'folder',
      parentId: dto.parentId || null,
      path: parentPath,
      ownerId: userId,
      sizeBytes: 0,
      isStarred: false,
      isSpam: false,
      isTrash: false,
    });

    await this.fileRepository.save(newFolder);
    return newFolder;
  }

  async getFilesAndFolders(userId: string, query: GetFilesQueryDto) {
    const { folderId, tab = 'my-drive', search, filterType, filterDate, filterSender, page = 1, limit = 50 } = query;
    const isValidFolderId = folderId && folderId !== 'undefined' && folderId !== 'null' && folderId.trim() !== '';
    const qb = this.fileRepository.createQueryBuilder('file');

    if (tab === 'shared-with-me') {
      qb.innerJoin('file_shares', 'fs', 'fs.file_id = file.id')
        .where('fs.shared_with_user_id = :userId', { userId })
        .andWhere('file.isTrash = false')
        .distinct(true);
    } else if (tab === 'shared-drives') {
      qb.where('file.ownerId = :userId', { userId })
        .innerJoin('file_shares', 'fs', 'fs.file_id = file.id')
        .andWhere('file.isTrash = false')
        .distinct(true);
    } else {
      qb.where('file.ownerId = :userId', { userId });

      if (tab === 'my-drive') {
        qb.andWhere('file.isTrash = false')
          .andWhere('file.isSpam = false');

        if (isValidFolderId) {
          qb.andWhere('file.parentId = :folderId', { folderId });
        } else {
          qb.andWhere('file.parentId IS NULL');
        }
      } else if (tab === 'starred') {
        qb.andWhere('file.isTrash = false')
          .andWhere('file.isSpam = false')
          .andWhere('file.isStarred = true');
      } else if (tab === 'trash') {
        qb.andWhere('file.isTrash = true');
      } else if (tab === 'spam') {
        qb.andWhere('file.isSpam = true')
          .andWhere('file.isTrash = false');
      } else if (tab === 'recent') {
        qb.andWhere('file.isTrash = false')
          .andWhere('file.isSpam = false')
          .andWhere('file.accessCount > 0')
          .orderBy('file.lastAccessedAt', 'DESC');
      }
    }

    if (search && search.trim()) {
      qb.andWhere('LOWER(file.name) LIKE LOWER(:search)', { search: `%${search.trim()}%` });
    }

    if (filterType && filterType !== 'all') {
      if (filterType === 'folder') {
        qb.andWhere('file.type = :type', { type: 'folder' });
      } else if (filterType === 'file') {
        qb.andWhere('file.type = :type', { type: 'file' });
      } else if (filterType === 'image') {
        qb.andWhere("(file.mimeType LIKE 'image/%' OR file.name ILIKE '%.png' OR file.name ILIKE '%.jpg' OR file.name ILIKE '%.jpeg' OR file.name ILIKE '%.svg' OR file.name ILIKE '%.webp')");
      } else if (filterType === 'video') {
        qb.andWhere("(file.mimeType LIKE 'video/%' OR file.name ILIKE '%.mp4' OR file.name ILIKE '%.mkv' OR file.name ILIKE '%.avi' OR file.name ILIKE '%.mov')");
      } else if (filterType === 'audio') {
        qb.andWhere("(file.mimeType LIKE 'audio/%' OR file.name ILIKE '%.mp3' OR file.name ILIKE '%.wav' OR file.name ILIKE '%.aac' OR file.name ILIKE '%.flac')");
      } else if (filterType === 'pdf' || filterType === 'document') {
        qb.andWhere("(file.mimeType LIKE '%pdf%' OR file.mimeType LIKE '%word%' OR file.name ILIKE '%.pdf' OR file.name ILIKE '%.docx' OR file.name ILIKE '%.doc' OR file.name ILIKE '%.txt' OR file.name ILIKE '%.md')");
      } else if (filterType === 'spreadsheet') {
        qb.andWhere("(file.mimeType LIKE '%spreadsheet%' OR file.mimeType LIKE '%excel%' OR file.name ILIKE '%.xlsx' OR file.name ILIKE '%.xls' OR file.name ILIKE '%.csv')");
      } else if (filterType === 'presentation') {
        qb.andWhere("(file.mimeType LIKE '%presentation%' OR file.name ILIKE '%.pptx' OR file.name ILIKE '%.ppt')");
      } else if (filterType === 'code') {
        qb.andWhere("(file.name ILIKE '%.js' OR file.name ILIKE '%.ts' OR file.name ILIKE '%.jsx' OR file.name ILIKE '%.tsx' OR file.name ILIKE '%.py' OR file.name ILIKE '%.sql' OR file.name ILIKE '%.json' OR file.name ILIKE '%.html' OR file.name ILIKE '%.css')");
      } else if (filterType === 'archive') {
        qb.andWhere("(file.name ILIKE '%.zip' OR file.name ILIKE '%.rar' OR file.name ILIKE '%.7z' OR file.name ILIKE '%.tar' OR file.name ILIKE '%.gz' OR file.name ILIKE '%.exe')");
      }
    }

    if (filterDate && filterDate !== 'all') {
      const now = new Date();
      if (filterDate === 'today') {
        now.setHours(0, 0, 0, 0);
        qb.andWhere('file.updatedAt >= :startDate', { startDate: now });
      } else if (filterDate === '7days') {
        now.setDate(now.getDate() - 7);
        qb.andWhere('file.updatedAt >= :startDate', { startDate: now });
      } else if (filterDate === '30days') {
        now.setDate(now.getDate() - 30);
        qb.andWhere('file.updatedAt >= :startDate', { startDate: now });
      } else if (filterDate === 'this-year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        qb.andWhere('file.updatedAt >= :startDate', { startDate: startOfYear });
      }
    }

    if (filterSender && filterSender !== 'all') {
      if (filterSender === 'me') {
        qb.andWhere('file.ownerId = :userId', { userId });
      } else if (filterSender === 'others') {
        qb.andWhere('file.ownerId != :userId', { userId });
      }
    }

    qb.orderBy('file.type', 'ASC'); // Folders first
    qb.addOrderBy('file.createdAt', 'DESC');

    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Compute Breadcrumb
    const breadcrumb: { id: string | null; name: string }[] = [{ id: null, name: 'Driver của tôi' }];
    if (isValidFolderId && tab === 'my-drive') {
      const currentFolder = await this.fileRepository.findOne({ where: { id: folderId, ownerId: userId } });
      if (currentFolder) {
        // Update access count and last accessed time for folder
        currentFolder.accessCount = (currentFolder.accessCount || 0) + 1;
        currentFolder.lastAccessedAt = new Date();
        await this.fileRepository.save(currentFolder);

        if (currentFolder.path) {
          const parentIds = currentFolder.path.split('/').filter(Boolean);
          for (const pid of parentIds) {
            const pFolder = await this.fileRepository.findOne({ where: { id: pid, ownerId: userId } });
            if (pFolder) {
              breadcrumb.push({ id: pFolder.id, name: pFolder.name });
            }
          }
        }
        breadcrumb.push({ id: currentFolder.id, name: currentFolder.name });
      }
    }

    return {
      items,
      breadcrumb,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async renameItem(userId: string, fileId: string, dto: RenameItemDto) {
    const item = await this.fileRepository.findOne({ where: { id: fileId, ownerId: userId } });
    if (!item) {
      throw new NotFoundException('Tệp hoặc thư mục không tồn tại');
    }

    item.name = dto.name.trim();
    await this.fileRepository.save(item);
    return item;
  }

  async toggleStar(userId: string, fileId: string) {
    const item = await this.fileRepository.findOne({ where: { id: fileId, ownerId: userId } });
    if (!item) {
      throw new NotFoundException('Tệp hoặc thư mục không tồn tại');
    }

    item.isStarred = !item.isStarred;
    await this.fileRepository.save(item);
    return { id: item.id, isStarred: item.isStarred };
  }

  async moveToTrash(userId: string, fileId: string) {
    const item = await this.fileRepository.findOne({ where: { id: fileId, ownerId: userId } });
    if (!item) {
      throw new NotFoundException('Tệp hoặc thư mục không tồn tại');
    }

    const pathPattern = `${item.path || '/'}${item.id}/%`;

    // Recursive soft delete for item and all its descendants
    await this.fileRepository.query(
      `UPDATE files 
       SET is_trash = true, deleted_at = NOW() 
       WHERE owner_id = $1 AND (id = $2 OR path LIKE $3)`,
      [userId, fileId, pathPattern],
    );

    return { message: 'Đã chuyển vào thùng rác thành công', id: fileId };
  }

  async restoreFromTrash(userId: string, fileId: string) {
    const item = await this.fileRepository.findOne({ where: { id: fileId, ownerId: userId } });
    if (!item) {
      throw new NotFoundException('Tệp hoặc thư mục không tồn tại');
    }

    const pathPattern = `${item.path || '/'}${item.id}/%`;

    // Recursive restore
    await this.fileRepository.query(
      `UPDATE files 
       SET is_trash = false, deleted_at = NULL 
       WHERE owner_id = $1 AND (id = $2 OR path LIKE $3)`,
      [userId, fileId, pathPattern],
    );

    return { message: 'Khôi phục thành công', id: fileId };
  }

  async deletePermanently(userId: string, fileId: string) {
    const item = await this.fileRepository.findOne({ where: { id: fileId, ownerId: userId } });
    if (!item) {
      throw new NotFoundException('Tệp hoặc thư mục không tồn tại');
    }

    const pathPattern = `${item.path || '/'}${item.id}/%`;

    // Fetch item and all child items to be deleted
    const itemsToDelete = await this.fileRepository
      .createQueryBuilder('file')
      .where('file.ownerId = :userId', { userId })
      .andWhere('(file.id = :fileId OR file.path LIKE :pathPattern)', { fileId, pathPattern })
      .getMany();

    let freedBytes = 0;

    for (const fileItem of itemsToDelete) {
      if (fileItem.type === 'file' && fileItem.storageKey) {
        await this.storageService.deletePhysicalFile(fileItem.storageProvider, fileItem.storageKey);
        const size = Number(fileItem.sizeBytes);
        freedBytes += isNaN(size) ? 0 : size;
      }
    }

    // Recursive hard delete from DB
    await this.fileRepository.query(
      `DELETE FROM files WHERE owner_id = $1 AND (id = $2 OR path LIKE $3)`,
      [userId, fileId, pathPattern],
    );

    // Reclaim storage quota for user
    if (freedBytes > 0) {
      await this.fileRepository.query(
        `UPDATE users SET storage_used_bytes = GREATEST(0, storage_used_bytes - $1) WHERE id = $2`,
        [freedBytes, userId],
      );
    }

    return { message: 'Đã xóa vĩnh viễn thành công', id: fileId, freedBytes };
  }

  async emptyTrash(userId: string) {
    const itemsInTrash = await this.fileRepository.find({
      where: { ownerId: userId, isTrash: true },
    });

    if (itemsInTrash.length === 0) {
      return { message: 'Thùng rác đã trống', deletedCount: 0, freedBytes: 0 };
    }

    let freedBytes = 0;
    for (const item of itemsInTrash) {
      if (item.type === 'file' && item.storageKey) {
        await this.storageService.deletePhysicalFile(item.storageProvider, item.storageKey);
        const size = Number(item.sizeBytes);
        freedBytes += isNaN(size) ? 0 : size;
      }
    }

    await this.fileRepository.query(
      `DELETE FROM files WHERE owner_id = $1 AND is_trash = true`,
      [userId],
    );

    if (freedBytes > 0) {
      await this.fileRepository.query(
        `UPDATE users SET storage_used_bytes = GREATEST(0, storage_used_bytes - $1) WHERE id = $2`,
        [freedBytes, userId],
      );
    }

    return { message: 'Đã dọn sạch thùng rác thành công', deletedCount: itemsInTrash.length, freedBytes };
  }

  async moveItem(userId: string, fileId: string, dto: MoveItemDto) {
    const item = await this.fileRepository.findOne({ where: { id: fileId, ownerId: userId, isTrash: false } });
    if (!item) {
      throw new NotFoundException('Tệp hoặc thư mục không tồn tại');
    }

    let newParentPath = '/';
    let newParentId: string | null = null;

    if (dto.targetParentId) {
      if (dto.targetParentId === fileId) {
        throw new BadRequestException('Không thể di chuyển thư mục vào chính nó');
      }

      const targetParent = await this.fileRepository.findOne({
        where: { id: dto.targetParentId, ownerId: userId, isTrash: false, type: 'folder' },
      });

      if (!targetParent) {
        throw new NotFoundException('Thư mục đích không tồn tại');
      }

      if (item.type === 'folder') {
        const checkPath = (targetParent.path || '/') + targetParent.id + '/';
        const currentFolderPath = (item.path || '/') + item.id + '/';
        if (checkPath.startsWith(currentFolderPath)) {
          throw new BadRequestException('Không thể di chuyển thư mục vào thư mục con của chính nó');
        }
      }

      newParentId = targetParent.id;
      newParentPath = (targetParent.path || '/') + targetParent.id + '/';
    }

    const oldPathPrefix = (item.path || '/') + item.id + '/';
    const newPathPrefix = newParentPath + item.id + '/';

    item.parentId = newParentId;
    item.path = newParentPath;
    await this.fileRepository.save(item);

    if (item.type === 'folder') {
      await this.fileRepository.query(
        `UPDATE files 
         SET path = REPLACE(path, $1, $2) 
         WHERE owner_id = $3 AND (path LIKE $4 OR path = $5)`,
        [oldPathPrefix, newPathPrefix, userId, `${oldPathPrefix}%`, oldPathPrefix],
      );
    }

    return item;
  }

  async copyItem(userId: string, fileId: string, dto: CopyItemDto) {
    const item = await this.fileRepository.findOne({ where: { id: fileId, ownerId: userId, isTrash: false } });
    if (!item) {
      throw new NotFoundException('Tệp hoặc thư mục không tồn tại');
    }

    let targetParentPath = '/';
    let targetParentId: string | null = null;

    if (dto.targetParentId) {
      const targetParent = await this.fileRepository.findOne({
        where: { id: dto.targetParentId, ownerId: userId, isTrash: false, type: 'folder' },
      });
      if (!targetParent) {
        throw new NotFoundException('Thư mục đích không tồn tại');
      }
      targetParentId = targetParent.id;
      targetParentPath = (targetParent.path || '/') + targetParent.id + '/';
    }

    if (item.type === 'file') {
      const newFile = this.fileRepository.create({
        name: `${item.name} (Bản sao)`,
        type: 'file',
        mimeType: item.mimeType,
        sizeBytes: item.sizeBytes,
        storageProvider: item.storageProvider,
        storageKey: item.storageKey,
        parentId: targetParentId,
        path: targetParentPath,
        ownerId: userId,
        isStarred: false,
        isSpam: false,
        isTrash: false,
      });

      await this.fileRepository.save(newFile);

      await this.fileRepository.query(
        `UPDATE users SET storage_used_bytes = storage_used_bytes + $1 WHERE id = $2`,
        [item.sizeBytes, userId],
      );

      return newFile;
    }

    const newFolder = this.fileRepository.create({
      name: `${item.name} (Bản sao)`,
      type: 'folder',
      parentId: targetParentId,
      path: targetParentPath,
      ownerId: userId,
      sizeBytes: 0,
      isStarred: false,
      isSpam: false,
      isTrash: false,
    });
    await this.fileRepository.save(newFolder);

    return newFolder;
  }

  async createShareLink(userId: string, fileId: string, dto: CreateShareLinkDto) {
    const file = await this.fileRepository.findOne({ where: { id: fileId, ownerId: userId, isTrash: false } });
    if (!file) {
      throw new NotFoundException('Tệp tin hoặc thư mục không tồn tại');
    }

    const shareToken = randomUUID().replace(/-/g, '');
    let expiresAt: Date | undefined = undefined;
    if (dto.expiresInDays) {
      expiresAt = new Date(Date.now() + dto.expiresInDays * 86400 * 1000);
    }

    const share = this.fileShareRepository.create({
      fileId: file.id,
      shareToken,
      accessLevel: dto.accessLevel || 'PUBLIC',
      role: dto.role || 'VIEWER',
      expiresAt,
      passwordHash: dto.password ? dto.password : undefined,
      isDownloadAllowed: dto.isDownloadAllowed !== false,
      isPreviewOnly: dto.isPreviewOnly === true,
    });

    await this.fileShareRepository.save(share);

    // Record Activity Log
    const log = this.activityLogRepository.create({
      userId,
      fileId: file.id,
      action: 'SHARE_LINK_CREATED',
      details: { shareToken, accessLevel: share.accessLevel, expiresAt },
    });
    await this.activityLogRepository.save(log);

    return {
      shareToken: share.shareToken,
      shareUrl: `/api/v1/shares/${share.shareToken}`,
      accessLevel: share.accessLevel,
      role: share.role,
      expiresAt: share.expiresAt,
      hasPassword: !!share.passwordHash,
      isDownloadAllowed: share.isDownloadAllowed,
      isPreviewOnly: share.isPreviewOnly,
      file: {
        id: file.id,
        name: file.name,
        type: file.type,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
      },
    };
  }

  async getShareAccess(userId: string, fileId: string) {
    // Chỉ file owner hoặc có quyền admin (sau này) mới lấy được list. Ở đây tạm thời kiểm tra đơn giản:
    const file = await this.fileRepository.findOne({ where: { id: fileId, ownerId: userId }});
    if (!file) throw new NotFoundException('Không tìm thấy tệp hoặc không có quyền.');

    const shares = await this.fileShareRepository.find({
      where: { fileId },
      relations: ['sharedWithUser']
    });

    return shares.filter(s => s.sharedWithUserId).map(s => ({
      id: s.sharedWithUser.id,
      email: s.sharedWithUser.email,
      name: s.sharedWithUser.fullName,
      role: s.role,
      avatarUrl: s.sharedWithUser.avatarUrl,
    }));
  }

  async addShareAccess(userId: string, fileId: string, dto: AddShareAccessDto) {
    const file = await this.fileRepository.findOne({ where: { id: fileId, ownerId: userId }});
    if (!file) throw new NotFoundException('Không tìm thấy tệp hoặc không có quyền.');

    const targetUser = await this.userRepository.findOne({ where: { email: dto.email }});
    if (!targetUser) throw new NotFoundException('Không tìm thấy người dùng với email này.');

    let share = await this.fileShareRepository.findOne({ where: { fileId, sharedWithUserId: targetUser.id }});
    if (share) {
      share.role = dto.role;
    } else {
      share = this.fileShareRepository.create({
        fileId,
        sharedWithUserId: targetUser.id,
        role: dto.role,
        accessLevel: 'RESTRICTED',
      });
    }
    await this.fileShareRepository.save(share);
    return { success: true };
  }

  async removeShareAccess(userId: string, fileId: string, targetUserId: string) {
    const file = await this.fileRepository.findOne({ where: { id: fileId, ownerId: userId }});
    if (!file) throw new NotFoundException('Không tìm thấy tệp hoặc không có quyền.');

    const share = await this.fileShareRepository.findOne({ where: { fileId, sharedWithUserId: targetUserId }});
    if (share) {
      await this.fileShareRepository.remove(share);
    }
    return { success: true };
  }

  async getSharedItem(shareToken: string) {
    const share = await this.fileShareRepository.findOne({
      where: { shareToken },
      relations: ['file'],
    });

    if (!share || !share.file || share.file.isTrash) {
      throw new NotFoundException('Liên kết chia sẻ không tồn tại hoặc đã bị thu hồi');
    }

    if (share.expiresAt && new Date() > share.expiresAt) {
      throw new BadRequestException('Liên kết chia sẻ này đã hết hạn sử dụng');
    }

    return {
      shareToken: share.shareToken,
      accessLevel: share.accessLevel,
      role: share.role,
      expiresAt: share.expiresAt,
      hasPassword: !!share.passwordHash,
      isDownloadAllowed: share.isDownloadAllowed,
      isPreviewOnly: share.isPreviewOnly,
      file: {
        id: share.file.id,
        name: share.file.name,
        type: share.file.type,
        mimeType: share.file.mimeType,
        sizeBytes: Number(share.file.sizeBytes),
        storageProvider: share.file.storageProvider,
        createdAt: share.file.createdAt,
      },
    };
  }

  async getFileVersions(userId: string, fileId: string) {
    const file = await this.fileRepository.findOne({ where: { id: fileId, ownerId: userId } });
    if (!file) {
      throw new NotFoundException('Tệp tin không tồn tại');
    }

    const versions = await this.fileVersionRepository.find({
      where: { fileId },
      order: { versionNumber: 'DESC' },
    });

    return {
      currentVersion: {
        id: file.id,
        name: file.name,
        sizeBytes: Number(file.sizeBytes),
        mimeType: file.mimeType,
        updatedAt: file.updatedAt,
      },
      pastVersions: versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        sizeBytes: Number(v.sizeBytes),
        mimeType: v.mimeType,
        createdAt: v.createdAt,
      })),
    };
  }

  async getFileActivityLogs(userId: string, fileId?: string) {
    const qb = this.activityLogRepository.createQueryBuilder('log');
    qb.where('log.userId = :userId', { userId });

    if (fileId) {
      qb.andWhere('log.fileId = :fileId', { fileId });
    }

    qb.orderBy('log.createdAt', 'DESC').take(50);
    const logs = await qb.getMany();
    return logs;
  }

  async getStorageAnalytics(userId: string) {
    const user = await this.fileRepository.manager.query(
      `SELECT storage_used_bytes, storage_limit_bytes FROM users WHERE id = $1`,
      [userId],
    );

    const usedBytes = Number(user[0]?.storage_used_bytes || 0);
    const limitBytes = Number(user[0]?.storage_limit_bytes || 2147483648);

    const files = await this.fileRepository.find({
      where: { ownerId: userId, isTrash: false, type: 'file' },
    });

    let imagesBytes = 0;
    let videosBytes = 0;
    let docsBytes = 0;
    let audioBytes = 0;
    let othersBytes = 0;

    for (const f of files) {
      const bytes = Number(f.sizeBytes || 0);
      const mime = (f.mimeType || '').toLowerCase();

      if (mime.startsWith('image/')) {
        imagesBytes += bytes;
      } else if (mime.startsWith('video/')) {
        videosBytes += bytes;
      } else if (mime.startsWith('audio/')) {
        audioBytes += bytes;
      } else if (
        mime.includes('pdf') ||
        mime.includes('word') ||
        mime.includes('excel') ||
        mime.includes('powerpoint') ||
        mime.startsWith('text/')
      ) {
        docsBytes += bytes;
      } else {
        othersBytes += bytes;
      }
    }

    return {
      usedBytes,
      limitBytes,
      usedGB: (usedBytes / (1024 * 1024 * 1024)).toFixed(2),
      limitGB: (limitBytes / (1024 * 1024 * 1024)).toFixed(2),
      percentageUsed: Math.min(100, Number(((usedBytes / limitBytes) * 100).toFixed(1))),
      categories: {
        images: { bytes: imagesBytes, formatted: (imagesBytes / (1024 * 1024)).toFixed(2) + ' MB' },
        videos: { bytes: videosBytes, formatted: (videosBytes / (1024 * 1024)).toFixed(2) + ' MB' },
        documents: { bytes: docsBytes, formatted: (docsBytes / (1024 * 1024)).toFixed(2) + ' MB' },
        audio: { bytes: audioBytes, formatted: (audioBytes / (1024 * 1024)).toFixed(2) + ' MB' },
        others: { bytes: othersBytes, formatted: (othersBytes / (1024 * 1024)).toFixed(2) + ' MB' },
      },
    };
  }

  async downloadZip(userId: string, fileIds: string[], res: any) {
    if (!fileIds || fileIds.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất 1 tệp để nén ZIP');
    }

    const files = await this.fileRepository.find({
      where: { id: In(fileIds), ownerId: userId, isTrash: false, type: 'file' },
    });

    if (files.length === 0) {
      throw new NotFoundException('Không tìm thấy tệp tin hợp lệ để nén ZIP');
    }

    const zipArchive = archiver('zip', { zlib: { level: 9 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="driveR_download_${Date.now()}.zip"`);

    zipArchive.pipe(res);

    for (const file of files) {
      zipArchive.append(Buffer.from(`[driveR Storage File: ${file.name} - Size: ${file.sizeBytes} bytes]`), { name: file.name });
    }

    await zipArchive.finalize();
  }

  /**
   * Khởi tạo GCS resumable upload session.
   * Client nhận resumableUrl + storageKey để PUT chunk trực tiếp lên GCS.
   */
  async initChunkedUpload(
    userId: string,
    name: string,
    totalSizeBytes: number,
    mimeType = 'application/octet-stream',
    parentId?: string,
    origin?: string,
  ) {
    return this.storageService.initChunkedGcsUpload(userId, name, totalSizeBytes, mimeType, origin);
  }

  /**
   * uploadChunk — Không cần endpoint riêng.
   * Client PUT từng chunk trực tiếp lên GCS resumable URL (trả về từ initChunkedUpload).
   * Giữ phương thức này chỉ để backward compat với controller cũ.
   */
  async uploadChunk(uploadId: string, chunkIndex: number, totalChunks: number) {
    return {
      uploadId,
      chunkIndex,
      totalChunks,
      message: 'Chunk được gửi trực tiếp lên GCS — không cần qua endpoint này',
      status: 'DIRECT_TO_GCS',
    };
  }

  /**
   * Hoàn tất chunked upload: verify owner qua GCS metadata → tạo FileItem record.
   */
  async completeChunkedUpload(
    userId: string,
    storageKey: string,
    name: string,
    sizeBytes: number,
    mimeType = 'application/octet-stream',
    parentId?: string,
  ) {
    return this.storageService.completeChunkedGcsUpload(userId, storageKey, name, sizeBytes, mimeType, parentId);
  }

  /**
   * Tạo thư mục hàng loạt cho cây thư mục khi upload.
   * Cải thiện hiệu suất để frontend không gọi tuần tự n lần API.
   */
  async batchCreateFolders(userId: string, paths: string[], rootParentId?: string) {
    const sortedPaths = paths.sort((a, b) => a.split('/').length - b.split('/').length);
    const pathIdMap = new Map<string, string>();
    
    if (rootParentId) {
      pathIdMap.set('', rootParentId);
    }

    for (const path of sortedPaths) {
      const parts = path.split('/');
      const folderName = parts.pop();
      const parentPath = parts.join('/');
      
      const parentId = pathIdMap.get(parentPath) || rootParentId || null;
      
      let folder = await this.fileRepository.findOne({
        where: { name: folderName, parentId: parentId || (null as any), ownerId: userId, isTrash: false, type: 'folder' }
      });
      
      if (!folder) {
        let parentFolderDb: FileItem | null = null;
        if (parentId) {
          parentFolderDb = await this.fileRepository.findOne({ where: { id: parentId, type: 'folder' } });
        }
        const dbParentPath = parentFolderDb ? (parentFolderDb.path || '/') + parentFolderDb.id + '/' : '/';
        
        const newFolder = this.fileRepository.create({
          name: folderName,
          type: 'folder',
          parentId: parentId || null,
          path: dbParentPath,
          ownerId: userId,
        });
        folder = await this.fileRepository.save(newFolder);
      }
      
      pathIdMap.set(path, folder.id);
    }
    
    return Object.fromEntries(pathIdMap);
  }
}

