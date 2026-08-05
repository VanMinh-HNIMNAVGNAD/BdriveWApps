import { IsNotEmpty, IsString, MaxLength, Matches, IsOptional } from 'class-validator';

export class CreateTagDto {
  @IsNotEmpty({ message: 'Tên nhãn không được để trống' })
  @IsString({ message: 'Tên nhãn phải là chuỗi' })
  @MaxLength(50, { message: 'Tên nhãn không quá 50 ký tự' })
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { message: 'Mã màu phải dạng Hexadecimal (ví dụ: #3B82F6)' })
  colorHex?: string;
}
