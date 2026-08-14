"use client";

/* Hallmark · genre: modern-minimal · macrostructure: Stat-Led · component: F3/T4. */

import { useEffect, useState } from "react";
import { JornadaPresentismoDetalle } from "@/components/impulsadores/jornada-presentismo-detalle";
import { Paginacion } from "@/components/paginacion";
import { SelectorUsuario } from "@/components/selector-usuario";
import { errorBox, inputBase, labelBase } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api";
import type { UsuarioAsignable } from "@/types/local";
import type { RespuestaPaginada } from "@/types/paginacion";
import type {
  FilaPresentismo,
  MetricaPresentismo,
  ResumenPresentismo,
} from "@/types/presentismo";

function fechaIso(fecha: Date): string {
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function Stat({
  etiqueta,
  metrica,
}: {
  etiqueta: string;
  metrica: MetricaPresentismo;
}) {
  return (
    <div className="min-w-0 border-t border-line px-4 py-4 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {etiqueta}
      </p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-foreground [font-variant-numeric:tabular-nums]">
        {metrica.porcentaje}%
      </p>
      <p className="mt-1 text-sm text-muted [font-variant-numeric:tabular-nums]">
        {metrica.entradas} de {metrica.programadas} presentaciones
      </p>
      <p className="mt-0.5 text-xs text-muted [font-variant-numeric:tabular-nums]">
        {metrica.salidas} salidas registradas
      </p>
    </div>
  );
}

export function PresentismoView() {
  const hoy = fechaIso(new Date());
  const [resumen, setResumen] = useState<ResumenPresentismo | null>(null);
  const [datos, setDatos] =
    useState<RespuestaPaginada<FilaPresentismo> | null>(null);
  const [desde, setDesde] = useState(hoy);
  const [hasta, setHasta] = useState(hoy);
  const [buscar, setBuscar] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [responsable, setResponsable] = useState<UsuarioAsignable | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(7);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusquedaAplicada(buscar.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [buscar]);

  useEffect(() => {
    let vigente = true;
    const params = new URLSearchParams({
      desde,
      hasta,
      page: String(page),
      limit: String(limit),
    });
    if (busquedaAplicada) params.set("buscar", busquedaAplicada);
    if (responsable) params.set("teamleaderId", String(responsable.id));
    void Promise.all([
      apiFetch<ResumenPresentismo>(`/presentismo/resumen?fecha=${hasta}`),
      apiFetch<RespuestaPaginada<FilaPresentismo>>(
        `/presentismo?${params.toString()}`,
      ),
    ])
      .then(([nuevoResumen, detalle]) => {
        if (!vigente) return;
        setResumen(nuevoResumen);
        setDatos(detalle);
        setError(null);
      })
      .catch((causa) => {
        if (!vigente) return;
        setError(
          causa instanceof ApiError
            ? causa.message
            : "No se pudo cargar el presentismo",
        );
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [busquedaAplicada, desde, hasta, limit, page, responsable]);

  const filas = datos?.items ?? [];
  return (
    <section className="min-w-0">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-300">
          Operación de campo
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          Presentismo del equipo
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Entradas verificadas frente a las presentaciones programadas. Abrí la
          jornada de cada persona para ver sus locales, horarios y marcaciones.
        </p>
      </header>

      {resumen ? (
        <div
          className="mt-6 grid overflow-hidden rounded-xl border border-line bg-surface-raised sm:grid-cols-3"
          aria-label="Resumen de presentismo"
        >
          <Stat etiqueta="Día" metrica={resumen.dia} />
          <Stat etiqueta="Semana" metrica={resumen.semana} />
          <Stat etiqueta="Mes" metrica={resumen.mes} />
        </div>
      ) : null}

      <div className="mt-7 grid gap-3 rounded-xl border border-line bg-surface-raised p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.3fr_1.5fr]">
        <label className={labelBase}>
          Desde
          <input
            className={inputBase}
            type="date"
            value={desde}
            max={hasta}
            onChange={(evento) => {
              setDesde(evento.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className={labelBase}>
          Hasta
          <input
            className={inputBase}
            type="date"
            value={hasta}
            min={desde}
            max={hoy}
            onChange={(evento) => {
              setHasta(evento.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className={labelBase}>
          Buscar persona
          <input
            className={inputBase}
            type="search"
            value={buscar}
            placeholder="Nombre o usuario"
            onChange={(evento) => setBuscar(evento.target.value)}
          />
        </label>
        <label className={labelBase}>
          Responsable directo
          <SelectorUsuario
            value={responsable?.id ?? ""}
            seleccionadoInicial={responsable}
            onChange={() => undefined}
            onSelect={(usuario) => {
              setResponsable(usuario);
              setPage(1);
            }}
          />
        </label>
      </div>

      {error ? <p className={`${errorBox} mt-4`}>{error}</p> : null}

      <ul className="mt-5 space-y-3 md:hidden" aria-label="Detalle de presentismo">
        {filas.map((fila) => (
          <li key={fila.usuario.id} className="border-b border-line py-4 first:pt-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">{fila.usuario.nombre}</p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {fila.teamleader?.nombre ?? fila.usuario.rol ?? "Sin responsable"}
                </p>
              </div>
              <p className="text-2xl font-extrabold text-brand-800 [font-variant-numeric:tabular-nums] dark:text-brand-300">
                {fila.porcentaje}%
              </p>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs [font-variant-numeric:tabular-nums]">
              <p><strong className="block text-base text-foreground">{fila.programadas}</strong><span className="text-muted">Programadas</span></p>
              <p><strong className="block text-base text-foreground">{fila.entradas}</strong><span className="text-muted">Entradas</span></p>
              <p><strong className="block text-base text-foreground">{fila.salidas}</strong><span className="text-muted">Salidas</span></p>
            </div>
            <JornadaPresentismoDetalle fecha={hasta} usuarioId={fila.usuario.id} />
          </li>
        ))}
      </ul>

      {filas.length > 0 ? (
        <div className="mt-5 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] text-left text-sm [font-variant-numeric:tabular-nums]">
            <thead>
              <tr className="border-y border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-3 py-3 font-semibold">Persona</th>
                <th className="px-3 py-3 font-semibold">Responsable</th>
                <th className="px-3 py-3 text-right font-semibold">Locales</th>
                <th className="px-3 py-3 text-right font-semibold">Programadas</th>
                <th className="px-3 py-3 text-right font-semibold">Entradas</th>
                <th className="px-3 py-3 text-right font-semibold">Salidas</th>
                <th className="px-3 py-3 text-right font-semibold">Presentismo</th>
                <th className="px-3 py-3 text-right font-semibold">Jornada</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.usuario.id} className="border-b border-line align-top">
                  <td className="px-3 py-4"><p className="font-semibold">{fila.usuario.nombre}</p><p className="text-xs text-muted">{fila.usuario.rol}</p></td>
                  <td className="px-3 py-4 text-muted">{fila.teamleader?.nombre ?? "-"}</td>
                  <td className="px-3 py-4 text-right">{fila.localesAsignados}</td>
                  <td className="px-3 py-4 text-right">{fila.programadas}</td>
                  <td className="px-3 py-4 text-right">{fila.entradas}</td>
                  <td className="px-3 py-4 text-right">{fila.salidas}</td>
                  <td className="px-3 py-4 text-right font-extrabold text-brand-800 dark:text-brand-300">{fila.porcentaje}%</td>
                  <td className="px-3 py-1 text-right"><JornadaPresentismoDetalle fecha={hasta} usuarioId={fila.usuario.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !cargando && datos ? (
        <p className="mt-5 border-y border-line py-10 text-center text-sm text-muted">
          No hay personas con presentaciones dentro de este filtro.
        </p>
      ) : null}

      {cargando && !datos ? (
        <div className="mt-5 h-40 animate-pulse rounded-xl bg-surface-soft" aria-label="Cargando presentismo" />
      ) : null}
      {datos && datos.total > 0 ? (
        <Paginacion
          page={datos.page}
          totalPages={datos.totalPages}
          total={datos.total}
          limit={datos.limit}
          onPageChange={setPage}
          onLimitChange={(valor) => {
            setLimit(valor);
            setPage(1);
          }}
        />
      ) : null}
    </section>
  );
}
