"use client";

/* Hallmark · macrostructure: Workbench · stat strip + progreso operativo. */

import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { errorBox } from "@/components/ui";
import type { RendimientoImpulsador } from "@/types/visita";

function Barra({ valor }: { valor: number }) {
  return (
    <div
      className="mt-3 h-2 overflow-hidden rounded-full bg-brand-100 dark:bg-brand-950"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valor}
    >
      <span
        className="block h-full rounded-full bg-brand-700 transition-[transform] duration-300 motion-reduce:transition-none"
        style={{ transform: `translateX(${valor - 100}%)` }}
      />
    </div>
  );
}

export function RendimientoImpulsadorView() {
  const [datos, setDatos] = useState<RendimientoImpulsador | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controlador = new AbortController();
    apiFetch<RendimientoImpulsador>("/repositor/rendimiento", {
      signal: controlador.signal,
    })
      .then((respuesta) => {
        setDatos(respuesta);
        setError(null);
      })
      .catch((e) => {
        if (!controlador.signal.aborted) {
          setError(
            e instanceof ApiError
              ? e.message
              : "No pudimos cargar tu rendimiento.",
          );
        }
      });
    return () => controlador.abort();
  }, []);

  if (error) return <p className={errorBox}>{error}</p>;
  if (!datos) {
    return (
      <div
        className="grid gap-3 sm:grid-cols-2"
        aria-label="Cargando rendimiento"
      >
        <div className="h-36 animate-pulse rounded-2xl bg-surface-soft motion-reduce:animate-none" />
        <div className="h-36 animate-pulse rounded-2xl bg-surface-soft motion-reduce:animate-none" />
      </div>
    );
  }

  return (
    <section className="min-w-0">
      <div className="max-w-2xl">
        <h1 className="text-xl font-bold tracking-tight">Tu rendimiento</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Resumen de los últimos 30 días. Cada entrada y salida confirmada suma
          a tu jornada.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-line bg-surface-raised p-5">
          <p className="text-sm font-medium text-muted">Presentaciones</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight [font-variant-numeric:tabular-nums]">
            {datos.presentacionesPorcentaje}%
          </p>
          <p className="mt-1 text-sm text-muted">
            {datos.presentacionesRealizadas} de{" "}
            {datos.presentacionesProgramadas} visitas programadas
          </p>
          <Barra valor={datos.presentacionesPorcentaje} />
        </article>
        <article className="rounded-2xl border border-line bg-surface-raised p-5">
          <p className="text-sm font-medium text-muted">Tareas realizadas</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight [font-variant-numeric:tabular-nums]">
            {datos.tareasPorcentaje}%
          </p>
          <p className="mt-1 text-sm text-muted">
            {datos.tareasCompletadas} de {datos.tareasTotales} tareas
          </p>
          <Barra valor={datos.tareasPorcentaje} />
        </article>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Locales asignados", datos.localesAsignados],
          ["Locales visitados", datos.localesVisitados],
          ["Visitas en curso", datos.visitasEnCurso],
          ["Período", `${datos.desde} – ${datos.hasta}`],
        ].map(([etiqueta, valor]) => (
          <div key={etiqueta} className="rounded-xl bg-surface-soft p-4">
            <dt className="text-xs font-medium text-muted">{etiqueta}</dt>
            <dd className="mt-1 font-bold [font-variant-numeric:tabular-nums]">
              {valor}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
