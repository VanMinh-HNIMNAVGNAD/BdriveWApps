import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, Res, Headers } from '@nestjs/common';
import type { Response } from 'express';
import { FilesService } from './files.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameItemDto } from './dto/rename-item.dto';
import { GetFilesQueryDto } from './dto/get-files-query.dto';
import { MoveItemDto } from './dto/move-item.dto';
import { CopyItemDto } from './dto/copy-item.dto';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { AddShareAccessDto } from './dto/add-share-access.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../entities/user.entity';

@Controller('api/v1')
export class FilesController {
  constructor(private readonly filesService: FilesService) { }

  @Get('shares/:token')
  async getSharedItem(@Param('token') token: string) {
    return this.filesService.getSharedItem(token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('folders')
  async createFolder(@GetUser() user: User, @Body() dto: CreateFolderDto) {
    return this.filesService.createFolder(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('files/analytics')
  async getStorageAnalytics(@GetUser() user: User) {
    return this.filesService.getStorageAnalytics(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('files')
  async getFilesAndFolders(@GetUser() user: User, @Query() query: GetFilesQueryDto) {
    return this.filesService.getFilesAndFolders(user.id, query);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('files/:id/rename')
  async renameItem(@GetUser() user: User, @Param('id') id: string, @Body() dto: RenameItemDto) {
    return this.filesService.renameItem(user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('files/:id/move')
  async moveItem(@GetUser() user: User, @Param('id') id: string, @Body() dto: MoveItemDto) {
    return this.filesService.moveItem(user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('files/:id/copy')
  async copyItem(@GetUser() user: User, @Param('id') id: string, @Body() dto: CopyItemDto) {
    return this.filesService.copyItem(user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('files/:id/share')
  async createShareLink(@GetUser() user: User, @Param('id') id: string, @Body() dto: CreateShareLinkDto) {
    return this.filesService.createShareLink(user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('files/:id/share-access')
  async getShareAccess(@GetUser() user: User, @Param('id') id: string) {
    return this.filesService.getShareAccess(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('files/:id/share-access')
  async addShareAccess(@GetUser() user: User, @Param('id') id: string, @Body() dto: AddShareAccessDto) {
    return this.filesService.addShareAccess(user.id, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('files/:id/share-access/:userId')
  async removeShareAccess(@GetUser() user: User, @Param('id') id: string, @Param('userId') targetUserId: string) {
    return this.filesService.removeShareAccess(user.id, id, targetUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('files/:id/star')
  async toggleStar(@GetUser() user: User, @Param('id') id: string) {
    return this.filesService.toggleStar(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('files/:id/trash')
  async moveToTrash(@GetUser() user: User, @Param('id') id: string) {
    return this.filesService.moveToTrash(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('files/:id/restore')
  async restoreFromTrash(@GetUser() user: User, @Param('id') id: string) {
    return this.filesService.restoreFromTrash(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('files/trash/empty')
  async emptyTrash(@GetUser() user: User) {
    return this.filesService.emptyTrash(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('files/:id/permanent')
  async deletePermanently(@GetUser() user: User, @Param('id') id: string) {
    return this.filesService.deletePermanently(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('files/download-zip')
  async downloadZip(@GetUser() user: User, @Body('fileIds') fileIds: string[], @Res() res: Response) {
    return this.filesService.downloadZip(user.id, fileIds, res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('files/folders/batch')
  async batchCreateFolders(
    @GetUser() user: User,
    @Body('paths') paths: string[],
    @Body('parentId') parentId?: string,
  ) {
    return this.filesService.batchCreateFolders(user.id, paths, parentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('files/upload-chunk/init')
  async initChunkedUpload(
    @GetUser() user: User,
    @Body('name') name: string,
    @Body('totalSizeBytes') totalSizeBytes: number,
    @Body('mimeType') mimeType?: string,
    @Body('parentId') parentId?: string,
    @Headers('origin') origin?: string,
  ) {
    return this.filesService.initChunkedUpload(user.id, name, totalSizeBytes, mimeType, parentId, origin);
  }

  @UseGuards(JwtAuthGuard)
  @Post('files/upload-chunk/upload')
  async uploadChunk(
    @Body('uploadId') uploadId: string,
    @Body('chunkIndex') chunkIndex: number,
    @Body('totalChunks') totalChunks: number,
  ) {
    return this.filesService.uploadChunk(uploadId, chunkIndex, totalChunks);
  }

  @UseGuards(JwtAuthGuard)
  @Post('files/upload-chunk/complete')
  async completeChunkedUpload(
    @GetUser() user: User,
    @Body('storageKey') storageKey: string,
    @Body('name') name: string,
    @Body('sizeBytes') sizeBytes: number,
    @Body('mimeType') mimeType?: string,
    @Body('parentId') parentId?: string,
  ) {
    return this.filesService.completeChunkedUpload(user.id, storageKey, name, sizeBytes, mimeType, parentId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('files/:id/versions')
  async getFileVersions(@GetUser() user: User, @Param('id') id: string) {
    return this.filesService.getFileVersions(user.id, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('files/activity-logs')
  async getActivityLogs(@GetUser() user: User) {
    return this.filesService.getFileActivityLogs(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('files/:id/activity-logs')
  async getFileActivityLogs(@GetUser() user: User, @Param('id') id: string) {
    return this.filesService.getFileActivityLogs(user.id, id);
  }
}
