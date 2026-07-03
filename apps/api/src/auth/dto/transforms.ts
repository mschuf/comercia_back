import type { TransformFnParams } from 'class-transformer';

export function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : (value as unknown);
}

export function lowerTrimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string'
    ? value.trim().toLowerCase()
    : (value as unknown);
}
