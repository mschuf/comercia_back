import type { TransformFnParams } from 'class-transformer';

// Helpers de @Transform tipados (evitan el `any` de los arrows inline)
export function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : (value as unknown);
}

export function lowerTrimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string'
    ? value.trim().toLowerCase()
    : (value as unknown);
}
