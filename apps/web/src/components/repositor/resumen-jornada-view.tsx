"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRutaDiaria } from "@/components/repositor/ruta-diaria-contexto";
import { formatoDistancia } from "@/utils/distancia";
import { formatoDuracionSegundos } from "@/utils/duracion";

export function ResumenJornadaRepositor() {
  const { ruta, error, cargarRuta } = useRutaDiaria();

  useEffect(() => {
    void cargarRuta().catch(() => undefined);
  }, [cargarRuta]);

  const indicadores = ruta
    ? [
        {
          etiqueta: "Pendientes",
          valor: String(ruta.paradas.length),
          detalle: `${ruta.totalCompletadas} completadas`,
        },
        {
          etiqueta: "Distancia",
          valor: formatoDistancia(ruta.distanciaTotalMetros),
          detalle: ruta.fuente === "OSRM" ? "por calles" : "estimada",
        },
        {
          etiqueta: "En traslado",
          valor: formatoDuracionSegundos(ruta.duracionTrasladoSegundos),
          detalle: "sin contar visitas",
        },
        {
          etiqueta: "Ahorro",
          valor: formatoDistancia(ruta.ahorroEstimadoMetros),
          detalle: "vs. orden horario",
        },
      ]
    : [];

  return (
    <section aria-labelledby="resumen-jornada-titulo" className="py-1">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent-ink">
            Jornada de hoy
          </p>
          <h2
            id="resumen-jornada-titulo"
            className="mt-1 text-lg font-extrabold tracking-[-0.025em] sm:text-xl"
          >
            Tu recorrido en números
          </h2>
        </div>
        <Link
          href="/panel/repositor/visitas"
          className="inline-flex min-h-11 items-center whitespace-nowrap rounded-xl border border-accent px-3.5 text-sm font-bold text-accent-ink transition hover:bg-surface-soft active:translate-y-px focus-visible:ring-2 focus-visible:ring-focus"
        >
          Ver recorrido
        </Link>
      </header>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : ruta === null ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-xl bg-surface-soft"
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {indicadores.map((indicador) => (
            <article
              key={indicador.etiqueta}
              className="min-w-0 rounded-xl border border-line bg-surface-raised p-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                {indicador.etiqueta}
              </p>
              <p className="mt-1 truncate text-lg font-black tracking-tight sm:text-xl">
                {indicador.valor}
              </p>
              <p className="truncate text-[11px] text-muted">
                {indicador.detalle}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
