import { IsNotEmpty, IsUUID } from 'class-validator';

export class AttachTagDto {
  @IsNotEmpty({ message: 'Tag ID không được để trống' })
  @IsUUID('4', { message: 'Tag ID không hợp lệ' })
  tagId: string;

  @IsNotEmpty({ message: 'File ID không được để trống' })
  @IsUUID('4', { message: 'File ID không hợp lệ' })
  fileId: string;
}
