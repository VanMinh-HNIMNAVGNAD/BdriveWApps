import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('api/v1/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@GetUser() user: User) {
    return this.usersService.getMe(user.id);
  }

  @Patch('me')
  async updateMe(@GetUser() user: User, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, updateProfileDto.fullName);
  }

  @Patch('me/profile')
  async updateProfile(@GetUser() user: User, @Body() updateProfileDto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, updateProfileDto.fullName);
  }

  @Patch('me/password')
  async updatePassword(
    @GetUser() user: User,
    @Body() passwordData: { currentPassword?: string; newPassword?: string },
  ) {
    return this.usersService.updatePassword(user.id, passwordData);
  }

  @Patch('me/recalculate-quota')
  async recalculateQuota(@GetUser() user: User) {
    return this.usersService.recalculateQuota(user.id);
  }
}
