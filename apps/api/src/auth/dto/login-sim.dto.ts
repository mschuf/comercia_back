import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsString,
  MaxLength,
} from 'class-validator';

export class LoginSimDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  @Transform(({ value }) => {
    const valor: unknown = value;
    if (!Array.isArray(valor)) return valor;

    return valor.map((telefono: unknown) =>
      typeof telefono === 'string' ? telefono.trim() : telefono,
    );
  })
  telefonos!: string[];
}
