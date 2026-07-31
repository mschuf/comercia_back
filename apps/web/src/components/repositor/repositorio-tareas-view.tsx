"use client";

/* Hallmark · component: lista operativa de tareas · genre: utilitarian · theme: tokens Comercia
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (46–50) · pre-emit critique: P4 H5 E5 S5 R5 V4
 */

import dynamic from "next/dynamic";
import { Fragment, useEffect, useState } from "react";
import { PantallaCarga } from "@/components/pantalla-carga";
import { Paginacion } from "@/components/paginacion";
import { useRutaDiaria } from "@/components/repositor/ruta-diaria-contexto";
import { useToast } from "@/components/toast/toast-provider";
import { ApiError, apiFetch } from "@/lib/api";
import { obtenerUbicacion } from "@/lib/geolocalizacion";
import type { RespuestaPaginada } from "@/types/paginacion";
import type { TareasLocalRepositor } from "@/types/repositor";
import type { Visita } from "@/types/visita";
import { formatoFechaHora } from "@/utils/fechas";
import {
  formatoFechaProgramacion,
  resumenProgramacion,
} from "@/utils/programacion-visita";

const VisitaActiva = dynamic(
  () =>
    import("@/components/impulsador/visita-activa").then(
      (modulo) => modulo.VisitaActiva,
    ),
  { ssr: false },
);

interface DetalleTareasProps {
  grupo: TareasLocalRepositor;
}

function DetalleTareas({ grupo }: DetalleTareasProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
      <section>
        <h2 className="text-sm font-extrabold text-foreground">
          Datos del local
        </h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              Zona
            </dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {grupo.local.zona?.nombre ?? "Sin zona asignada"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              Fecha puntual
            </dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {formatoFechaHora(grupo.local.fechaVisita)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              Evidencia de presencia
            </dt>
            <dd className="mt-0.5 font-medium text-foreground">
              {grupo.local.requiereFotoPresencia
                ? "Foto obligatoria al finalizar"
                : "No requiere foto al finalizar"}
            </dd>
          </div>
        </dl>
      </section>
      <section>
        <h2 className="text-sm font-extrabold text-foreground">
          Tareas del checklist
        </h2>
        {grupo.tareas.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Este cliente no tiene tareas activas.
          </p>
        ) : (
          <ol className="mt-3 divide-y divide-line rounded-xl border border-line bg-surface-raised">
            {grupo.tareas.map((tarea) => (
              <li key={tarea.id} className="flex gap-3 p-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-accent text-xs font-black text-accent-ink">
                  {tarea.orden}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground">{tarea.titulo}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted">
                    {tarea.descripcion || "Sin instrucciones adicionales"}
                  </p>
                </div>
                <span
                  className={`h-fit rounded-full px-2 py-1 text-[11px] font-bold ${
                    tarea.requiereFoto
                      ? "bg-[var(--accent-soft)] text-accent-ink"
                      : "bg-surface-soft text-muted"
                  }`}
                >
                  {tarea.requiereFoto ? "Foto requerida" : "Sin foto"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

interface ListaTareasMovilProps {
  grupos: TareasLocalRepositor[];
  abiertoId: number | null;
  iniciandoLocalId: number | null;
  onAlternarDetalle: (localId: number) => void;
  onAbrirVisita: (grupo: TareasLocalRepositor) => void;
}

function ListaTareasMovil({
  grupos,
  abiertoId,
  iniciandoLocalId,
  onAlternarDetalle,
  onAbrirVisita,
}: ListaTareasMovilProps) {
  return (
    <ul className="space-y-3 md:hidden" aria-label="Tareas asignadas por local">
      {grupos.map((grupo) => {
        const expandido = abiertoId === grupo.local.id;
        const total = grupo.tareas.length;
        const tareasConFoto = grupo.tareas.filter(
          (tarea) => tarea.requiereFoto,
        ).length;
        const progreso = grupo.visitaCompletadaHoy
          ? 100
          : total === 0
            ? 0
            : Math.round((grupo.completadasEnVisita / total) * 100);
        const visitaEnCurso = grupo.visitaAbiertaId !== null;
        const deshabilitado = grupo.visitaCompletadaHoy;
        const agenda = grupo.local.programacion
          ? resumenProgramacion(grupo.local.programacion)
          : grupo.local.fechaVisita
            ? formatoFechaHora(grupo.local.fechaVisita)
            : "Sin fecha asignada";
        const detalleId = `tareas-local-mobile-${grupo.local.id}`;

        return (
          <li
            key={grupo.local.id}
            className="[contain-intrinsic-size:auto_9rem] [content-visibility:auto]"
          >
            <article
              className={`overflow-hidden rounded-2xl border bg-surface-raised shadow-[0_10px_30px_rgba(var(--warm-shadow),0.05)] ${
                deshabilitado
                  ? "border-brand-200 dark:border-brand-900"
                  : visitaEnCurso
                    ? "border-accent"
                    : "border-line"
              }`}
            >
              <div className="space-y-3 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold uppercase tracking-wide text-accent-ink">
                      {grupo.local.cliente.nombre}
                    </p>
                    <h2 className="mt-0.5 truncate text-base font-extrabold text-foreground">
                      {grupo.local.nombre}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      {grupo.local.zona?.nombre ?? "Sin zona asignada"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      deshabilitado
                        ? "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200"
                        : visitaEnCurso
                          ? "bg-[var(--accent-soft)] text-accent-ink"
                          : "bg-surface-soft text-muted"
                    }`}
                  >
                    {deshabilitado
                      ? "Completada"
                      : visitaEnCurso
                        ? "En curso"
                        : "Pendiente"}
                  </span>
                </div>

                <div className="rounded-xl bg-surface-soft px-3 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Agenda
                  </p>
                  <p className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
                    {agenda}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Checklist
                    </p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
                      {grupo.completadasEnVisita}/{total} tareas
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Evidencia
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-foreground">
                      {tareasConFoto > 0
                        ? `${tareasConFoto} con foto`
                        : grupo.local.requiereFotoPresencia
                          ? "Foto final"
                          : "No requiere"}
                    </p>
                  </div>
                </div>

                <div
                  className="h-1.5 overflow-hidden rounded-full bg-surface-soft"
                  role="progressbar"
                  aria-label={`Progreso de tareas de ${grupo.local.nombre}`}
                  aria-valuemin={0}
                  aria-valuemax={total}
                  aria-valuenow={grupo.completadasEnVisita}
                >
                  <div
                    style={{ width: `${progreso}%` }}
                    className={`h-full rounded-full ${
                      deshabilitado ? "bg-brand-600" : "bg-accent"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onAlternarDetalle(grupo.local.id)}
                    aria-expanded={expandido}
                    aria-controls={detalleId}
                    className="min-h-11 min-w-0 whitespace-nowrap rounded-xl border border-control-line bg-surface-raised px-3 text-xs font-bold text-foreground transition hover:bg-surface-soft active:translate-y-px focus-visible:ring-2 focus-visible:ring-focus"
                  >
                    {expandido ? "Ocultar" : "Ver detalle"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onAbrirVisita(grupo)}
                    disabled={deshabilitado || iniciandoLocalId !== null}
                    className={`min-h-11 min-w-0 whitespace-nowrap rounded-xl px-3 text-xs font-extrabold transition active:translate-y-px focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0 ${
                      deshabilitado
                        ? "border border-line bg-surface-soft text-muted"
                        : visitaEnCurso
                          ? "bg-accent text-brand-950 hover:brightness-105"
                          : "bg-brand-700 text-white hover:bg-brand-800"
                    }`}
                  >
                    {iniciandoLocalId === grupo.local.id
                      ? "Verificando GPS…"
                      : visitaEnCurso
                        ? "Continuar visita"
                        : deshabilitado
                          ? "Completada"
                          : "Iniciar visita"}
                  </button>
                </div>
              </div>

              {expandido ? (
                <div id={detalleId} className="border-t border-line p-4">
                  <DetalleTareas grupo={grupo} />
                </div>
              ) : null}
            </article>
          </li>
        );
      })}
    </ul>
  );
}

export function RepositorTareasView() {
  const { invalidarRuta } = useRutaDiaria();
  const { cerrarToastPorClave, mostrarToast } = useToast();
  const [respuesta, setRespuesta] =
    useState<RespuestaPaginada<TareasLocalRepositor> | null>(null);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(7);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresco, setRefresco] = useState(0);
  const [iniciandoLocalId, setIniciandoLocalId] = useState<number | null>(null);
  const [visita, setVisita] = useState<Visita | null>(null);

  useEffect(() => {
    let vigente = true;
    apiFetch<RespuestaPaginada<TareasLocalRepositor>>(
      `/repositor/tareas?page=${pagina}&limit=${limite}`,
    )
      .then((datos) => {
        if (vigente) {
          setRespuesta(datos);
          setError(null);
        }
      })
      .catch((problema) => {
        if (vigente)
          setError(
            problema instanceof ApiError
              ? problema.message
              : "No pudimos cargar tus tareas",
          );
      });
    return () => {
      vigente = false;
    };
  }, [limite, pagina, refresco]);

  async function abrirVisita(grupo: TareasLocalRepositor) {
    if (iniciandoLocalId !== null || grupo.visitaCompletadaHoy) return;
    cerrarToastPorClave("inicio-visita");
    setIniciandoLocalId(grupo.local.id);
    try {
      if (grupo.visitaAbiertaId !== null) {
        setVisita(await apiFetch<Visita>(`/visitas/${grupo.visitaAbiertaId}`));
      } else {
        const posicion = await obtenerUbicacion({ maximumAge: 0 });
        setVisita(
          await apiFetch<Visita>("/visitas", {
            method: "POST",
            body: JSON.stringify({
              localId: grupo.local.id,
              latitud: posicion.latitud,
              longitud: posicion.longitud,
              precisionMetros: posicion.precision,
            }),
          }),
        );
        mostrarToast({
          tipo: "exito",
          clave: "inicio-visita",
          titulo: "Visita iniciada",
          mensaje: `Ya podés completar las tareas de ${grupo.local.nombre}.`,
        });
      }
      invalidarRuta();
    } catch (problema) {
      mostrarToast({
        tipo: "error",
        clave: "inicio-visita",
        titulo: "No se pudo iniciar la visita",
        mensaje:
          problema instanceof Error
            ? problema.message
            : "No pudimos iniciar la visita",
      });
    } finally {
      setIniciandoLocalId(null);
    }
  }

  function refrescarTareas() {
    setVisita(null);
    setAbierto(null);
    setRespuesta(null);
    setRefresco((actual) => actual + 1);
  }

  function alternarDetalle(localId: number) {
    setAbierto((actual) => (actual === localId ? null : localId));
  }

  function visitaFinalizada() {
    invalidarRuta();
    refrescarTareas();
  }

  return (
    <div
      className="w-full min-w-0 space-y-4 sm:space-y-5"
      aria-busy={iniciandoLocalId !== null}
    >
      <section className="relative overflow-hidden rounded-2xl border border-brand-800 bg-commercial-ink p-4 text-white shadow-[0_16px_40px_rgba(var(--warm-shadow),0.18)] sm:p-5">
        <div className="absolute right-5 top-4 h-20 w-20 rounded-full border-[14px] border-accent/20" />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-on-ink sm:text-[11px]">
            Checklist operativo
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
            Mis tareas
          </h1>
          <p className="mt-1 max-w-xl text-xs text-white/80 sm:text-sm">
            Iniciá la visita del local, resolvé sus tareas y registrá la
            evidencia desde un solo lugar.
          </p>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : respuesta === null ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : respuesta.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface-raised p-10 text-center text-sm text-muted">
          No hay tareas porque todavía no tenés locales asignados.
        </div>
      ) : (
        <>
          <ListaTareasMovil
            grupos={respuesta.items}
            abiertoId={abierto}
            iniciandoLocalId={iniciandoLocalId}
            onAlternarDetalle={alternarDetalle}
            onAbrirVisita={(grupo) => void abrirVisita(grupo)}
          />
          <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface-raised shadow-[0_10px_30px_rgba(var(--warm-shadow),0.05)] md:block">
            <table
              className="w-full min-w-[980px] text-left text-sm"
              aria-label="Tareas asignadas por local"
            >
              <thead className="bg-surface-soft text-xs font-semibold uppercase tracking-wide text-foreground">
                <tr className="border-b border-line">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Local y cliente
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Agenda
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Checklist
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {respuesta.items.map((grupo) => {
                  const expandido = abierto === grupo.local.id;
                  const total = grupo.tareas.length;
                  const progreso = grupo.visitaCompletadaHoy
                    ? 100
                    : total === 0
                      ? 0
                      : Math.round((grupo.completadasEnVisita / total) * 100);
                  const visitaEnCurso = grupo.visitaAbiertaId !== null;
                  const deshabilitado = grupo.visitaCompletadaHoy;
                  const agenda = grupo.local.programacion
                    ? resumenProgramacion(grupo.local.programacion)
                    : grupo.local.fechaVisita
                      ? formatoFechaHora(grupo.local.fechaVisita)
                      : "Sin fecha asignada";
                  return (
                    <Fragment key={grupo.local.id}>
                      <tr
                        className={`border-b border-line align-top transition hover:bg-surface-soft ${
                          deshabilitado
                            ? "bg-surface-soft/50"
                            : "bg-surface-raised"
                        }`}
                      >
                        <td className="px-4 py-4">
                          <p className="font-bold text-foreground">
                            {grupo.local.nombre}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {grupo.local.cliente.nombre}
                            {grupo.local.zona
                              ? ` · ${grupo.local.zona.nombre}`
                              : " · Sin zona"}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="max-w-64 font-medium text-foreground">
                            {agenda}
                          </p>
                          {grupo.local.programacion ? (
                            <p className="mt-1 text-xs text-muted">
                              Desde{" "}
                              {formatoFechaProgramacion(
                                grupo.local.programacion.fechaInicio,
                              )}
                              {grupo.local.programacion.fechaFin
                                ? ` hasta ${formatoFechaProgramacion(grupo.local.programacion.fechaFin)}`
                                : ""}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold tabular-nums text-foreground">
                            {total} {total === 1 ? "tarea" : "tareas"}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">
                            {
                              grupo.tareas.filter((tarea) => tarea.requiereFoto)
                                .length
                            }{" "}
                            con foto requerida
                            {grupo.local.requiereFotoPresencia
                              ? " · Foto al finalizar"
                              : ""}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                              deshabilitado
                                ? "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200"
                                : visitaEnCurso
                                  ? "bg-[var(--accent-soft)] text-accent-ink"
                                  : "bg-surface-soft text-muted"
                            }`}
                          >
                            {deshabilitado
                              ? "Visita completada"
                              : visitaEnCurso
                                ? "Visita en curso"
                                : "Pendiente"}
                          </span>
                          <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-surface-soft">
                            <div
                              style={{ width: `${progreso}%` }}
                              className={`h-full rounded-full ${
                                deshabilitado ? "bg-brand-600" : "bg-accent"
                              }`}
                            />
                          </div>
                          <p className="mt-1 text-xs tabular-nums text-muted">
                            {grupo.completadasEnVisita}/{total} completadas
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex min-w-40 flex-col items-end gap-2">
                            <button
                              type="button"
                              onClick={() => alternarDetalle(grupo.local.id)}
                              aria-expanded={expandido}
                              aria-controls={`tareas-local-table-${grupo.local.id}`}
                              className="min-h-10 whitespace-nowrap rounded-lg border border-control-line bg-surface-raised px-3 text-xs font-bold text-foreground transition hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-focus"
                            >
                              {expandido ? "Ocultar detalle" : "Ver detalle"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void abrirVisita(grupo)}
                              disabled={
                                deshabilitado || iniciandoLocalId !== null
                              }
                              className={`min-h-11 whitespace-nowrap rounded-lg px-3 text-xs font-extrabold transition active:translate-y-px focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0 ${
                                deshabilitado
                                  ? "border border-line bg-surface-soft text-muted"
                                  : visitaEnCurso
                                    ? "bg-accent text-brand-950 hover:brightness-105"
                                    : "bg-brand-700 text-white hover:bg-brand-800"
                              }`}
                            >
                              {iniciandoLocalId === grupo.local.id
                                ? "Verificando GPS…"
                                : visitaEnCurso
                                  ? "Continuar visita"
                                  : deshabilitado
                                    ? "Completada"
                                    : "Iniciar visita"}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandido ? (
                        <tr
                          id={`tareas-local-table-${grupo.local.id}`}
                          className="border-b border-line bg-surface-soft/60"
                        >
                          <td colSpan={5} className="p-4 sm:p-5">
                            <DetalleTareas grupo={grupo} />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Paginacion
            page={respuesta.page}
            totalPages={respuesta.totalPages}
            total={respuesta.total}
            limit={respuesta.limit}
            onPageChange={setPagina}
            onLimitChange={(valor) => {
              setLimite(valor);
              setPagina(1);
            }}
          />
        </>
      )}

      {visita ? (
        <VisitaActiva
          visita={visita}
          onCerrar={refrescarTareas}
          onFinalizada={visitaFinalizada}
        />
      ) : null}

      <PantallaCarga
        visible={iniciandoLocalId !== null}
        mensaje="Preparando la visita"
        detalle="Verificamos tu ubicación y cargamos las tareas del local."
      />
    </div>
  );
}
