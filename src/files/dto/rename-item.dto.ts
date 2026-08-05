import { IsNotEmpty, IsString } from 'class-validator';

export class RenameItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên mới không được để trống' })
  name: string;
}
