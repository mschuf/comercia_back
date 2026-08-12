const DIA_MS = 86_400_000;

function fechaUtc(fechaIso: string): Date {
  return new Date(`${fechaIso}T00:00:00.000Z`);
}

function iso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * DIA_MS);
}

export interface PeriodoPresentismo {
  desde: string;
  hasta: string;
}

export function periodosPresentismo(fechaIso: string): {
  dia: PeriodoPresentismo;
  semana: PeriodoPresentismo;
  mes: PeriodoPresentismo;
} {
  const fecha = fechaUtc(fechaIso);
  const diaSemana = fecha.getUTCDay() || 7;
  const inicioSemana = sumarDias(fecha, 1 - diaSemana);
  const inicioMes = new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1),
  );
  return {
    dia: { desde: fechaIso, hasta: fechaIso },
    semana: { desde: iso(inicioSemana), hasta: fechaIso },
    mes: { desde: iso(inicioMes), hasta: fechaIso },
  };
}

export function diasDelPeriodo(desde: string, hasta: string): string[] {
  const inicio = fechaUtc(desde);
  const fin = fechaUtc(hasta);
  if (
    Number.isNaN(inicio.getTime()) ||
    Number.isNaN(fin.getTime()) ||
    inicio > fin ||
    fin.getTime() - inicio.getTime() > 366 * DIA_MS
  ) {
    throw new Error('RANGO_INVALIDO');
  }
  const fechas: string[] = [];
  for (let actual = inicio; actual <= fin; actual = sumarDias(actual, 1)) {
    fechas.push(iso(actual));
  }
  return fechas;
}
