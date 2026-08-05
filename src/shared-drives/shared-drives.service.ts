import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SharedDrive } from '../entities/shared-drive.entity';
import { SharedDriveMember } from '../entities/shared-drive-member.entity';
import { User } from '../entities/user.entity';
import { CreateSharedDriveDto } from './dto/create-shared-drive.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class SharedDrivesService {
  constructor(
    @InjectRepository(SharedDrive)
    private sharedDriveRepository: Repository<SharedDrive>,
    @InjectRepository(SharedDriveMember)
    private memberRepository: Repository<SharedDriveMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(userId: string, dto: CreateSharedDriveDto) {
    const drive = this.sharedDriveRepository.create({
      name: dto.name.trim(),
      description: dto.description?.trim(),
      createdBy: userId,
    });

    const savedDrive = await this.sharedDriveRepository.save(drive);

    // Add creator as ADMIN member
    const ownerMember = this.memberRepository.create({
      sharedDriveId: savedDrive.id,
      userId,
      role: 'ADMIN',
    });
    await this.memberRepository.save(ownerMember);

    return savedDrive;
  }

  async findAllForUser(userId: string) {
    const memberships = await this.memberRepository.find({
      where: { userId },
      relations: ['sharedDrive', 'sharedDrive.creator'],
    });

    return memberships.map((m) => ({
      ...m.sharedDrive,
      userRole: m.role,
      joinedAt: m.createdAt,
    }));
  }

  async findOne(userId: string, driveId: string) {
    const membership = await this.memberRepository.findOne({
      where: { sharedDriveId: driveId, userId },
      relations: ['sharedDrive'],
    });

    if (!membership) {
      throw new ForbiddenException('Bạn không có quyền truy cập Bộ nhớ chung này');
    }

    const members = await this.memberRepository.find({
      where: { sharedDriveId: driveId },
      relations: ['user'],
    });

    return {
      drive: membership.sharedDrive,
      userRole: membership.role,
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        user: {
          id: m.user.id,
          email: m.user.email,
          fullName: m.user.fullName,
        },
      })),
    };
  }

  async addMember(userId: string, driveId: string, dto: AddMemberDto) {
    const currentUserRole = await this.memberRepository.findOne({
      where: { sharedDriveId: driveId, userId },
    });

    if (!currentUserRole || currentUserRole.role !== 'ADMIN') {
      throw new ForbiddenException('Chỉ Quản trị viên của Bộ nhớ chung mới có quyền thêm thành viên');
    }

    const targetUser = await this.userRepository.findOne({ where: { id: dto.userId } });
    if (!targetUser) {
      throw new NotFoundException('Người dùng cần thêm không tồn tại');
    }

    const existingMember = await this.memberRepository.findOne({
      where: { sharedDriveId: driveId, userId: dto.userId },
    });

    if (existingMember) {
      throw new BadRequestException('Người dùng đã là thành viên của Bộ nhớ chung này');
    }

    const newMember = this.memberRepository.create({
      sharedDriveId: driveId,
      userId: dto.userId,
      role: dto.role || 'MEMBER',
    });

    await this.memberRepository.save(newMember);
    return newMember;
  }

  async removeMember(userId: string, driveId: string, targetUserId: string) {
    const currentUserRole = await this.memberRepository.findOne({
      where: { sharedDriveId: driveId, userId },
    });

    if (!currentUserRole || currentUserRole.role !== 'ADMIN') {
      throw new ForbiddenException('Chỉ Quản trị viên mới có quyền xóa thành viên');
    }

    const targetMember = await this.memberRepository.findOne({
      where: { sharedDriveId: driveId, userId: targetUserId },
    });

    if (!targetMember) {
      throw new NotFoundException('Thành viên không tồn tại trong Bộ nhớ chung');
    }

    await this.memberRepository.remove(targetMember);
    return { message: 'Đã xóa thành viên khỏi Bộ nhớ chung', userId: targetUserId };
  }
}
