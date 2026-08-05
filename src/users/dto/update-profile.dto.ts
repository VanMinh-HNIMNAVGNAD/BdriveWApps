import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString({ message: 'Tên hiển thị phải là chuỗi ký tự' })
  @IsNotEmpty({ message: 'Tên hiển thị không được để trống' })
  @MinLength(2, { message: 'Tên hiển thị phải có ít nhất 2 ký tự' })
  fullName: string;
}
