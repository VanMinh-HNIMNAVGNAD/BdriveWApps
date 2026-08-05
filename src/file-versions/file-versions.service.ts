import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileVersion } from '../entities/file-version.entity';
import { FileItem } from '../entities/file-item.entity';

@Injectable()
export class FileVersionsService {
  constructor(
    @InjectRepository(FileVersion)
    private versionRepository: Repository<FileVersion>,
    @InjectRepository(FileItem)
    private fileRepository: Repository<FileItem>,
  ) {}

  async getVersionsForFile(userId: string, fileId: string) {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, ownerId: userId, isTrash: false },
    });

    if (!file) {
      throw new NotFoundException('Tệp tin không tồn tại');
    }

    return this.versionRepository.find({
      where: { fileId },
      order: { versionNumber: 'DESC' },
    });
  }

  async createVersionSnapshot(file: FileItem) {
    const latestVersion = await this.versionRepository.findOne({
      where: { fileId: file.id },
      order: { versionNumber: 'DESC' },
    });

    const nextVersionNumber = (latestVersion?.versionNumber || 0) + 1;

    const version = this.versionRepository.create({
      fileId: file.id,
      versionNumber: nextVersionNumber,
      storageKey: file.storageKey,
      storageProvider: file.storageProvider,
      sizeBytes: file.sizeBytes,
      mimeType: file.mimeType,
    });

    await this.versionRepository.save(version);
    return version;
  }

  async restoreVersion(userId: string, fileId: string, versionId: string) {
    const file = await this.fileRepository.findOne({
      where: { id: fileId, ownerId: userId, isTrash: false },
    });

    if (!file) {
      throw new NotFoundException('Tệp tin không tồn tại');
    }

    const version = await this.versionRepository.findOne({
      where: { id: versionId, fileId },
    });

    if (!version) {
      throw new NotFoundException('Phiên bản không tồn tại');
    }

    // Save current file state as a new version before rolling back
    await this.createVersionSnapshot(file);

    // Rollback file to selected version
    file.storageKey = version.storageKey;
    file.storageProvider = version.storageProvider;
    file.sizeBytes = version.sizeBytes;
    if (version.mimeType) {
      file.mimeType = version.mimeType;
    }

    await this.fileRepository.save(file);
    return file;
  }
}
