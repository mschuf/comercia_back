export interface CandidataAgendaDiaria {
  clave: string;
  local: {
    id: number;
    nombre: string;
    cliente: { id: number; nombre: string };
    zona: string | null;
    latitud: number;
    longitud: number;
    tareasActivas: number;
  };
  programadaEn: Date;
  visitaAbiertaId: number | null;
}

export interface AgendaDiaria {
  fecha: string;
  totalProgramadas: number;
  totalCompletadas: number;
  candidatas: CandidataAgendaDiaria[];
}
