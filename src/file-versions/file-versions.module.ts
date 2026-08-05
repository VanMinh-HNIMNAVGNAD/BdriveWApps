import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileVersion } from '../entities/file-version.entity';
import { FileItem } from '../entities/file-item.entity';
import { FileVersionsService } from './file-versions.service';
import { FileVersionsController } from './file-versions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FileVersion, FileItem])],
  controllers: [FileVersionsController],
  providers: [FileVersionsService],
  exports: [FileVersionsService],
})
export class FileVersionsModule {}
