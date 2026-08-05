import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAllForUser(@GetUser() user: User) {
    return this.notificationsService.findAllForUser(user.id);
  }

  @Patch('read-all')
  async markAllAsRead(@GetUser() user: User) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  async markAsRead(@GetUser() user: User, @Param('id') id: string) {
    return this.notificationsService.markAsRead(user.id, id);
  }
}
