import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemNotification } from '../entities/system-notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(SystemNotification)
    private notificationRepository: Repository<SystemNotification>,
  ) {}

  async findAllForUser(userId: string) {
    return this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new NotFoundException('Thông báo không tồn tại');
    }

    notification.isRead = true;
    await this.notificationRepository.save(notification);
    return notification;
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.update({ userId, isRead: false }, { isRead: true });
    return { message: 'Đã đánh dấu tất cả thông báo là đã đọc' };
  }

  async createSystemNotification(userId: string, title: string, message: string, type = 'INFO', linkUrl?: string) {
    const notification = this.notificationRepository.create({
      userId,
      title,
      message,
      type,
      linkUrl,
      isRead: false,
    });

    await this.notificationRepository.save(notification);
    return notification;
  }
}
