import type { ProgramacionVisita } from "@/types/visita";

const DIAS_SEMANA: Record<number, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
  7: "Dom",
};

export function formatoFechaProgramacion(fecha: string): string {
  const valor = new Date(`${fecha}T12:00:00.000Z`);
  if (Number.isNaN(valor.getTime())) return fecha;
  return valor.toLocaleDateString("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function resumenProgramacion(
  programacion: ProgramacionVisita | null,
): string {
  if (!programacion) return "Sin programación";
  if (!programacion.activo) return "Programación pausada";

  const horas = programacion.horarios.join(", ");
  if (programacion.frecuencia === "UNICA") {
    return `${formatoFechaProgramacion(programacion.fechaInicio)} · ${horas}`;
  }
  if (programacion.frecuencia === "SEMANAL") {
    const dias = programacion.diasSemana
      .map((dia) => DIAS_SEMANA[dia])
      .filter(Boolean)
      .join(", ");
    const intervalo =
      programacion.intervalo === 1
        ? "Cada semana"
        : `Cada ${programacion.intervalo} semanas`;
    return `${intervalo} · ${dias} · ${horas}`;
  }

  const dias = programacion.diasMes.join(", ");
  const intervalo =
    programacion.intervalo === 1
      ? "Cada mes"
      : `Cada ${programacion.intervalo} meses`;
  return `${intervalo} · días ${dias} · ${horas}`;
}

export function zonaHorariaNavegador(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Asuncion";
}
