import { IsOptional, IsUUID } from 'class-validator';

export class MoveItemDto {
  @IsOptional()
  @IsUUID('4', { message: 'targetParentId phải là UUID hợp lệ' })
  targetParentId?: string | null;
}
