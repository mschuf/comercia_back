export interface ClienteRepositorDto {
  id: number;
  nombre: string;
  localesAsignados: number;
  tareasActivas: number;
  proximaVisita: string | null;
}
