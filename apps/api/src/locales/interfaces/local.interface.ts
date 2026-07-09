import { TareaLocalDto } from './tarea-local.interface';

// Local geolocalizado, como lo ve el front (DTO de salida mínimo)
export interface LocalDto {
  id: number;
  nombre: string;
  latitud: number;
  longitud: number;
  zona: { id: number; nombre: string } | null;
  // Radio de verificación de presencia; null = usa el default de la config
  radioMetros: number | null;
  // Próxima visita programada por el gestor
  fechaVisita: string | null;
  requiereFotoPresencia: boolean;
  tareasCount: number;
  activo: boolean;
  asignadoA: { id: number; nombre: string } | null;
  creadoPor: { id: number; nombre: string };
  createdAt: string;
  updatedAt: string;
}

// Detalle de un local con su checklist (editor del gestor y flujo de visita)
export interface LocalDetalleDto extends LocalDto {
  tareas: TareaLocalDto[];
  // Radio efectivo: el del local o el default de la config de la empresa
  radioMetrosEfectivo: number;
}

// Usuario elegible para asignarle un local (para el <select> del form)
export interface UsuarioAsignable {
  id: number;
  nombre: string;
  rol: string | null;
}
