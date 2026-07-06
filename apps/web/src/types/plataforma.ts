// Tipos de la plataforma modular (módulos → páginas → ejecutables)

export type TipoEjecutable = "PROCEDURE" | "FUNCTION" | "VIEW" | "QUERY";
export type MotorBd =
  | "POSTGRESQL"
  | "SAP_HANA"
  | "ORACLE"
  | "MYSQL"
  | "SQLSERVER";

export interface Ejecutable {
  id: number;
  nombre: string;
  tipo: TipoEjecutable;
  motor: MotorBd;
  conexionId: number | null;
  sentencia: string;
  orden: number;
  activo: boolean;
}

export interface Pagina {
  id: number;
  moduloId: number;
  nombre: string;
  ruta: string;
  icono: string | null;
  orden: number;
  activo: boolean;
  ejecutables?: Ejecutable[];
}

export interface Modulo {
  id: number;
  nombre: string;
  ruta: string;
  icono: string | null;
  orden: number;
  activo: boolean;
  paginas?: Pagina[];
}

// --- Menú del usuario (/mi-plataforma) ---
export interface PaginaMenu {
  id: number;
  nombre: string;
  ruta: string;
  icono: string | null;
}

export interface ModuloMenu {
  id: number;
  nombre: string;
  ruta: string;
  icono: string | null;
  paginas: PaginaMenu[];
}

// --- Asignaciones empresa ↔ módulos/páginas ---
export interface EmpresaModulo {
  moduloId: number;
  todasLasPaginas: boolean;
  paginaIds: number[];
}

export interface AsignacionEmpresa {
  empresaId: number;
  modulos: EmpresaModulo[];
}

export interface Conexion {
  id: number;
  nombre: string;
}

export const MOTORES: { valor: MotorBd; etiqueta: string }[] = [
  { valor: "POSTGRESQL", etiqueta: "PostgreSQL" },
  { valor: "SAP_HANA", etiqueta: "SAP HANA" },
  { valor: "ORACLE", etiqueta: "Oracle" },
  { valor: "MYSQL", etiqueta: "MySQL" },
  { valor: "SQLSERVER", etiqueta: "SQL Server" },
];

export const TIPOS_EJECUTABLE: { valor: TipoEjecutable; etiqueta: string }[] = [
  { valor: "QUERY", etiqueta: "Query (SQL)" },
  { valor: "PROCEDURE", etiqueta: "Procedimiento" },
  { valor: "FUNCTION", etiqueta: "Función" },
  { valor: "VIEW", etiqueta: "Vista" },
];
