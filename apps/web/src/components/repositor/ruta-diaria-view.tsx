"use client";

import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { VisitaActiva } from "@/components/impulsador/visita-activa";
import { PantallaCarga } from "@/components/pantalla-carga";
import { Paginacion } from "@/components/paginacion";
import { ApiError, apiFetch } from "@/lib/api";
import { obtenerUbicacion } from "@/lib/geolocalizacion";
import type { RespuestaPaginada } from "@/types/paginacion";
import type { ParadaRuta, RutaDiaria, VisitaHoy } from "@/types/repositor";
import type { Visita } from "@/types/visita";
import { formatoDuracionSegundos } from "@/utils/duracion";
import { urlNavegarA, urlRutaCompleta } from "@/utils/google-maps";

const RutaMapa = dynamic(
  () =>
    import("@/components/repositor/ruta-mapa").then(
      (modulo) => modulo.RutaMapa,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[54dvh] min-h-[390px] animate-pulse rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
    ),
  },
);

function formatoDistancia(metros: number) {
  return metros < 1000
    ? `${Math.round(metros)} m`
    : `${(metros / 1000).toFixed(1)} km`;
}

function IconoAbrirRuta() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0"
      aria-hidden
    >
      <path d="m3.5 6 5-2.5 7 3 5-2.5v14l-5 2.5-7-3-5 2.5z" />
      <path d="M8.5 3.5v14M15.5 6.5v14" />
      <path d="M5.5 14c2-2.5 4.5 1 7-1.5 1.7-1 2.8-3 5.5-2.5" />
    </svg>
  );
}

function formatoHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-PY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function esParadaCalculada(
  visita: VisitaHoy | ParadaRuta,
): visita is ParadaRuta {
  return "llegadaEstimada" in visita;
}

export function RutaDiariaView() {
  const [agenda, setAgenda] = useState<RespuestaPaginada<VisitaHoy> | null>(
    null,
  );
  const [ruta, setRuta] = useState<RutaDiaria | null>(null);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(7);
  const [ubicacion, setUbicacion] = useState<{
    latitud: number;
    longitud: number;
  } | null>(null);
  const [avisoGps, setAvisoGps] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargandoAgenda, setCargandoAgenda] = useState(true);
  const [calculando, setCalculando] = useState(false);
  const [iniciando, setIniciando] = useState<string | null>(null);
  const [navegando, setNavegando] = useState<string | null>(null);
  const [visita, setVisita] = useState<Visita | null>(null);
  const temporizadorNavegacion = useRef<number | null>(null);

  const cargarAgenda = useCallback(async () => {
    setCargandoAgenda(true);
    setError(null);
    try {
      setAgenda(
        await apiFetch<RespuestaPaginada<VisitaHoy>>(
          `/repositor/visitas-hoy?page=${pagina}&limit=${limite}`,
        ),
      );
    } catch (problema) {
      setError(
        problema instanceof ApiError
          ? problema.message
          : "No pudimos cargar las visitas de hoy",
      );
    } finally {
      setCargandoAgenda(false);
    }
  }, [pagina, limite]);

  useEffect(() => {
    const inicio = window.setTimeout(() => void cargarAgenda(), 0);
    return () => window.clearTimeout(inicio);
  }, [cargarAgenda]);

  useEffect(
    () => () => {
      if (temporizadorNavegacion.current !== null) {
        window.clearTimeout(temporizadorNavegacion.current);
      }
    },
    [],
  );

  function indicarNavegacion(mensaje: string) {
    setNavegando(mensaje);
    if (temporizadorNavegacion.current !== null) {
      window.clearTimeout(temporizadorNavegacion.current);
    }
    temporizadorNavegacion.current = window.setTimeout(() => {
      setNavegando(null);
      temporizadorNavegacion.current = null;
    }, 1200);
  }

  async function calcularRuta() {
    if (calculando) return;
    setCalculando(true);
    setError(null);
    let posicion: { latitud: number; longitud: number } | null = null;
    try {
      posicion = await obtenerUbicacion();
      setUbicacion(posicion);
      setAvisoGps(null);
    } catch (problema) {
      setUbicacion(null);
      setAvisoGps(
        problema instanceof Error
          ? `${problema.message} La ruta se calculará sin tu punto de partida.`
          : "La ruta se calculará sin tu punto de partida.",
      );
    }
    try {
      const consulta = posicion
        ? `?latitud=${posicion.latitud}&longitud=${posicion.longitud}`
        : "";
      setRuta(await apiFetch<RutaDiaria>(`/repositor/ruta-hoy${consulta}`));
    } catch (problema) {
      setError(
        problema instanceof ApiError
          ? problema.message
          : "No pudimos calcular la ruta de hoy",
      );
    } finally {
      setCalculando(false);
    }
  }

  async function abrirVisita(parada: VisitaHoy | ParadaRuta) {
    if (iniciando !== null) return;
    setIniciando(parada.clave);
    setError(null);
    try {
      if (parada.visitaAbiertaId !== null) {
        setVisita(await apiFetch<Visita>(`/visitas/${parada.visitaAbiertaId}`));
      } else {
        const posicion = await obtenerUbicacion();
        setVisita(
          await apiFetch<Visita>("/visitas", {
            method: "POST",
            body: JSON.stringify({
              localId: parada.local.id,
              latitud: posicion.latitud,
              longitud: posicion.longitud,
            }),
          }),
        );
      }
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "No pudimos iniciar la visita",
      );
    } finally {
      setIniciando(null);
    }
  }

  const visitasMapa: Array<VisitaHoy | ParadaRuta> =
    ruta?.paradas ?? agenda?.items ?? [];
  const urlCompleta = ruta ? urlRutaCompleta(ruta.paradas, ubicacion) : null;
  const siguiente = ruta?.paradas[0] ?? null;
  const cargaActiva = calculando
    ? {
        mensaje: "Calculando mejor ruta",
        detalle: "Combinamos horarios, calles y distancias entre los locales.",
      }
    : iniciando !== null
      ? {
          mensaje: "Preparando la visita",
          detalle: "Verificamos tu ubicación y cargamos las tareas del local.",
        }
      : cargandoAgenda
        ? {
            mensaje: "Cargando visitas",
            detalle: "Actualizamos los locales programados para hoy.",
          }
        : navegando !== null
          ? {
              mensaje: navegando,
              detalle:
                "Estamos abriendo Google Maps con el destino seleccionado.",
            }
          : null;

  return (
    <div className="space-y-6" aria-busy={cargaActiva !== null}>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-700 p-5 text-white shadow-xl shadow-indigo-950/20 sm:p-7">
        <div className="ruta-orbita absolute -right-10 -top-16 h-52 w-52 rounded-full border border-indigo-300/20" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200">
              Visitas programadas de hoy
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Mis visitas
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-indigo-100/85 sm:text-base">
              Primero revisá tus locales en el mapa. La ruta se calcula
              solamente cuando vos lo pedís.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void calcularRuta()}
              disabled={calculando || (agenda?.total ?? 0) === 0}
              className="min-h-11 rounded-xl bg-white px-4 text-sm font-bold text-indigo-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {calculando
                ? "Calculando ruta…"
                : ruta
                  ? "Volver a calcular"
                  : "Calcular mejor ruta"}
            </button>
            {siguiente ? (
              <a
                href={urlNavegarA(siguiente)}
                target="_blank"
                rel="noreferrer"
                onClick={() => indicarNavegacion("Iniciando navegación")}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold backdrop-blur transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Iniciar navegación
              </a>
            ) : null}
          </div>
        </motion.div>
      </section>

      {avisoGps ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {avisoGps}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {cargandoAgenda && agenda === null ? (
        <div className="h-[54dvh] min-h-[390px] animate-pulse rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
      ) : visitasMapa.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-950">
            ✓
          </div>
          <h2 className="mt-4 text-xl font-bold">
            No tenés visitas pendientes hoy
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Cuando el Team Leader programe una visita para hoy, aparecerá acá.
          </p>
        </section>
      ) : (
        <>
          {ruta ? (
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                [
                  "Pendientes",
                  String(ruta.paradas.length),
                  `${ruta.totalCompletadas} completadas`,
                ],
                [
                  "Distancia",
                  formatoDistancia(ruta.distanciaTotalMetros),
                  ruta.fuente === "OSRM" ? "por calles" : "estimada",
                ],
                [
                  "En traslado",
                  formatoDuracionSegundos(ruta.duracionTrasladoSegundos),
                  "sin contar visitas",
                ],
                [
                  "Ahorro",
                  formatoDistancia(ruta.ahorroEstimadoMetros),
                  "vs. orden horario",
                ],
              ].map(([etiqueta, valor, detalle], indice) => (
                <motion.article
                  key={etiqueta}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: indice * 0.07 }}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {etiqueta}
                  </p>
                  <p className="mt-1 text-2xl font-black tracking-tight">
                    {valor}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {detalle}
                  </p>
                </motion.article>
              ))}
            </section>
          ) : null}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.75fr)]">
            <RutaMapa
              geometria={ruta?.geometria ?? []}
              paradas={visitasMapa}
              ubicacion={ubicacion}
              calculada={ruta !== null}
            />
            <section className="min-w-0">
              <div className="mb-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">
                    {ruta ? "Orden recomendado" : "Horario programado"}
                  </h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {ruta
                      ? "Ordenado por horarios y tiempos de traslado."
                      : "Todavía no calculamos distancias ni recorridos."}
                  </p>
                </div>
                {urlCompleta ? (
                  <a
                    href={urlCompleta}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => indicarNavegacion("Abriendo ruta completa")}
                    className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white shadow-md shadow-indigo-950/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 sm:w-auto dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-offset-zinc-950"
                  >
                    <IconoAbrirRuta />
                    Abrir ruta en Maps
                  </a>
                ) : null}
              </div>
              <ol className="space-y-3">
                {visitasMapa.map((parada, indice) => (
                  <motion.li
                    key={parada.clave}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: indice * 0.055 }}
                    className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex gap-3">
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-black text-white ${
                          parada.estado === "ATRASADA"
                            ? "bg-rose-600"
                            : parada.estado === "EN_CURSO"
                              ? "animate-pulse bg-emerald-600"
                              : "bg-indigo-600"
                        }`}
                      >
                        {parada.orden}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                          {parada.local.cliente.nombre}
                        </p>
                        <h3 className="truncate font-bold">
                          {parada.local.nombre}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          Programada {formatoHora(parada.programadaEn)}
                          {esParadaCalculada(parada)
                            ? ` · Llegada ${formatoHora(parada.llegadaEstimada)}`
                            : ""}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {esParadaCalculada(parada)
                            ? `${formatoDistancia(parada.distanciaDesdeAnteriorMetros)} · ${formatoDuracionSegundos(parada.viajeDesdeAnteriorSegundos)} · `
                            : ""}
                          {parada.tareasActivas} tareas
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <a
                        href={urlNavegarA(parada)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() =>
                          indicarNavegacion(`Abriendo ${parada.local.nombre}`)
                        }
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-indigo-200 px-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950"
                      >
                        Navegar
                      </a>
                      <button
                        type="button"
                        onClick={() => void abrirVisita(parada)}
                        disabled={iniciando !== null}
                        className="min-h-11 rounded-xl bg-brand-700 px-3 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-600/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {iniciando === parada.clave
                          ? "Verificando GPS…"
                          : parada.visitaAbiertaId
                            ? "Continuar visita"
                            : "Iniciar visita"}
                      </button>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </section>
          </div>

          {!ruta && agenda && agenda.total > 0 ? (
            <Paginacion
              page={agenda.page}
              totalPages={agenda.totalPages}
              total={agenda.total}
              limit={agenda.limit}
              onPageChange={(nuevaPagina) => {
                setRuta(null);
                setPagina(nuevaPagina);
              }}
              onLimitChange={(nuevoLimite) => {
                setRuta(null);
                setLimite(nuevoLimite);
                setPagina(1);
              }}
            />
          ) : null}
        </>
      )}

      {visita ? (
        <VisitaActiva
          visita={visita}
          onCerrar={() => setVisita(null)}
          onFinalizada={() => {
            setVisita(null);
            setRuta(null);
            void cargarAgenda();
          }}
        />
      ) : null}

      <PantallaCarga
        visible={cargaActiva !== null}
        mensaje={cargaActiva?.mensaje ?? "Procesando"}
        detalle={cargaActiva?.detalle}
      />
    </div>
  );
}
