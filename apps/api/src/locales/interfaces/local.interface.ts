import { TareaLocalDto } from './tarea-local.interface';

// Local geolocalizado, como lo ve el front (DTO de salida mínimo)
export interface LocalDto {
  id: number;
  nombre: string;
  cliente: { id: number; nombre: string };
  latitud: number;
  longitud: number;
  zona: { id: number; nombre: string } | null;
  // Radio de verificación de presencia; null = usa 200 metros
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
  descripcionTareas: string;
  imagenReferencia: string | null;
  // Radio efectivo: el del local o el predeterminado general
  radioMetrosEfectivo: number;
}

// Usuario elegible para asignarle un local (para el <select> del form)
export interface UsuarioAsignable {
  id: number;
  nombre: string;
  nombreLogin: string;
  rol: string | null;
}
