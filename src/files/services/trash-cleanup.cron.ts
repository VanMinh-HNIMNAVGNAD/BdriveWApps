import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { FileItem } from '../../entities/file-item.entity';
import { User } from '../../entities/user.entity';
import { StorageService } from '../../storage/storage.service';

@Injectable()
export class TrashCleanupCronService {
  private readonly logger = new Logger(TrashCleanupCronService.name);

  constructor(
    @InjectRepository(FileItem)
    private fileRepository: Repository<FileItem>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private storageService: StorageService,
  ) {}

  // Run daily at midnight to purge trash items older than 30 days
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTrashAutoCleanup() {
    this.logger.log('🚀 Đang chạy CronJob quét và dọn dẹp Thùng rác (các tệp > 30 ngày)...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expiredItems = await this.fileRepository.find({
      where: {
        isTrash: true,
        deletedAt: LessThanOrEqual(thirtyDaysAgo),
      },
    });

    if (expiredItems.length === 0) {
      this.logger.log('✅ Không có tệp nào trong thùng rác vượt quá 30 ngày.');
    } else {
      this.logger.log(`🔍 Tìm thấy ${expiredItems.length} mục trong thùng rác cần xóa vĩnh viễn.`);

      const userFreedBytesMap = new Map<string, number>();

      for (const item of expiredItems) {
        if (item.type === 'file' && item.storageKey) {
          await this.storageService.deletePhysicalFile(item.storageProvider, item.storageKey);
          const currentFreed = userFreedBytesMap.get(item.ownerId) || 0;
          const size = Number(item.sizeBytes || 0);
          userFreedBytesMap.set(item.ownerId, currentFreed + (isNaN(size) ? 0 : size));
        }
        await this.fileRepository.remove(item);
      }

      for (const [userId, freedBytes] of userFreedBytesMap.entries()) {
        if (freedBytes > 0) {
          await this.fileRepository.query(
            `UPDATE users SET storage_used_bytes = GREATEST(0, storage_used_bytes - $1) WHERE id = $2`,
            [freedBytes, userId],
          );
        }
      }

      this.logger.log(`🎉 Đã dọn dẹp tự động thành công ${expiredItems.length} mục quá hạn trong thùng rác.`);
    }
  }

  // Run daily at 1:00 AM to process inactive accounts (> 60 days)
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleInactiveAccountHibernation() {
    this.logger.log('🚀 Đang quét các tài khoản không hoạt động quá 60 ngày...');

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const inactiveUsers = await this.userRepository.find({
      where: [
        { isHibernated: false, lastLoginAt: LessThanOrEqual(sixtyDaysAgo) },
        { isHibernated: false, lastLoginAt: undefined as any, createdAt: LessThanOrEqual(sixtyDaysAgo) },
      ],
    });

    if (inactiveUsers.length === 0) {
      this.logger.log('✅ Không phát hiện tài khoản nào cần đóng băng / bảo lưu.');
      return;
    }

    for (const user of inactiveUsers) {
      user.isHibernated = true;
      user.storageLimitBytes = user.storageUsedBytes; // Freeze unused quota
      await this.userRepository.save(user);

      // Transition user files to COLD Storage Tier (0% data loss)
      await this.fileRepository.query(
        `UPDATE files SET storage_tier = 'COLD' WHERE owner_id = $1`,
        [user.id],
      );

      this.logger.log(`🛡️ Tài khoản ${user.email} (ID: ${user.id}) đã được đưa vào chế độ Bảo lưu Cold Storage An toàn.`);
    }

    this.logger.log(`🎉 Đã bảo lưu an toàn ${inactiveUsers.length} tài khoản ngủ đông thành công.`);
  }
}
