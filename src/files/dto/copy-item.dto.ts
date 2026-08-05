import { IsOptional, IsUUID } from 'class-validator';

export class CopyItemDto {
  @IsOptional()
  @IsUUID('4', { message: 'targetParentId phải là UUID hợp lệ' })
  targetParentId?: string | null;
}
