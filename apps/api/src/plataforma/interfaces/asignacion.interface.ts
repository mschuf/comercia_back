// Asignación de módulos/páginas a una empresa (respuesta de /admin/plataforma)

export interface PaginaAsignada {
  paginaId: number;
  rolIds: number[];
}

export interface EmpresaModuloDto {
  moduloId: number;
  todasLasPaginas: boolean;
  rolIds: number[];
  paginas: PaginaAsignada[];
}

export interface AsignacionEmpresaDto {
  empresaId: number;
  modulos: EmpresaModuloDto[];
}
