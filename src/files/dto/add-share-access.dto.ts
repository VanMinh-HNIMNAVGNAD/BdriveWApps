import { IsEmail, IsNotEmpty, IsEnum } from 'class-validator';

export class AddShareAccessDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsEnum(['viewer', 'editor', 'owner'])
  @IsNotEmpty()
  role: string;
}
