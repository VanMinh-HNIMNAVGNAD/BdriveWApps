import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SharedDrivesService } from './shared-drives.service';
import { CreateSharedDriveDto } from './dto/create-shared-drive.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/shared-drives')
export class SharedDrivesController {
  constructor(private readonly sharedDrivesService: SharedDrivesService) {}

  @Post()
  async create(@GetUser() user: User, @Body() dto: CreateSharedDriveDto) {
    return this.sharedDrivesService.create(user.id, dto);
  }

  @Get()
  async findAllForUser(@GetUser() user: User) {
    return this.sharedDrivesService.findAllForUser(user.id);
  }

  @Get(':id')
  async findOne(@GetUser() user: User, @Param('id') id: string) {
    return this.sharedDrivesService.findOne(user.id, id);
  }

  @Post(':id/members')
  async addMember(@GetUser() user: User, @Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.sharedDrivesService.addMember(user.id, id, dto);
  }

  @Delete(':id/members/:userId')
  async removeMember(@GetUser() user: User, @Param('id') id: string, @Param('userId') targetUserId: string) {
    return this.sharedDrivesService.removeMember(user.id, id, targetUserId);
  }
}
