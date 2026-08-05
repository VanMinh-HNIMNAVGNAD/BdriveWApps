import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const { passwordHash, ...userWithoutPassword } = user;
    return {
      ...userWithoutPassword,
      storageInfo: {
        usedBytes: Number(user.storageUsedBytes || 0),
        limitBytes: Number(user.storageLimitBytes || 2147483648),
        usedGB: (Number(user.storageUsedBytes || 0) / (1024 * 1024 * 1024)).toFixed(2),
        limitGB: (Number(user.storageLimitBytes || 2147483648) / (1024 * 1024 * 1024)).toFixed(2),
        percentage: Math.min(100, Math.round((Number(user.storageUsedBytes || 0) / Number(user.storageLimitBytes || 2147483648)) * 100)),
      },
    };
  }

  async updateProfile(userId: string, fullName: string) {
    if (!fullName || fullName.trim().length < 2) {
      throw new BadRequestException('Tên hiển thị phải từ 2 ký tự trở lên');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    user.fullName = fullName.trim();
    await this.userRepository.save(user);

    const { passwordHash, ...userWithoutPassword } = user;
    return {
      message: 'Cập nhật hồ sơ thành công',
      user: {
        ...userWithoutPassword,
        storageInfo: {
          usedBytes: Number(user.storageUsedBytes || 0),
          limitBytes: Number(user.storageLimitBytes || 2147483648),
          usedGB: (Number(user.storageUsedBytes || 0) / (1024 * 1024 * 1024)).toFixed(2),
          limitGB: (Number(user.storageLimitBytes || 2147483648) / (1024 * 1024 * 1024)).toFixed(2),
          percentage: Math.min(100, Math.round((Number(user.storageUsedBytes || 0) / Number(user.storageLimitBytes || 2147483648)) * 100)),
        },
      },
    };
  }

  async updatePassword(userId: string, passwordData: { currentPassword?: string; newPassword?: string }) {
    const { currentPassword, newPassword } = passwordData;
    
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu mới phải từ 6 ký tự trở lên');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    if (user.provider !== 'local' && !user.passwordHash) {
      throw new BadRequestException('Tài khoản này được đăng nhập bằng ' + user.provider + ', không thể đổi mật khẩu.');
    }

    if (!currentPassword) {
      throw new BadRequestException('Vui lòng nhập mật khẩu hiện tại');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await this.userRepository.save(user);

    return { message: 'Đổi mật khẩu thành công' };
  }
  async recalculateQuota(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    // Tinh tong dung luong cac file cua user (khong tinh thu muc va file trong thung rac)
    // Thuc te, neu thung rac chu chua xoa cung thi no van chiem dung luong, 
    // nhung logic hien tai (file_items) co the luu ca file trong thung rac. 
    // Dung luong thuc te dang luu tren r2: ta chi quan tam den cac file (type = 'file').
    const result = await this.userRepository.query(
      `SELECT SUM(size_bytes) as total FROM files WHERE owner_id = $1 AND is_trash = false AND type = 'file' AND shared_drive_id IS NULL`,
      [userId]
    );

    const actualUsedBytes = Number(result[0]?.total || 0);

    user.storageUsedBytes = actualUsedBytes;
    await this.userRepository.save(user);

    return {
      message: 'Đồng bộ dung lượng thành công',
      storageUsedBytes: actualUsedBytes,
    };
  }
}
