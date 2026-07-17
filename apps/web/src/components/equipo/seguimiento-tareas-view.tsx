"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { PantallaCarga } from "@/components/pantalla-carga";
import { Paginacion } from "@/components/paginacion";
import { btnGhost, errorBox } from "@/components/ui";
import { formatoFechaHora } from "@/utils/fechas";
import type {
  EstadoSeguimientoTarea,
  ResumenSeguimientoTareas,
  TareaSeguimiento,
} from "@/types/equipo";
import type { RespuestaPaginada } from "@/types/paginacion";

const INTERVALO_ACTUALIZACION_MS = 12_000;
type FiltroEstado = "TODAS" | EstadoSeguimientoTarea;

export interface FiltrosSeguimientoTareas {
  repositorId?: number;
  localId?: number;
  repositorNombre?: string;
  localNombre?: string;
}

interface RespuestaSeguimiento extends RespuestaPaginada<TareaSeguimiento> {
  resumen: ResumenSeguimientoTareas;
}

export function SeguimientoTareasView({
  filtros,
}: {
  filtros: FiltrosSeguimientoTareas;
}) {
  const router = useRouter();
  const [datos, setDatos] = useState<RespuestaSeguimiento | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(7);
  const [estado, setEstado] = useState<FiltroEstado>("TODAS");
  const [error, setError] = useState<string | null>(null);
  const [cargandoInicial, setCargandoInicial] = useState(true);
  const [actualizandoManual, setActualizandoManual] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(
    null,
  );
  const [navegando, setNavegando] = useState(false);
  const secuenciaSolicitud = useRef(0);
  const montado = useRef(true);
  const actualizacionManualEnCurso = useRef(false);

  const cargar = useCallback(
    async (modo: "INICIAL" | "SILENCIOSO" | "MANUAL") => {
      const solicitudActual = ++secuenciaSolicitud.current;
      if (modo === "MANUAL") {
        actualizacionManualEnCurso.current = true;
        setActualizandoManual(true);
      }

      const parametros = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (filtros.repositorId) {
        parametros.set("repositorId", String(filtros.repositorId));
      }
      if (filtros.localId) parametros.set("localId", String(filtros.localId));
      if (estado !== "TODAS") parametros.set("estado", estado);

      try {
        const respuesta = await apiFetch<RespuestaSeguimiento>(
          `/equipo/tareas?${parametros.toString()}`,
        );
        if (solicitudActual !== secuenciaSolicitud.current || !montado.current) {
          return;
        }
        const ultimaPaginaValida = Math.max(1, respuesta.totalPages);
        if (page > ultimaPaginaValida) {
          setPage(ultimaPaginaValida);
          return;
        }
        setDatos(respuesta);
        setError(null);
        setUltimaActualizacion(new Date());
      } catch (err) {
        if (solicitudActual !== secuenciaSolicitud.current || !montado.current) {
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudo actualizar el seguimiento",
        );
      } finally {
        if (
          solicitudActual === secuenciaSolicitud.current &&
          montado.current
        ) {
          setCargandoInicial(false);
        }
        if (modo === "MANUAL") {
          actualizacionManualEnCurso.current = false;
          if (montado.current) setActualizandoManual(false);
        }
      }
    },
    [estado, filtros.localId, filtros.repositorId, limit, page],
  );

  useEffect(() => {
    const fotograma = window.requestAnimationFrame(() => {
      void cargar("INICIAL");
    });
    return () => {
      window.cancelAnimationFrame(fotograma);
      secuenciaSolicitud.current += 1;
    };
  }, [cargar]);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      secuenciaSolicitud.current += 1;
    };
  }, []);

  useEffect(() => {
    const actualizarSiVisible = () => {
      if (
        document.visibilityState === "visible" &&
        !actualizacionManualEnCurso.current
      ) {
        void cargar("SILENCIOSO");
      }
    };
    const intervalo = window.setInterval(
      actualizarSiVisible,
      INTERVALO_ACTUALIZACION_MS,
    );
    document.addEventListener("visibilitychange", actualizarSiVisible);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", actualizarSiVisible);
    };
  }, [cargar]);

  function volverALocales() {
    if (navegando) return;
    setNavegando(true);
    const parametros = new URLSearchParams({ vista: "locales" });
    if (filtros.repositorId) {
      parametros.set("usuarioId", String(filtros.repositorId));
    }
    if (filtros.repositorNombre) {
      parametros.set("repositor", filtros.repositorNombre);
    }
    router.push(`/panel/team-leader/clientes?${parametros.toString()}`);
  }

  const filas = datos?.items ?? [];
  const resumen = datos?.resumen;
  const porcentaje = resumen?.total
    ? Math.round((resumen.completadas / resumen.total) * 100)
    : 0;

  return (
    <div className="min-w-0 w-full">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Seguimiento del equipo
          </p>
          <h1 className="mt-1 text-lg font-bold tracking-tight sm:text-xl">
            Tareas {filtros.localNombre ? `· ${filtros.localNombre}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {filtros.repositorNombre
              ? `Repositor: ${filtros.repositorNombre}`
              : "Avance de los repositores a tu cargo."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={volverALocales}
            className={btnGhost}
          >
            Volver a locales
          </button>
          <button
            type="button"
            onClick={() => void cargar("MANUAL")}
            disabled={actualizandoManual}
            className={`${btnGhost} gap-2`}
          >
            <IconoActualizar /> Actualizar
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="rounded-xl border border-line bg-surface-raised p-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-foreground">Progreso</span>
            <span className="text-muted [font-variant-numeric:tabular-nums]">
              {resumen
                ? `${resumen.completadas}/${resumen.total} · ${porcentaje}%`
                : "Calculando…"}
            </span>
          </div>
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-soft"
            role="progressbar"
            aria-label="Progreso de tareas"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={porcentaje}
          >
            <div
              className="h-full rounded-full bg-brand-700 transition-[width] duration-500 dark:bg-brand-400"
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          {resumen ? (
            <p className="mt-2 text-xs text-muted">
              {resumen.pendientes} pendientes · {resumen.completadas} completadas
            </p>
          ) : null}
        </div>
        <p className="text-xs text-muted sm:pb-1 sm:text-right">
          Actualización automática cada 12 s
          <span className="block [font-variant-numeric:tabular-nums]">
            Última: {ultimaActualizacion ? ultimaActualizacion.toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}
          </span>
        </p>
      </div>

      <div
        className="mt-4 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-surface-raised p-1"
        role="group"
        aria-label="Filtrar tareas por estado"
      >
        {(["TODAS", "PENDIENTE", "COMPLETADA"] as FiltroEstado[]).map(
          (opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => {
                setEstado(opcion);
                setPage(1);
              }}
              className={`min-h-10 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-focus ${
                estado === opcion
                  ? "bg-brand-700 text-white dark:bg-brand-400 dark:text-brand-950"
                  : "text-muted hover:bg-surface-soft hover:text-foreground"
              }`}
            >
              {opcion === "TODAS"
                ? "Todas"
                : opcion === "PENDIENTE"
                  ? "Pendientes"
                  : "Completadas"}
            </button>
          ),
        )}
      </div>

      {error ? <p className={`${errorBox} mt-4`}>{error}</p> : null}

      {filas.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface-raised">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-surface-soft">
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-foreground">
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Tarea</th>
                <th className="px-4 py-3 font-medium">Local / cliente</th>
                <th className="px-4 py-3 font-medium">Repositor</th>
                <th className="px-4 py-3 font-medium">Evidencia</th>
                <th className="px-4 py-3 font-medium">Completada</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((tarea) => (
                <tr
                  key={`${tarea.tareaId}-${tarea.visitaTareaId ?? "sin-visita"}`}
                  className="border-b border-line bg-surface-raised align-top transition last:border-0 hover:bg-surface-soft"
                >
                  <td className="px-4 py-3">
                    <EstadoTarea estado={tarea.estado} />
                  </td>
                  <td className="max-w-sm px-4 py-3">
                    <p className="font-semibold text-foreground">
                      {tarea.titulo}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">
                      {tarea.descripcion}
                    </p>
                    {tarea.comentario ? (
                      <p className="mt-2 rounded-lg bg-surface-soft px-2.5 py-2 text-xs text-foreground">
                        {tarea.comentario}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">
                      {tarea.local.nombre}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {tarea.cliente.nombre}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {tarea.repositor.nombre}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {tarea.requiereFoto
                      ? tarea.tieneFoto
                        ? "Foto recibida"
                        : "Foto pendiente"
                      : "No requerida"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted [font-variant-numeric:tabular-nums]">
                    {formatoFechaHora(tarea.completadaEn)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!cargandoInicial && filas.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-surface-raised px-4 py-10 text-center text-sm text-muted">
          No hay tareas {estado === "PENDIENTE" ? "pendientes" : estado === "COMPLETADA" ? "completadas" : ""} para este filtro.
        </div>
      ) : null}

      {cargandoInicial && !datos ? (
        <div className="mt-4 animate-pulse rounded-xl border border-line bg-surface-raised p-6">
          <div className="h-24 rounded bg-surface-soft" />
        </div>
      ) : null}

      {datos && datos.total > 0 ? (
        <Paginacion
          page={datos.page}
          totalPages={datos.totalPages}
          total={datos.total}
          limit={datos.limit}
          onPageChange={setPage}
          onLimitChange={(nuevoLimite) => {
            setLimit(nuevoLimite);
            setPage(1);
          }}
        />
      ) : null}

      <PantallaCarga
        visible={actualizandoManual}
        mensaje="Actualizando tareas"
        detalle="Consultamos el avance más reciente del repositor."
      />
      <PantallaCarga
        visible={navegando}
        mensaje="Volviendo a locales"
        detalle="Conservamos el filtro del repositor seleccionado."
      />
    </div>
  );
}

function EstadoTarea({ estado }: { estado: EstadoSeguimientoTarea }) {
  const completada = estado === "COMPLETADA";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        completada
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
          : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
      }`}
    >
      {completada ? "Completada" : "Pendiente"}
    </span>
  );
}

function IconoActualizar() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M15.312 11.424a5.5 5.5 0 01-9.201 2.35.75.75 0 00-1.06 1.06 7 7 0 0011.651-3.168l.227 1.136a.75.75 0 101.471-.294l-.75-3.75a.75.75 0 00-.882-.588l-3.75.75a.75.75 0 10.294 1.47l2-.4v1.434zM4.688 8.576a5.5 5.5 0 019.201-2.35.75.75 0 001.06-1.06A7 7 0 003.298 8.334L3.071 7.2A.75.75 0 101.6 7.492l.75 3.75a.75.75 0 00.882.588l3.75-.75a.75.75 0 10-.294-1.47l-2 .4V8.576z"
        clipRule="evenodd"
      />
    </svg>
  );
}
