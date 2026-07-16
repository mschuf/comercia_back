"use client";

import { useEffect, useState } from "react";
import { Paginacion } from "@/components/paginacion";
import { ApiError, apiFetch } from "@/lib/api";
import type { RespuestaPaginada } from "@/types/paginacion";
import type {
  AgrupacionKpiVisita,
  KpiVisitasDetalle,
  KpiVisitasResumen,
} from "@/types/visita";
import { formatoDuracionMinutos } from "@/utils/duracion";

function consultaFechas(desde: string, hasta: string): string {
  const parametros = new URLSearchParams();
  if (desde) parametros.set("desde", desde);
  if (hasta) parametros.set("hasta", hasta);
  const consulta = parametros.toString();
  return consulta ? `&${consulta}` : "";
}

export function KpisVisitas() {
  const [resumen, setResumen] = useState<KpiVisitasResumen | null>(null);
  const [detalle, setDetalle] =
    useState<RespuestaPaginada<KpiVisitasDetalle> | null>(null);
  const [agrupadoPor, setAgrupadoPor] =
    useState<AgrupacionKpiVisita>("USUARIO");
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(7);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [filtros, setFiltros] = useState({ desde: "", hasta: "" });
  const [refresco, setRefresco] = useState(0);
  const [cargandoResumen, setCargandoResumen] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    const parametros = new URLSearchParams();
    if (filtros.desde) parametros.set("desde", filtros.desde);
    if (filtros.hasta) parametros.set("hasta", filtros.hasta);
    const consulta = parametros.toString();
    apiFetch<KpiVisitasResumen>(
      `/visitas/kpis/resumen${consulta ? `?${consulta}` : ""}`,
    )
      .then((data) => {
        if (!vigente) return;
        setResumen(data);
        setDesde((actual) => actual || data.desde);
        setHasta((actual) => actual || data.hasta);
        setError(null);
      })
      .catch((problema) => {
        if (vigente) {
          setError(
            problema instanceof ApiError
              ? problema.message
              : "No pudimos cargar los indicadores",
          );
        }
      })
      .finally(() => {
        if (vigente) setCargandoResumen(false);
      });
    return () => {
      vigente = false;
    };
  }, [filtros, refresco]);

  useEffect(() => {
    let vigente = true;
    apiFetch<RespuestaPaginada<KpiVisitasDetalle>>(
      `/visitas/kpis/detalle?agrupadoPor=${agrupadoPor}&page=${pagina}&limit=${limite}${consultaFechas(filtros.desde, filtros.hasta)}`,
    )
      .then((data) => {
        if (vigente) {
          setDetalle(data);
          setError(null);
        }
      })
      .catch((problema) => {
        if (vigente) {
          setError(
            problema instanceof ApiError
              ? problema.message
              : "No pudimos cargar el detalle de indicadores",
          );
        }
      })
      .finally(() => {
        if (vigente) setCargandoDetalle(false);
      });
    return () => {
      vigente = false;
    };
  }, [agrupadoPor, pagina, limite, filtros, refresco]);

  const tarjetas = resumen
    ? [
        ["Visitas terminadas", String(resumen.visitasCompletadas)],
        [
          "Tiempo promedio",
          formatoDuracionMinutos(resumen.duracionPromedioMinutos),
        ],
        [
          "Tiempo mediano",
          formatoDuracionMinutos(resumen.duracionMedianaMinutos),
        ],
        ["Cumplimiento", `${resumen.cumplimientoPorcentaje}%`],
        ["Repositores activos", String(resumen.usuariosActivos)],
        ["Visitas en curso", String(resumen.visitasEnCurso)],
      ]
    : [];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-indigo-50/70 p-4 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:to-indigo-950/30 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-600 sm:text-[11px] dark:text-indigo-300">
              Rendimiento operativo
            </p>
            <h2 className="mt-1 text-lg font-bold tracking-tight sm:text-xl">
              Indicadores de visitas
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Tiempos medidos desde “Iniciar visita” hasta “Terminar visita”.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Desde
              <input
                type="date"
                value={desde}
                onChange={(evento) => setDesde(evento.target.value)}
                className="mt-1 block min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Hasta
              <input
                type="date"
                value={hasta}
                onChange={(evento) => setHasta(evento.target.value)}
                className="mt-1 block min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setPagina(1);
                setFiltros({ desde, hasta });
                setRefresco((actual) => actual + 1);
              }}
              className="min-h-11 self-end rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white transition hover:bg-indigo-800 focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            >
              Aplicar
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {cargandoResumen && !resumen ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {tarjetas.map(([etiqueta, valor]) => (
            <article
              key={etiqueta}
              className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {etiqueta}
              </p>
              <p className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                {valor}
              </p>
            </article>
          ))}
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold">Promedios comparativos</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Analizá tiempos por repositor o por local.
            </p>
          </div>
          <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
            {(["USUARIO", "LOCAL"] as const).map((opcion) => (
              <button
                key={opcion}
                type="button"
                onClick={() => {
                  setAgrupadoPor(opcion);
                  setPagina(1);
                }}
                className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
                  agrupadoPor === opcion
                    ? "bg-white text-indigo-700 shadow-sm dark:bg-zinc-950 dark:text-indigo-300"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
                }`}
              >
                {opcion === "USUARIO" ? "Por repositor" : "Por local"}
              </button>
            ))}
          </div>
        </div>

        {cargandoDetalle && !detalle ? (
          <div className="h-56 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
        ) : detalle && detalle.items.length > 0 ? (
          <>
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-950/60">
                  <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="px-4 py-3 font-medium">
                      {agrupadoPor === "USUARIO" ? "Repositor" : "Local"}
                    </th>
                    <th className="px-4 py-3 font-medium">Visitas</th>
                    <th className="px-4 py-3 font-medium">Tiempo promedio</th>
                    <th className="px-4 py-3 font-medium">Checklist</th>
                    <th className="px-4 py-3 font-medium">Alcance</th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.items.map((item) => (
                    <tr
                      key={`${item.agrupadoPor}-${item.entidadId}`}
                      className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/70"
                    >
                      <td className="px-4 py-3">
                        <span className="block font-semibold">
                          {item.nombre}
                        </span>
                        {item.detalle ? (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {item.detalle}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {item.visitas}
                      </td>
                      <td className="px-4 py-3">
                        {formatoDuracionMinutos(item.duracionPromedioMinutos)}
                      </td>
                      <td className="px-4 py-3">
                        {item.cumplimientoPorcentaje}%
                      </td>
                      <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                        {item.entidadesRelacionadas}{" "}
                        {agrupadoPor === "USUARIO"
                          ? item.entidadesRelacionadas === 1
                            ? "local"
                            : "locales"
                          : item.entidadesRelacionadas === 1
                            ? "repositor"
                            : "repositores"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion
              page={detalle.page}
              totalPages={detalle.totalPages}
              total={detalle.total}
              limit={detalle.limit}
              onPageChange={setPagina}
              onLimitChange={(nuevoLimite) => {
                setLimite(nuevoLimite);
                setPagina(1);
              }}
            />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
            No hay visitas terminadas en este período.
          </div>
        )}
      </section>
    </div>
  );
}
