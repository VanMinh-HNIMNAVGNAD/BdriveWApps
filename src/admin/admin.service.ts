import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getUsers(search?: string, page = 1, limit = 20) {
    const qb = this.userRepository.createQueryBuilder('user');

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      qb.where('LOWER(user.email) LIKE :term OR LOWER(user.fullName) LIKE :term', { term });
    }

    qb.orderBy('user.createdAt', 'DESC');

    const total = await qb.getCount();
    const rawUsers = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const users = rawUsers.map((u) => {
      const { passwordHash, ...rest } = u;
      return {
        ...rest,
        storageUsedBytes: Number(u.storageUsedBytes || 0),
        storageLimitBytes: Number(u.storageLimitBytes || 2147483648),
        usedGB: (Number(u.storageUsedBytes || 0) / (1024 * 1024 * 1024)).toFixed(2),
        limitGB: (Number(u.storageLimitBytes || 2147483648) / (1024 * 1024 * 1024)).toFixed(2),
        percentage: Math.min(100, Math.round((Number(u.storageUsedBytes || 0) / Number(u.storageLimitBytes || 2147483648)) * 100)),
      };
    });

    return {
      users,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async updateUserQuota(userId: string, storageLimitBytes: number) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    if (!storageLimitBytes || storageLimitBytes < 1048576) {
      throw new BadRequestException('Hạn mức bộ nhớ phải lớn hơn 1 MB');
    }

    user.storageLimitBytes = storageLimitBytes;
    await this.userRepository.save(user);

    return {
      message: 'Cập nhật hạn mức lưu trữ thành công',
      userId: user.id,
      storageLimitBytes: Number(user.storageLimitBytes),
      limitGB: (Number(user.storageLimitBytes) / (1024 * 1024 * 1024)).toFixed(2),
    };
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    user.isActive = isActive;
    await this.userRepository.save(user);

    return {
      message: isActive ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản',
      userId: user.id,
      isActive: user.isActive,
    };
  }

  async getSystemAnalytics() {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({ where: { isActive: true } });
    const superAdmins = await this.userRepository.count({ where: { role: 'SUPER_ADMIN' } });

    const stats = await this.userRepository.query(
      `SELECT SUM(storage_used_bytes) as total_used, SUM(storage_limit_bytes) as total_limit FROM users`,
    );

    const totalUsedBytes = Number(stats[0]?.total_used || 0);
    const totalLimitBytes = Number(stats[0]?.total_limit || 0);

    return {
      totalUsers,
      activeUsers,
      disabledUsers: totalUsers - activeUsers,
      superAdmins,
      storage: {
        totalUsedBytes,
        totalLimitBytes,
        usedGB: (totalUsedBytes / (1024 * 1024 * 1024)).toFixed(2),
        limitGB: (totalLimitBytes / (1024 * 1024 * 1024)).toFixed(2),
        percentage: totalLimitBytes > 0 ? Math.min(100, Math.round((totalUsedBytes / totalLimitBytes) * 100)) : 0,
      },
    };
  }
}
