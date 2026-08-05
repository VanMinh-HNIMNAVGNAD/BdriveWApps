import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';

export enum ShareAccessLevel {
  PUBLIC = 'PUBLIC',
  RESTRICTED = 'RESTRICTED',
}

export enum ShareRole {
  VIEWER = 'VIEWER',
  EDITOR = 'EDITOR',
}

export class CreateShareLinkDto {
  @IsOptional()
  @IsEnum(ShareAccessLevel, { message: 'accessLevel phải là PUBLIC hoặc RESTRICTED' })
  accessLevel?: ShareAccessLevel = ShareAccessLevel.PUBLIC;

  @IsOptional()
  @IsEnum(ShareRole, { message: 'role phải là VIEWER hoặc EDITOR' })
  role?: ShareRole = ShareRole.VIEWER;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Số ngày hết hạn (expiresInDays) phải ít nhất là 1 ngày' })
  expiresInDays?: number;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  isDownloadAllowed?: boolean;

  @IsOptional()
  isPreviewOnly?: boolean;
}
