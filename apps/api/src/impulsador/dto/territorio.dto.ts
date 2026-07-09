import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { trimString } from '../../common/utils/transforms';

const COLOR_HEX = /^#[0-9a-fA-F]{6}$/;

export class CrearTerritorioDto {
  @IsString()
  @Transform(trimString)
  @Length(2, 120)
  nombre!: string;

  // Color de relleno en el mapa (hex #rrggbb)
  @IsOptional()
  @IsString()
  @Matches(COLOR_HEX, { message: 'color debe ser un hex #rrggbb' })
  color?: string;

  // Vértices [[lat, lng], ...]; la forma se valida a fondo en utils/poligono
  @IsOptional()
  @IsArray()
  poligono?: unknown[] | null;
}

export class ActualizarTerritorioDto {
  @IsOptional()
  @IsString()
  @Transform(trimString)
  @Length(2, 120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @Matches(COLOR_HEX, { message: 'color debe ser un hex #rrggbb' })
  color?: string;

  // undefined = no tocar; null = quitar la delimitación
  @IsOptional()
  @IsArray()
  poligono?: unknown[] | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
