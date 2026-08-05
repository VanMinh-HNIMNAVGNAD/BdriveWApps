import { Controller, Post, Get, Body, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@UseGuards(JwtAuthGuard)
@Controller('api/v1/files')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-url')
  async getPresignedUploadUrl(@GetUser() user: User, @Body() dto: GetUploadUrlDto) {
    return this.storageService.getPresignedUploadUrl(user.id, dto);
  }

  @Post('confirm-upload')
  async confirmUpload(@GetUser() user: User, @Body() dto: ConfirmUploadDto) {
    return this.storageService.confirmUpload(user.id, dto);
  }

  @Post('upload-proxy')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProxy(
    @GetUser() user: User,
    @UploadedFile() file: Express.Multer.File,
    @Body('parentId') parentId?: string,
    @Body('targetProvider') targetProvider?: string,
  ) {
    return this.storageService.uploadProxy(user.id, file, parentId, targetProvider);
  }

  @Get(':id/download-url')
  async getPresignedDownloadUrl(@GetUser() user: User, @Param('id') id: string) {
    return this.storageService.getPresignedDownloadUrl(user.id, id);
  }

  @Get(':id/preview-url')
  async getPresignedPreviewUrl(@GetUser() user: User, @Param('id') id: string) {
    return this.storageService.getPresignedPreviewUrl(user.id, id);
  }

  @Get(':id/content')
  async getFileTextContent(@GetUser() user: User, @Param('id') id: string) {
    return this.storageService.getFileTextContent(user.id, id);
  }
}
