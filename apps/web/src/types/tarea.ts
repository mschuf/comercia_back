export type AlcanceUsuariosTarea =
  | "EMPRESA"
  | "EQUIPO_DIRECTO"
  | "EQUIPO_COMPLETO"
  | "SELECCIONADOS";

export type AlcanceLocalesTarea = "TODOS" | "CLIENTE" | "SELECCIONADOS";

export interface FormularioTarea {
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  activo: boolean;
  alcance: AlcanceUsuariosTarea;
  equipoRaiz: { id: number; nombre: string } | null;
  destinatarios: { id: number; nombre: string }[];
  alcanceLocales: AlcanceLocalesTarea;
  cliente: { id: number; nombre: string } | null;
  locales: { id: number; nombre: string }[];
  vigenteDesde: string;
  vigenteHasta: string;
}

export interface TareaGlobal {
  id: number;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  activo: boolean;
  editable: boolean;
  alcance: AlcanceUsuariosTarea;
  equipoRaiz: { id: number; nombre: string } | null;
  destinatarios: { id: number; nombre: string }[];
  alcanceLocales: AlcanceLocalesTarea;
  cliente: { id: number; nombre: string } | null;
  locales: { id: number; nombre: string }[];
  usuariosAsignados: number;
  usuariosExcluidos: number;
  localesAsignados: number;
  clientesAsignados: number;
  clientesEmpresa: number;
  localesEmpresa: number;
  vigenteDesde: string | null;
  vigenteHasta: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TareasQuitadasUsuario {
  ok: true;
  usuarioId: number;
  tareasQuitadas: number;
}
