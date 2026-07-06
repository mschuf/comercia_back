// Asignación de módulos/páginas a una empresa (respuesta de /admin/plataforma)

export interface EmpresaModuloDto {
  moduloId: number;
  todasLasPaginas: boolean;
  paginaIds: number[];
}

export interface AsignacionEmpresaDto {
  empresaId: number;
  modulos: EmpresaModuloDto[];
}
