import {
  IsEmail,
  IsInt,
  IsPositive,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { lowerTrimString, trimString } from './transforms';

export class RegisterDto {
  @IsString()
  @Transform(trimString)
  @Length(2, 60)
  nombre!: string;

  @IsString()
  @Transform(trimString)
  @Length(2, 60)
  apellido!: string;

  @IsEmail({}, { message: 'el correo no tiene un formato válido' })
  @Transform(lowerTrimString)
  @MaxLength(120)
  correo!: string;

  // Nombre de usuario para el login: letras, números, punto, guion y guion bajo
  @IsString()
  @Transform(lowerTrimString)
  @Matches(/^[a-z0-9][a-z0-9._-]{2,29}$/, {
    message:
      'el nombre de usuario debe tener 3 a 30 caracteres (letras, números, ".", "-", "_") y empezar con letra o número',
  })
  nombreLogin!: string;

  @IsInt()
  @IsPositive()
  empresaId!: number;

  // RUC (o identificador fiscal si el país no es Paraguay)
  @IsString()
  @Transform(trimString)
  @Length(3, 20)
  ruc!: string;

  // País del celular en ISO 3166-1 alpha-2 (PY, AR, BR, ...)
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'celularPais debe ser un código de país de 2 letras',
  })
  celularPais!: string;

  @IsString()
  @Transform(trimString)
  @Length(4, 25)
  celular!: string;

  @IsString()
  @MinLength(8, { message: 'la contraseña debe tener al menos 8 caracteres' })
  @MaxLength(100)
  password!: string;
}
