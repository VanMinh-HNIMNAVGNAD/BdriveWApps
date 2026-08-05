import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { FileItem } from '../entities/file-item.entity';
import { FileShare } from '../entities/file-share.entity';
import { User } from '../entities/user.entity';
import { ActivityLog } from '../entities/activity-log.entity';
import { FileVersion } from '../entities/file-version.entity';
import { TrashCleanupCronService } from './services/trash-cleanup.cron';

import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([FileItem, FileShare, User, ActivityLog, FileVersion]), StorageModule],
  controllers: [FilesController],
  providers: [FilesService, TrashCleanupCronService],
  exports: [FilesService],
})
export class FilesModule {}
