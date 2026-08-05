import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateSharedDriveDto {
  @IsNotEmpty({ message: 'Tên bộ nhớ chung không được để trống' })
  @IsString({ message: 'Tên bộ nhớ chung phải là chuỗi' })
  @MaxLength(255, { message: 'Tên không vượt quá 255 ký tự' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  description?: string;
}
