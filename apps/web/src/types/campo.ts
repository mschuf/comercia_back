export interface ClienteCampo {
  id: number;
  nombre: string;
  ruc: string;
  contacto: string;
  telefono: string;
  activo: boolean;
}
export interface LocalCampo {
  id: number;
  clienteId: number;
  nombre: string;
  direccion: string;
  contacto: string;
  telefono: string;
  latitud: number;
  longitud: number;
  notas: string;
  activo: boolean;
  cliente: { id: number; nombre: string };
}
export interface HorarioCampo {
  id: number;
  localId: number;
  frecuencia: "DIARIA" | "SEMANAL" | "MENSUAL";
  intervalo: number;
  diasSemana: number[];
  diasMes: number[];
  fechaDesde: string;
  fechaHasta: string | null;
  entrada: string;
  salida: string;
  activo: boolean;
}
export interface PersonaCampo {
  id: number;
  nombre: string;
  apellido: string;
}
export interface AsignacionCampo {
  id: number;
  localId: number;
  usuarioId: number;
  usuario: PersonaCampo;
  fechaDesde: string;
  fechaHasta: string | null;
  activo: boolean;
}
export interface BackupCampo {
  id: number;
  asignacionId: number;
  usuarioId: number;
  usuario: PersonaCampo;
  fechaDesde: string;
  fechaHasta: string;
  motivo: string;
  activo: boolean;
}
export interface TareaCampo {
  id: number;
  nombre: string;
  descripcion: string;
  todosLocales: boolean;
  activo: boolean;
  fechaDesde: string;
  fechaHasta: string | null;
  locales: { local: { id: number; nombre: string } }[];
}
export interface VisitaCampo {
  id: number;
  asignacionId: number;
  horarioId: number | null;
  fecha: string;
  entrada: string;
  salida: string | null;
  esBackup: boolean;
  notaEntrada: string;
  notaSalida: string;
  entradaLat: number | null;
  entradaLng: number | null;
  salidaLat: number | null;
  salidaLng: number | null;
  local: { id: number; nombre: string };
  usuario: PersonaCampo;
  asignacion: { usuario: PersonaCampo };
  _count: { cumplimientos: number };
}
export interface AgendaCampo {
  id: number;
  esBackup: boolean;
  titular: string;
  local: LocalCampo & { horarios: HorarioCampo[] };
  visitas: {
    id: number;
    horarioId: number | null;
    entrada: string;
    salida: string | null;
  }[];
}
export interface TareaJornadaCampo {
  id: number;
  nombre: string;
  descripcion: string;
  visitasCompletadas: number[];
}
export interface FormHorarioCampo {
  frecuencia: HorarioCampo["frecuencia"];
  intervalo: number;
  diasSemana: number[];
  diasMes: number[];
  fechaDesde: string;
  fechaHasta: string;
  entrada: string;
  salida: string;
}
export interface FormTareaCampo {
  nombre: string;
  descripcion: string;
  todosLocales: boolean;
  activo: boolean;
  fechaDesde: string;
  fechaHasta: string;
  localIds: number[];
}
export interface MarcaCampo {
  latitud?: number;
  longitud?: number;
  nota: string;
}
