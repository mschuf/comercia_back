"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { urlFotoVisita } from "@/lib/api-archivos";
import { Modal } from "@/components/modal";
import { Paginacion } from "@/components/paginacion";
import { EditorProgramacionVisita } from "@/components/impulsador/editor-programacion-visita";
import { errorBox } from "@/components/ui";
import { formatoFechaHora } from "@/utils/fechas";
import {
  formatoFechaProgramacion,
  resumenProgramacion,
} from "@/utils/programacion-visita";
import type { RespuestaPaginada } from "@/types/paginacion";
import type { VisitaEquipoLocal, VisitaResumen } from "@/types/visita";

type Tab = "locales" | "historial";

const badgeBase =
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";
const badgeZinc = `${badgeBase} bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400`;

function IconoEditar() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M13.59 3.59a2 2 0 012.82 2.82l-.79.8-2.83-2.83.8-.79zM11.38 5.79L3 14.17V17h2.83l8.38-8.38-2.83-2.83z" />
    </svg>
  );
}

// Badge de la próxima visita: rojo vencida, ámbar hoy, zinc futura o sin fecha
function claseProximaVisita(fechaIso: string | null): string {
  if (!fechaIso) return badgeZinc;
  const f = new Date(fechaIso);
  if (Number.isNaN(f.getTime())) return badgeZinc;
  const hoy = new Date();
  const diaVisita = new Date(
    f.getFullYear(),
    f.getMonth(),
    f.getDate(),
  ).getTime();
  const diaHoy = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate(),
  ).getTime();
  if (diaVisita < diaHoy)
    return `${badgeBase} bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300`;
  if (diaVisita === diaHoy)
    return `${badgeBase} bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300`;
  return badgeZinc;
}

function EstadoVisita({ visita }: { visita: VisitaResumen }) {
  if (visita.completadaEn) {
    return (
      <span className="inline-flex flex-col items-start gap-0.5">
        <span
          className={`${badgeBase} bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300`}
        >
          Completada
        </span>
        <span className="text-[11px] text-zinc-500 [font-variant-numeric:tabular-nums] dark:text-zinc-400">
          {formatoFechaHora(visita.completadaEn)}
        </span>
      </span>
    );
  }
  return (
    <span
      className={`${badgeBase} bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300`}
    >
      En curso
    </span>
  );
}

// Thumbnail de la foto de presencia: abre el visor grande
function BotonFoto({
  visita,
  onVer,
}: {
  visita: VisitaResumen;
  onVer: (nombre: string) => void;
}) {
  const nombre = visita.fotoPresencia;
  if (!nombre) {
    return <span className="text-zinc-400 dark:text-zinc-500">—</span>;
  }
  return (
    <button
      type="button"
      onClick={() => onVer(nombre)}
      aria-label={`Ver foto de presencia de ${visita.localNombre}`}
      className="cursor-pointer rounded-lg transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand-600/40"
    >
      {/* Foto autenticada por cookie: next/image no puede optimizarla */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={urlFotoVisita(nombre)}
        crossOrigin="use-credentials"
        alt=""
        className="h-10 w-10 rounded-lg border border-zinc-200 object-cover dark:border-zinc-800"
      />
    </button>
  );
}

export function VisitasView() {
  const [tab, setTab] = useState<Tab>("locales");
  // se incrementa al finalizar una visita para refrescar ambos listados
  const [refresco, setRefresco] = useState(0);

  // Tab de programación del equipo
  const [pageLocales, setPageLocales] = useState(1);
  const [limitLocales, setLimitLocales] = useState(7);
  const [equipo, setEquipo] =
    useState<RespuestaPaginada<VisitaEquipoLocal> | null>(null);
  const [cargandoEquipo, setCargandoEquipo] = useState(true);
  const [errorEquipo, setErrorEquipo] = useState<string | null>(null);
  const [editandoProgramacion, setEditandoProgramacion] =
    useState<VisitaEquipoLocal | null>(null);

  // Tab "Historial"
  const [pageHistorial, setPageHistorial] = useState(1);
  const [limitHistorial, setLimitHistorial] = useState(7);
  const [historial, setHistorial] =
    useState<RespuestaPaginada<VisitaResumen> | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [errorHistorial, setErrorHistorial] = useState<string | null>(null);

  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    apiFetch<RespuestaPaginada<VisitaEquipoLocal>>(
      `/visitas/equipo?page=${pageLocales}&limit=${limitLocales}`,
    )
      .then((data) => {
        if (vigente) {
          setEquipo(data);
          setErrorEquipo(null);
        }
      })
      .catch((err) => {
        if (vigente) {
          setErrorEquipo(
            err instanceof ApiError
              ? err.message
              : "No se pudo cargar el equipo",
          );
        }
      })
      .finally(() => {
        if (vigente) setCargandoEquipo(false);
      });
    return () => {
      vigente = false;
    };
  }, [pageLocales, limitLocales, refresco]);

  useEffect(() => {
    if (tab !== "historial") return;
    let vigente = true;
    apiFetch<RespuestaPaginada<VisitaResumen>>(
      `/visitas?page=${pageHistorial}&limit=${limitHistorial}`,
    )
      .then((data) => {
        if (vigente) {
          setHistorial(data);
          setErrorHistorial(null);
        }
      })
      .catch((err) => {
        if (vigente) {
          setErrorHistorial(
            err instanceof ApiError
              ? err.message
              : "No se pudo cargar el historial",
          );
        }
      })
      .finally(() => {
        if (vigente) setCargandoHistorial(false);
      });
    return () => {
      vigente = false;
    };
  }, [tab, pageHistorial, limitHistorial, refresco]);

  const itemsEquipo = equipo?.items ?? [];
  const itemsHistorial = historial?.items ?? [];

  const tabClase = (t: Tab) =>
    `border-b-2 px-4 py-2.5 text-sm font-medium transition ${
      tab === t
        ? "border-brand-700 text-brand-800 dark:border-brand-400 dark:text-brand-300"
        : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
    }`;

  return (
    <div>
      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setTab("locales")}
          className={tabClase("locales")}
        >
          Programación
        </button>
        <button
          type="button"
          onClick={() => setTab("historial")}
          className={tabClase("historial")}
        >
          Historial
        </button>
      </div>

      {tab === "locales" && (
        <div className="mt-6">
          {cargandoEquipo && !equipo ? (
            <p className="text-sm text-zinc-400">Cargando equipo...</p>
          ) : errorEquipo && !equipo ? (
            <p className={errorBox}>{errorEquipo}</p>
          ) : (
            <>
              {errorEquipo && (
                <p className={`${errorBox} mb-4`}>{errorEquipo}</p>
              )}

              <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  Agenda de visitas
                </h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Definí visitas únicas, semanales o mensuales. Cada local puede
                  tener varios días y varios horarios por día.
                </p>
              </div>

              {itemsEquipo.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Todavia no hay locales para supervisar.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  <table className="w-full min-w-[1080px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                        <th scope="col" className="px-4 py-3 font-medium">
                          Local
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Asignación
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Programación
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Próxima visita
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Última visita
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Estado
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-right font-medium"
                        >
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsEquipo.map((l) => {
                        const ultima = l.ultimaVisita;
                        return (
                          <tr
                            key={l.localId}
                            className="border-b border-zinc-100 align-middle transition last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40"
                          >
                            <td className="px-4 py-3">
                              <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                                {l.localNombre}
                              </span>
                              <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                                {l.clienteNombre}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="block font-medium text-zinc-700 dark:text-zinc-200">
                                {l.asignadoA?.nombre ?? "Sin asignar"}
                              </span>
                              <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                                {l.zona?.nombre ?? "Sin zona"}
                              </span>
                            </td>
                            <td className="max-w-72 px-4 py-3">
                              <span className="block text-sm text-zinc-700 dark:text-zinc-200">
                                {resumenProgramacion(l.programacion)}
                              </span>
                              {l.programacion?.fechaFin && (
                                <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                                  Hasta{" "}
                                  {formatoFechaProgramacion(
                                    l.programacion.fechaFin,
                                  )}
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <span
                                className={claseProximaVisita(l.fechaVisita)}
                              >
                                {formatoFechaHora(l.fechaVisita)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {ultima ? (
                                <div className="flex flex-col items-start gap-1">
                                  <span className="whitespace-nowrap text-xs text-zinc-500 [font-variant-numeric:tabular-nums] dark:text-zinc-400">
                                    {formatoFechaHora(ultima.iniciadaEn)}
                                  </span>
                                  <span
                                    className={`${badgeBase} ${
                                      ultima.completadaEn
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                        : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                    }`}
                                  >
                                    {ultima.completadaEn
                                      ? "Completada"
                                      : "En curso"}
                                  </span>
                                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {ultima.tareasCompletadas}/
                                    {ultima.tareasTotal} tareas
                                  </span>
                                </div>
                              ) : (
                                <span className="text-zinc-400 dark:text-zinc-500">
                                  Sin visitas
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`${badgeBase} ${
                                  !l.activo || l.programacion?.activo === false
                                    ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                    : l.programacion
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                }`}
                              >
                                {!l.activo
                                  ? "Local inactivo"
                                  : l.programacion?.activo === false
                                    ? "Pausada"
                                    : l.programacion
                                      ? "Programada"
                                      : "Sin programar"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => setEditandoProgramacion(l)}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-700 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-brand-700 dark:hover:bg-brand-950 dark:hover:text-brand-200"
                              >
                                <IconoEditar />
                                {l.programacion ? "Editar" : "Programar"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {equipo && equipo.total > 0 && (
                <Paginacion
                  page={equipo.page}
                  totalPages={equipo.totalPages}
                  total={equipo.total}
                  limit={equipo.limit}
                  onPageChange={setPageLocales}
                  onLimitChange={(l) => {
                    setLimitLocales(l);
                    setPageLocales(1);
                  }}
                />
              )}
            </>
          )}
        </div>
      )}

      {tab === "historial" && (
        <div className="mt-6">
          {cargandoHistorial && !historial ? (
            <p className="text-sm text-zinc-400">Cargando historial...</p>
          ) : errorHistorial && !historial ? (
            <p className={errorBox}>{errorHistorial}</p>
          ) : (
            <>
              {errorHistorial && (
                <p className={`${errorBox} mb-4`}>{errorHistorial}</p>
              )}

              {itemsHistorial.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Todavía no hay visitas registradas.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                        <th scope="col" className="px-4 py-3 font-medium">
                          Local
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Usuario
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Iniciada
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Estado
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Distancia
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Checklist
                        </th>
                        <th scope="col" className="px-4 py-3 font-medium">
                          Foto
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsHistorial.map((v) => (
                        <tr
                          key={v.id}
                          className="border-b border-zinc-100 align-middle transition last:border-0 hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40"
                        >
                          <td className="px-4 py-3 font-medium">
                            {v.localNombre}
                          </td>
                          <td className="px-4 py-3">{v.usuarioNombre}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-zinc-500 [font-variant-numeric:tabular-nums] dark:text-zinc-400">
                            {formatoFechaHora(v.iniciadaEn)}
                          </td>
                          <td className="px-4 py-3">
                            <EstadoVisita visita={v} />
                          </td>
                          <td className="px-4 py-3 text-zinc-500 [font-variant-numeric:tabular-nums] dark:text-zinc-400">
                            {Math.round(v.distanciaMetros)} m
                          </td>
                          <td className="px-4 py-3 text-zinc-500 [font-variant-numeric:tabular-nums] dark:text-zinc-400">
                            {v.tareasCompletadas}/{v.tareasTotal}
                          </td>
                          <td className="px-4 py-3">
                            <BotonFoto visita={v} onVer={setFotoAmpliada} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {historial && historial.total > 0 && (
                <Paginacion
                  page={historial.page}
                  totalPages={historial.totalPages}
                  total={historial.total}
                  limit={historial.limit}
                  onPageChange={setPageHistorial}
                  onLimitChange={(l) => {
                    setLimitHistorial(l);
                    setPageHistorial(1);
                  }}
                />
              )}
            </>
          )}
        </div>
      )}

      {editandoProgramacion && (
        <EditorProgramacionVisita
          key={editandoProgramacion.localId}
          local={editandoProgramacion}
          onCerrar={() => setEditandoProgramacion(null)}
          onGuardada={() => setRefresco((actual) => actual + 1)}
        />
      )}

      {/* Visor grande de la foto de presencia del historial */}
      <Modal
        titulo="Foto de presencia"
        abierto={fotoAmpliada !== null}
        onCerrar={() => setFotoAmpliada(null)}
        ancho="lg"
      >
        {fotoAmpliada && (
          /* Foto autenticada por cookie: next/image no puede optimizarla */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urlFotoVisita(fotoAmpliada)}
            crossOrigin="use-credentials"
            alt="Foto de presencia"
            className="max-h-[70dvh] w-full rounded-lg object-contain"
          />
        )}
      </Modal>
    </div>
  );
}
