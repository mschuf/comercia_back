import type { UsuarioConAcceso } from './usuario-con-acceso.interface';

export interface AccesoModulos {
  usuario: UsuarioConAcceso;
  modulosRutas: string[];
}
