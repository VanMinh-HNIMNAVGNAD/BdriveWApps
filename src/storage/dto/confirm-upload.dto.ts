import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ConfirmUploadDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên tệp không được để trống' })
  name: string;

  @IsNumber()
  @Min(1)
  sizeBytes: number;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsString()
  @IsNotEmpty()
  storageKey: string;

  @IsString()
  @IsNotEmpty()
  storageProvider: string;

  @IsOptional()
  @IsUUID('4')
  parentId?: string;
}
