import { IsOptional, IsString, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetFilesQueryDto {
  @IsOptional()
  @IsString()
  folderId?: string;

  @IsOptional()
  @IsIn(['my-drive', 'starred', 'trash', 'spam', 'recent', 'shared-with-me', 'shared-drives'])
  tab?: string = 'my-drive';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  filterType?: string;

  @IsOptional()
  @IsString()
  filterDate?: string;

  @IsOptional()
  @IsString()
  filterSender?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 50;
}
