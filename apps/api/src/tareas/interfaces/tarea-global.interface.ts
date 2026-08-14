export interface TareaGlobalDto {
  id: number;
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  activo: boolean;
  editable: boolean;
  alcance: 'EMPRESA' | 'EQUIPO_DIRECTO' | 'EQUIPO_COMPLETO' | 'SELECCIONADOS';
  equipoRaiz: { id: number; nombre: string } | null;
  destinatarios: { id: number; nombre: string }[];
  alcanceLocales: 'TODOS' | 'CLIENTE' | 'SELECCIONADOS';
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
