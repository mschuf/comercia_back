"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { Paginacion } from "@/components/paginacion";
import { errorBox } from "@/components/ui";
import type { RespuestaPaginada } from "@/types/paginacion";
import type { VisitaResumen } from "@/types/visita";
import { formatoFechaHora } from "@/utils/fechas";
import { formatoDuracionMinutos } from "@/utils/duracion";

export function MisMarcacionesView() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(7);
  const [datos, setDatos] = useState<RespuestaPaginada<VisitaResumen> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const cargar = useCallback(() => {
    apiFetch<RespuestaPaginada<VisitaResumen>>(
      `/visitas?page=${page}&limit=${limit}`,
    )
      .then((respuesta) => {
        setDatos(respuesta);
        setError(null);
      })
      .catch((e) =>
        setError(
          e instanceof ApiError
            ? e.message
            : "No pudimos cargar tus marcaciones.",
        ),
      );
  }, [limit, page]);
  useEffect(() => cargar(), [cargar]);

  return (
    <section>
      <h1 className="text-xl font-bold tracking-tight">Mis marcaciones</h1>
      <p className="mt-1 text-sm text-muted">
        Entradas y salidas confirmadas por local.
      </p>
      {error ? <p className={`${errorBox} mt-4`}>{error}</p> : null}
      {datos?.items.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-line px-5 py-10 text-center text-sm text-muted">
          Todavía no tenés marcaciones. Tu primera entrada aparecerá acá.
        </p>
      ) : null}
      {datos?.items.length ? (
        <ul className="mt-5 space-y-3" aria-label="Historial de marcaciones">
          {datos.items.map((visita) => (
            <li
              key={visita.id}
              className="grid gap-3 rounded-2xl border border-line bg-surface-raised p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold">{visita.localNombre}</p>
                <p className="truncate text-sm text-muted">
                  {visita.clienteNombre}
                </p>
                <p className="mt-2 text-xs text-muted [font-variant-numeric:tabular-nums]">
                  Entrada {formatoFechaHora(visita.iniciadaEn)} · Salida{" "}
                  {visita.completadaEn
                    ? formatoFechaHora(visita.completadaEn)
                    : "pendiente"}
                </p>
              </div>
              <div className="rounded-xl bg-surface-soft px-3 py-2 text-sm sm:text-right">
                <strong className="block">
                  {visita.tareasCompletadas}/{visita.tareasTotal} tareas
                </strong>
                <span className="text-xs text-muted">
                  {formatoDuracionMinutos(visita.duracionMinutos)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {datos && datos.total > 0 ? (
        <Paginacion
          page={datos.page}
          totalPages={datos.totalPages}
          total={datos.total}
          limit={datos.limit}
          onPageChange={setPage}
          onLimitChange={(nuevo) => {
            setLimit(nuevo);
            setPage(1);
          }}
        />
      ) : null}
    </section>
  );
}
