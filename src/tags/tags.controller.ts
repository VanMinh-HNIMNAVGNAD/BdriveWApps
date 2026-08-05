import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { AttachTagDto } from './dto/attach-tag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  async create(@GetUser() user: User, @Body() dto: CreateTagDto) {
    return this.tagsService.create(user.id, dto);
  }

  @Get()
  async findAllForUser(@GetUser() user: User) {
    return this.tagsService.findAllForUser(user.id);
  }

  @Post('attach')
  async attachTag(@GetUser() user: User, @Body() dto: AttachTagDto) {
    return this.tagsService.attachTag(user.id, dto);
  }

  @Delete(':tagId/file/:fileId')
  async detachTag(@GetUser() user: User, @Param('tagId') tagId: string, @Param('fileId') fileId: string) {
    return this.tagsService.detachTag(user.id, tagId, fileId);
  }

  @Delete(':id')
  async deleteTag(@GetUser() user: User, @Param('id') id: string) {
    return this.tagsService.deleteTag(user.id, id);
  }
}
