"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { urlFotoVisita } from "@/lib/api-archivos";
import { obtenerUbicacion } from "@/lib/geolocalizacion";
import { Modal } from "@/components/modal";
import { Paginacion } from "@/components/paginacion";
import { VisitaActiva } from "@/components/impulsador/visita-activa";
import { btnPrimary, errorBox } from "@/components/ui";
import { formatoFecha, formatoFechaHora } from "@/utils/fechas";
import type { ConfigImpulsador } from "@/types/impulsador-config";
import type { Local } from "@/types/local";
import type { RespuestaPaginada } from "@/types/paginacion";
import type {
  Visita,
  VisitaEquipoLocal,
  VisitaResumen,
} from "@/types/visita";

type Tab = "locales" | "historial";
type GrupoEquipo = {
  usuario: { id: number; nombre: string } | null;
  locales: VisitaEquipoLocal[];
};

const badgeBase =
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";
const badgeZinc = `${badgeBase} bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400`;

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// Badge de la próxima visita: rojo vencida, ámbar hoy, zinc futura o sin fecha
function claseProximaVisita(fechaIso: string | null): string {
  if (!fechaIso) return badgeZinc;
  const f = new Date(fechaIso);
  if (Number.isNaN(f.getTime())) return badgeZinc;
  const hoy = new Date();
  const diaVisita = new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime();
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
  const [config, setConfig] = useState<ConfigImpulsador | null>(null);
  const [errorConfig, setErrorConfig] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("locales");
  // se incrementa al finalizar una visita para refrescar ambos listados
  const [refresco, setRefresco] = useState(0);

  // Tab "Mis locales"
  const [pageLocales, setPageLocales] = useState(1);
  const [limitLocales, setLimitLocales] = useState(7);
  const [locales, setLocales] = useState<RespuestaPaginada<Local> | null>(null);
  const [cargandoLocales, setCargandoLocales] = useState(true);
  const [errorLocales, setErrorLocales] = useState<string | null>(null);
  const [equipo, setEquipo] =
    useState<RespuestaPaginada<VisitaEquipoLocal> | null>(null);
  const [cargandoEquipo, setCargandoEquipo] = useState(true);
  const [errorEquipo, setErrorEquipo] = useState<string | null>(null);

  // Inicio de visita (geolocalización + POST /visitas)
  const [iniciando, setIniciando] = useState<number | null>(null);
  const [errorInicio, setErrorInicio] = useState<{
    localId: number;
    mensaje: string;
  } | null>(null);
  const [visitaActiva, setVisitaActiva] = useState<Visita | null>(null);

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
    apiFetch<ConfigImpulsador>("/impulsador/config")
      .then((c) => {
        if (vigente) setConfig(c);
      })
      .catch((err) => {
        if (vigente) {
          setErrorConfig(
            err instanceof ApiError
              ? err.message
              : "No se pudo cargar la configuración del módulo",
          );
        }
      });
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    if (!config || config.esGestor) return;
    let vigente = true;
    apiFetch<RespuestaPaginada<Local>>(
      `/locales?page=${pageLocales}&limit=${limitLocales}`,
    )
      .then((data) => {
        if (vigente) {
          setLocales(data);
          setErrorLocales(null);
        }
      })
      .catch((err) => {
        if (vigente) {
          setErrorLocales(
            err instanceof ApiError
              ? err.message
              : "No se pudieron cargar los locales",
          );
        }
      })
      .finally(() => {
        if (vigente) setCargandoLocales(false);
      });
    return () => {
      vigente = false;
    };
  }, [config, pageLocales, limitLocales, refresco]);

  useEffect(() => {
    if (!config?.esGestor) return;
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
  }, [config, pageLocales, limitLocales, refresco]);

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

  async function iniciarVisita(local: Local) {
    if (iniciando !== null) return;
    setErrorInicio(null);
    setIniciando(local.id);
    try {
      const ubicacion = await obtenerUbicacion();
      // Si ya había una visita abierta en este local, el back la devuelve
      // y el flujo continúa donde quedó
      const visita = await apiFetch<Visita>("/visitas", {
        method: "POST",
        body: JSON.stringify({
          localId: local.id,
          latitud: ubicacion.latitud,
          longitud: ubicacion.longitud,
        }),
      });
      setVisitaActiva(visita);
    } catch (err) {
      // los errores de geolocalización ya vienen en español
      setErrorInicio({
        localId: local.id,
        mensaje:
          err instanceof Error ? err.message : "No se pudo iniciar la visita",
      });
    } finally {
      setIniciando(null);
    }
  }

  if (!config) {
    return errorConfig ? (
      <p className={errorBox}>{errorConfig}</p>
    ) : (
      <p className="text-sm text-zinc-400">Cargando visitas...</p>
    );
  }

  const puedeIniciarVisitas = config.esOperativo && !config.esGestor;
  const itemsLocales = locales?.items ?? [];
  const itemsEquipo = equipo?.items ?? [];
  const itemsHistorial = historial?.items ?? [];
  const gruposEquipo = Array.from(
    itemsEquipo
      .reduce<Map<string, GrupoEquipo>>((acc, local) => {
        const clave = local.asignadoA ? String(local.asignadoA.id) : "sin";
        const grupo = acc.get(clave);
        if (grupo) {
          grupo.locales.push(local);
        } else {
          acc.set(clave, {
            usuario: local.asignadoA,
            locales: [local],
          });
        }
        return acc;
      }, new Map<string, GrupoEquipo>())
      .values(),
  );

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
          {config.esGestor ? "Equipo" : "Mis locales"}
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
          {config.esGestor ? (
            cargandoEquipo && !equipo ? (
              <p className="text-sm text-zinc-400">Cargando equipo...</p>
            ) : errorEquipo && !equipo ? (
              <p className={errorBox}>{errorEquipo}</p>
            ) : (
              <>
                {errorEquipo && (
                  <p className={`${errorBox} mb-4`}>{errorEquipo}</p>
                )}

                {itemsEquipo.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Todavia no hay locales para supervisar.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {gruposEquipo.map((grupo) => (
                      <section key={grupo.usuario?.id ?? "sin-asignar"}>
                        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {grupo.usuario?.nombre ?? "Sin asignar"}
                            </h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {grupo.locales.length}{" "}
                              {grupo.locales.length === 1 ? "local" : "locales"}
                            </p>
                          </div>
                          {!grupo.usuario && (
                            <span className={badgeZinc}>
                              Sin usuario asignado
                            </span>
                          )}
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                          {grupo.locales.map((l) => {
                            const ultima = l.ultimaVisita;
                            const tareasCompletadas = l.tareas.filter(
                              (t) => t.completada,
                            ).length;
                            return (
                              <article
                                key={l.localId}
                                className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <h4 className="break-words text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                                      {l.localNombre}
                                    </h4>
                                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                      {l.zona?.nombre ?? "Sin zona"}
                                    </p>
                                  </div>
                                  <span
                                    className={`${badgeBase} ${
                                      l.activo
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                    }`}
                                  >
                                    {l.activo ? "Activo" : "Inactivo"}
                                  </span>
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={claseProximaVisita(
                                      l.fechaVisita,
                                    )}
                                  >
                                    Prox. visita: {formatoFecha(l.fechaVisita)}
                                  </span>
                                  <span className={badgeZinc}>
                                    {tareasCompletadas}/{l.tareas.length} tareas
                                  </span>
                                  {l.requiereFotoPresencia && (
                                    <span className={badgeZinc}>
                                      Foto requerida
                                    </span>
                                  )}
                                </div>

                                <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                    Ultima visita
                                  </p>
                                  {ultima ? (
                                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                                      <span className="[font-variant-numeric:tabular-nums]">
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
                                    </div>
                                  ) : (
                                    <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
                                      Sin visitas registradas
                                    </p>
                                  )}
                                </div>

                                <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                                    Tareas del local
                                  </p>
                                  {l.tareas.length === 0 ? (
                                    <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">
                                      Sin tareas cargadas.
                                    </p>
                                  ) : (
                                    <ul className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
                                      {l.tareas.map((tarea) => (
                                        <li
                                          key={tarea.id}
                                          className="flex items-start gap-2 text-xs"
                                        >
                                          <span
                                            aria-hidden
                                            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                                              tarea.completada
                                                ? "bg-emerald-500"
                                                : "bg-amber-500"
                                            }`}
                                          />
                                          <span
                                            className={`min-w-0 flex-1 break-words ${
                                              tarea.completada
                                                ? "text-zinc-700 dark:text-zinc-200"
                                                : "text-zinc-500 dark:text-zinc-400"
                                            }`}
                                          >
                                            {tarea.descripcion}
                                          </span>
                                          <span
                                            className={`shrink-0 rounded-full px-2 py-0.5 font-medium ${
                                              tarea.completada
                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                            }`}
                                          >
                                            {tarea.completada
                                              ? "Completa"
                                              : "Pendiente"}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </article>
                            );
                          })}
                        </div>
                      </section>
                    ))}
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
            )
          ) : cargandoLocales && !locales ? (
            <p className="text-sm text-zinc-400">Cargando locales...</p>
          ) : errorLocales && !locales ? (
            <p className={errorBox}>{errorLocales}</p>
          ) : (
            <>
              {errorLocales && (
                <p className={`${errorBox} mb-4`}>{errorLocales}</p>
              )}

              {itemsLocales.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Todavía no tenés locales asignados para visitar.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {itemsLocales.map((l) => (
                    <article
                      key={l.id}
                      className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="min-w-0">
                        <h3 className="break-words text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                          {l.nombre}
                        </h3>
                        {l.zona && (
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            {l.zona.nombre}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className={claseProximaVisita(l.fechaVisita)}>
                          Próx. visita: {formatoFecha(l.fechaVisita)}
                        </span>
                        <span className={badgeZinc}>
                          {l.tareasCount}{" "}
                          {l.tareasCount === 1 ? "tarea" : "tareas"}
                        </span>
                        {l.requiereFotoPresencia && (
                          <span className={badgeZinc}>
                            📷 foto de presencia
                          </span>
                        )}
                      </div>

                      {(puedeIniciarVisitas ||
                        errorInicio?.localId === l.id) && (
                        <div className="mt-auto pt-4">
                          {errorInicio?.localId === l.id && (
                            <p className={`${errorBox} mb-3`}>
                              {errorInicio.mensaje}
                            </p>
                          )}
                          {puedeIniciarVisitas && (
                            <button
                              type="button"
                              onClick={() => iniciarVisita(l)}
                              disabled={iniciando !== null}
                              className={`${btnPrimary} h-11 w-full gap-2`}
                            >
                              {iniciando === l.id ? (
                                <>
                                  <Spinner />
                                  Obteniendo ubicación…
                                </>
                              ) : (
                                "Iniciar visita"
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}

              {locales && locales.total > 0 && (
                <Paginacion
                  page={locales.page}
                  totalPages={locales.totalPages}
                  total={locales.total}
                  limit={locales.limit}
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
                <>
                  {/* Cards en mobile */}
                  <div className="grid gap-3 md:hidden">
                    {itemsHistorial.map((v) => (
                      <article
                        key={v.id}
                        className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="break-words text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                              {v.localNombre}
                            </h3>
                            {config.esGestor && (
                              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                {v.usuarioNombre}
                              </p>
                            )}
                            <p className="mt-1 text-xs text-zinc-500 [font-variant-numeric:tabular-nums] dark:text-zinc-400">
                              Iniciada {formatoFechaHora(v.iniciadaEn)}
                            </p>
                          </div>
                          <BotonFoto visita={v} onVer={setFotoAmpliada} />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <EstadoVisita visita={v} />
                          <span
                            className={`${badgeZinc} [font-variant-numeric:tabular-nums]`}
                          >
                            {Math.round(v.distanciaMetros)} m
                          </span>
                          <span
                            className={`${badgeZinc} [font-variant-numeric:tabular-nums]`}
                          >
                            ✓ {v.tareasCompletadas}/{v.tareasTotal}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>

                  {/* Tabla en desktop */}
                  <div className="hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:block">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                          <th className="px-4 py-3 font-medium">Local</th>
                          {config.esGestor && (
                            <th className="px-4 py-3 font-medium">Usuario</th>
                          )}
                          <th className="px-4 py-3 font-medium">Iniciada</th>
                          <th className="px-4 py-3 font-medium">Estado</th>
                          <th className="px-4 py-3 font-medium">Distancia</th>
                          <th className="px-4 py-3 font-medium">Checklist</th>
                          <th className="px-4 py-3 font-medium">Foto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsHistorial.map((v) => (
                          <tr
                            key={v.id}
                            className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
                          >
                            <td className="px-4 py-3 font-medium">
                              {v.localNombre}
                            </td>
                            {config.esGestor && (
                              <td className="px-4 py-3">{v.usuarioNombre}</td>
                            )}
                            <td className="px-4 py-3 text-zinc-500 [font-variant-numeric:tabular-nums] dark:text-zinc-400">
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
                </>
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

      {visitaActiva && (
        <VisitaActiva
          visita={visitaActiva}
          onCerrar={() => setVisitaActiva(null)}
          onFinalizada={() => {
            setVisitaActiva(null);
            setRefresco((n) => n + 1);
          }}
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
