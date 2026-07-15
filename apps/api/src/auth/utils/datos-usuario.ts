import { BadRequestException } from '@nestjs/common';
import {
  getCountries,
  parsePhoneNumberFromString,
} from 'libphonenumber-js/max';
import { esRucParaguayoValido, normalizarRucPy } from './ruc';

const TIPOS_CELULAR_VALIDOS = new Set(['MOBILE', 'FIXED_LINE_OR_MOBILE']);

export function normalizarCelular(celular: string, pais: string): string {
  if (!(getCountries() as string[]).includes(pais)) {
    throw new BadRequestException('El país del celular no es válido');
  }
  const parsed = parsePhoneNumberFromString(celular, pais as never);
  if (!parsed || !parsed.isValid() || parsed.country !== pais) {
    throw new BadRequestException(
      'El celular no es válido para el país seleccionado',
    );
  }
  const tipo = parsed.getType();
  if (tipo !== undefined && !TIPOS_CELULAR_VALIDOS.has(tipo)) {
    throw new BadRequestException('El número ingresado no es un celular');
  }
  return parsed.number;
}

export function normalizarRucUsuario(ruc: string, pais: string): string {
  if (pais === 'PY') {
    const normalizado = normalizarRucPy(ruc.toUpperCase());
    if (!esRucParaguayoValido(normalizado)) {
      throw new BadRequestException(
        'El RUC no es válido: revisá el número y su dígito verificador (ej: 80012345-0)',
      );
    }
    return normalizado;
  }
  return ruc.trim().toUpperCase();
}
