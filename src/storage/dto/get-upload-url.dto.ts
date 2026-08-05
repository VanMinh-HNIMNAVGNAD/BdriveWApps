import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class GetUploadUrlDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên file không được để trống' })
  name: string;

  @IsNumber()
  @Min(1, { message: 'Kích thước file phải lớn hơn 0 byte' })
  sizeBytes: number;

  @IsString()
  @IsNotEmpty({ message: 'Loại mimeType không được để trống' })
  mimeType: string;

  @IsOptional()
  @IsUUID('4', { message: 'parentId phải là UUID hợp lệ' })
  parentId?: string;

  @IsOptional()
  @IsString()
  targetProvider?: string;
}
