import type { EmpresaJerarquiaFila } from '../interfaces/empresa-admin.interface';

export function esEmpresaJerarquiaFila(
  valor: unknown,
): valor is EmpresaJerarquiaFila {
  if (typeof valor !== 'object' || valor === null || !('empresaId' in valor)) {
    return false;
  }
  const empresaId = valor.empresaId;
  return empresaId === null || typeof empresaId === 'number';
}
