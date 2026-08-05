import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from '../entities/tag.entity';
import { FileTag } from '../entities/file-tag.entity';
import { FileItem } from '../entities/file-item.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { AttachTagDto } from './dto/attach-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    @InjectRepository(FileTag)
    private fileTagRepository: Repository<FileTag>,
    @InjectRepository(FileItem)
    private fileRepository: Repository<FileItem>,
  ) {}

  async create(userId: string, dto: CreateTagDto) {
    const existing = await this.tagRepository.findOne({
      where: { userId, name: dto.name.trim() },
    });

    if (existing) {
      throw new ConflictException('Nhãn này đã tồn tại trong tài khoản của bạn');
    }

    const tag = this.tagRepository.create({
      userId,
      name: dto.name.trim(),
      colorHex: dto.colorHex || '#3B82F6',
    });

    await this.tagRepository.save(tag);
    return tag;
  }

  async findAllForUser(userId: string) {
    return this.tagRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async attachTag(userId: string, dto: AttachTagDto) {
    const tag = await this.tagRepository.findOne({ where: { id: dto.tagId, userId } });
    if (!tag) {
      throw new NotFoundException('Nhãn không tồn tại');
    }

    const file = await this.fileRepository.findOne({ where: { id: dto.fileId, ownerId: userId, isTrash: false } });
    if (!file) {
      throw new NotFoundException('Tệp tin không tồn tại');
    }

    const existingLink = await this.fileTagRepository.findOne({
      where: { tagId: dto.tagId, fileId: dto.fileId },
    });

    if (existingLink) {
      return existingLink;
    }

    const fileTag = this.fileTagRepository.create({
      tagId: dto.tagId,
      fileId: dto.fileId,
    });

    await this.fileTagRepository.save(fileTag);
    return fileTag;
  }

  async detachTag(userId: string, tagId: string, fileId: string) {
    const tag = await this.tagRepository.findOne({ where: { id: tagId, userId } });
    if (!tag) {
      throw new NotFoundException('Nhãn không tồn tại');
    }

    const link = await this.fileTagRepository.findOne({
      where: { tagId, fileId },
    });

    if (!link) {
      throw new NotFoundException('Tệp tin chưa được gán nhãn này');
    }

    await this.fileTagRepository.remove(link);
    return { message: 'Đã gỡ nhãn khỏi tệp tin', tagId, fileId };
  }

  async deleteTag(userId: string, tagId: string) {
    const tag = await this.tagRepository.findOne({ where: { id: tagId, userId } });
    if (!tag) {
      throw new NotFoundException('Nhãn không tồn tại');
    }

    await this.tagRepository.remove(tag);
    return { message: 'Đã xóa nhãn thành công', id: tagId };
  }
}
