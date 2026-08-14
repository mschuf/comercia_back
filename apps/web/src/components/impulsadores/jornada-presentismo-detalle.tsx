"use client";

import { useEffect, useId, useState } from "react";
import { Paginacion } from "@/components/paginacion";
import { ApiError, apiFetch } from "@/lib/api";
import type { RespuestaPaginada } from "@/types/paginacion";
import type {
  EstadoJornadaPresentismo,
  JornadaPresentismo,
} from "@/types/presentismo";

const ESTADOS: Record<
  EstadoJornadaPresentismo,
  { etiqueta: string; clase: string }
> = {
  COMPLETADA: {
    etiqueta: "Completada",
    clase: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  EN_CURSO: {
    etiqueta: "En curso",
    clase: "bg-brand-100 text-brand-900 dark:bg-brand-950/60 dark:text-brand-200",
  },
  PENDIENTE: {
    etiqueta: "Pendiente",
    clase: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  },
  ATRASADA: {
    etiqueta: "Sin registrar",
    clase: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
  },
  NO_PROGRAMADA: {
    etiqueta: "No programada",
    clase: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
  },
};

function formatoFecha(fecha: string): string {
  return new Intl.DateTimeFormat("es-PY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${fecha}T12:00:00`));
}

function formatoHora(fecha: string | null): string {
  if (!fecha) return "-";
  return new Intl.DateTimeFormat("es-PY", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(fecha));
}

function EstadoJornada({ estado }: { estado: EstadoJornadaPresentismo }) {
  const configuracion = ESTADOS[estado];
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-[0.68rem] font-bold ${configuracion.clase}`}
    >
      {configuracion.etiqueta}
    </span>
  );
}

function LocalJornada({ jornada }: { jornada: JornadaPresentismo }) {
  return (
    <>
      <p className="font-semibold text-foreground">{jornada.local.nombre}</p>
      <p className="mt-0.5 text-xs text-muted">{jornada.local.clienteNombre}</p>
    </>
  );
}

export function JornadaPresentismoDetalle({
  usuarioId,
  fecha,
}: {
  usuarioId: number;
  fecha: string;
}) {
  const detalleId = useId();
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] =
    useState<RespuestaPaginada<JornadaPresentismo> | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(7);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDatos(null);
    setPage(1);
    setError(null);
  }, [fecha]);

  useEffect(() => {
    if (!abierto) return;
    let vigente = true;
    const params = new URLSearchParams({
      fecha,
      page: String(page),
      limit: String(limit),
    });
    setCargando(true);
    void apiFetch<RespuestaPaginada<JornadaPresentismo>>(
      `/presentismo/jornada/${usuarioId}?${params.toString()}`,
    )
      .then((respuesta) => {
        if (!vigente) return;
        setDatos(respuesta);
        setError(null);
      })
      .catch((causa) => {
        if (!vigente) return;
        setError(
          causa instanceof ApiError
            ? causa.message
            : "No se pudo cargar la jornada",
        );
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [abierto, fecha, limit, page, usuarioId]);

  return (
    <div className="mt-3 min-w-0">
      <button
        type="button"
        aria-controls={detalleId}
        aria-expanded={abierto}
        onClick={() => setAbierto((actual) => !actual)}
        className="min-h-11 rounded-lg border border-control-line bg-surface-raised px-3 text-sm font-semibold text-foreground transition hover:border-brand-500 hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50"
      >
        {abierto
          ? "Ocultar jornada"
          : `Ver jornada del ${formatoFecha(fecha)}`}
      </button>

      {abierto ? (
        <div id={detalleId} className="mt-3 border-t border-line pt-3">
          {cargando && !datos ? (
            <p className="text-sm text-muted">Cargando jornada...</p>
          ) : null}
          {error ? <p className="text-sm text-rose-800 dark:text-rose-300">{error}</p> : null}
          {datos?.items.length === 0 ? (
            <p className="text-sm text-muted">
              No tiene locales programados ni marcaciones para esta fecha.
            </p>
          ) : null}
          {datos && datos.items.length > 0 ? (
            <>
              <ul className="space-y-3 md:hidden" aria-label="Jornada por local">
                {datos.items.map((jornada) => (
                  <li key={jornada.id} className="border-b border-line py-3 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><LocalJornada jornada={jornada} /></div>
                      <EstadoJornada estado={jornada.estado} />
                    </div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-xs [font-variant-numeric:tabular-nums]">
                      <div><dt className="text-muted">Prevista</dt><dd className="mt-1 font-semibold text-foreground">{formatoHora(jornada.programadaEn)}</dd></div>
                      <div><dt className="text-muted">Entrada</dt><dd className="mt-1 font-semibold text-foreground">{formatoHora(jornada.entradaEn)}</dd></div>
                      <div><dt className="text-muted">Salida</dt><dd className="mt-1 font-semibold text-foreground">{formatoHora(jornada.salidaEn)}</dd></div>
                    </dl>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[620px] text-left text-sm [font-variant-numeric:tabular-nums]">
                  <thead><tr className="border-y border-line text-xs uppercase tracking-wide text-muted"><th className="px-3 py-3 font-semibold">Local</th><th className="px-3 py-3 text-right font-semibold">Prevista</th><th className="px-3 py-3 text-right font-semibold">Entrada</th><th className="px-3 py-3 text-right font-semibold">Salida</th><th className="px-3 py-3 text-right font-semibold">Estado</th></tr></thead>
                  <tbody>{datos.items.map((jornada) => <tr key={jornada.id} className="border-b border-line"><td className="px-3 py-3"><LocalJornada jornada={jornada} /></td><td className="px-3 py-3 text-right">{formatoHora(jornada.programadaEn)}</td><td className="px-3 py-3 text-right">{formatoHora(jornada.entradaEn)}</td><td className="px-3 py-3 text-right">{formatoHora(jornada.salidaEn)}</td><td className="px-3 py-3 text-right"><EstadoJornada estado={jornada.estado} /></td></tr>)}</tbody>
                </table>
              </div>
              <Paginacion
                limit={datos.limit}
                onLimitChange={(valor) => { setLimit(valor); setPage(1); }}
                onPageChange={setPage}
                page={datos.page}
                total={datos.total}
                totalPages={datos.totalPages}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
