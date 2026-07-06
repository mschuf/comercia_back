import { IsString, Length, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { lowerTrimString } from '../../common/utils/transforms';

export class LoginDto {
  // Correo o nombre de usuario, indistintamente
  @IsString()
  @Transform(lowerTrimString)
  @Length(3, 120)
  identificador!: string;

  @IsString()
  @MaxLength(100)
  password!: string;
}
