import { IsNotEmpty, IsUUID, IsString, IsOptional, IsIn } from 'class-validator';

export class AddMemberDto {
  @IsNotEmpty({ message: 'User ID không được để trống' })
  @IsUUID('4', { message: 'User ID không hợp lệ' })
  userId: string;

  @IsOptional()
  @IsString()
  @IsIn(['ADMIN', 'MEMBER', 'VIEWER'], { message: 'Vai trò phải là ADMIN, MEMBER hoặc VIEWER' })
  role?: string;
}
