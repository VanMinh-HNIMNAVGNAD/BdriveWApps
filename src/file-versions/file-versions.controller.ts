import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { FileVersionsService } from './file-versions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/files')
export class FileVersionsController {
  constructor(private readonly fileVersionsService: FileVersionsService) {}

  @Get(':id/versions')
  async getVersionsForFile(@GetUser() user: User, @Param('id') id: string) {
    return this.fileVersionsService.getVersionsForFile(user.id, id);
  }

  @Post(':id/versions/restore/:versionId')
  async restoreVersion(
    @GetUser() user: User,
    @Param('id') fileId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.fileVersionsService.restoreVersion(user.id, fileId, versionId);
  }
}
