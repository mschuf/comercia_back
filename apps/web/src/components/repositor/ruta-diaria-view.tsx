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

interface AccionesParadaProps {
  parada: VisitaHoy | ParadaRuta;
  ubicacion: { latitud: number; longitud: number } | null;
  iniciando: string | null;
  onNavegar: (mensaje: string) => void;
  onIniciar: (parada: VisitaHoy | ParadaRuta) => Promise<void>;
}

function AccionesParada({
  parada,
  ubicacion,
  iniciando,
  onNavegar,
  onIniciar,
}: AccionesParadaProps) {
  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        onClick={() => void onIniciar(parada)}
        disabled={iniciando !== null}
        aria-label={`Iniciar visita en ${parada.local.nombre}`}
        title={`Iniciar visita en ${parada.local.nombre}`}
        className="min-h-11 whitespace-nowrap rounded-lg bg-brand-700 px-2.5 text-xs font-semibold text-white transition hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-600/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {iniciando === parada.clave ? "Verificando GPS…" : "Visita"}
      </button>
      <a
        href={urlNavegarA(parada, ubicacion)}
        target="_blank"
        rel="noreferrer"
        onClick={() =>
          onNavegar(`Iniciando navegación a ${parada.local.nombre}`)
        }
        aria-label={`Abrir mapa hacia ${parada.local.nombre}`}
        title={`Abrir mapa hacia ${parada.local.nombre}`}
        className="inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg border border-indigo-200 px-2.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500/40 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950"
      >
        Mapa
      </a>
    </div>
  );
}

export function RutaDiariaView() {
  const [agenda, setAgenda] = useState<RespuestaPaginada<VisitaHoy> | null>(
    null,
  );
  const [ruta, setRuta] = useState<RutaDiaria | null>(null);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(7);
  const [paginaRuta, setPaginaRuta] = useState(1);
  const [limiteRuta, setLimiteRuta] = useState(7);
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
  const calculoEnCurso = useRef(false);

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

  const calcularRuta = useCallback(async () => {
    if (calculoEnCurso.current) return;
    calculoEnCurso.current = true;
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
      setPaginaRuta(1);
    } catch (problema) {
      setError(
        problema instanceof ApiError
          ? problema.message
          : "No pudimos calcular la ruta de hoy",
      );
    } finally {
      calculoEnCurso.current = false;
      setCalculando(false);
    }
  }, []);

  useEffect(() => {
    const inicio = window.setTimeout(() => void cargarAgenda(), 0);
    return () => window.clearTimeout(inicio);
  }, [cargarAgenda]);

  useEffect(() => {
    const inicio = window.setTimeout(() => void calcularRuta(), 0);
    return () => window.clearTimeout(inicio);
  }, [calcularRuta]);

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
  const paradasParaMaps = ruta?.paradas ?? agenda?.items ?? [];
  const urlCompleta = urlRutaCompleta(paradasParaMaps, ubicacion);
  const totalTabla = ruta ? visitasMapa.length : (agenda?.total ?? 0);
  const paginaTabla = ruta ? paginaRuta : (agenda?.page ?? pagina);
  const limiteTabla = ruta ? limiteRuta : (agenda?.limit ?? limite);
  const totalPaginasTabla = ruta
    ? Math.max(1, Math.ceil(totalTabla / limiteRuta))
    : (agenda?.totalPages ?? 1);
  const visitasTabla = ruta
    ? visitasMapa.slice((paginaRuta - 1) * limiteRuta, paginaRuta * limiteRuta)
    : visitasMapa;
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
    <div
      className="min-w-0 space-y-4 sm:space-y-5"
      aria-busy={cargaActiva !== null}
    >
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-700 p-4 text-white shadow-lg shadow-indigo-950/20 sm:p-5">
        <div className="ruta-orbita absolute -right-8 -top-16 h-40 w-40 rounded-full border border-indigo-300/20" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-200 sm:text-[11px]">
              Visitas programadas de hoy
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
              Mis visitas
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-indigo-100/85 sm:text-sm">
              Revisá tus locales mientras calculamos automáticamente el mejor
              recorrido para hoy.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {urlCompleta ? (
              <a
                href={urlCompleta}
                target="_blank"
                rel="noreferrer"
                onClick={() =>
                  indicarNavegacion("Iniciando navegación de la ruta completa")
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-semibold backdrop-blur transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/70"
              >
                <IconoAbrirRuta />
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
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(420px,.9fr)] xl:items-stretch">
            <RutaMapa
              geometria={ruta?.geometria ?? []}
              paradas={visitasMapa}
              ubicacion={ubicacion}
              calculada={ruta !== null}
            />
            <section className="min-w-0 w-full xl:flex xl:h-[68dvh] xl:min-h-[390px] xl:flex-col">
              <div className="mb-2">
                <div>
                  <h2 className="text-base font-bold sm:text-lg">
                    {ruta ? "Orden recomendado" : "Horario programado"}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
                    {ruta
                      ? "Ordenado por horarios y tiempos de traslado."
                      : "Podés abrir el orden programado mientras optimizamos el recorrido."}
                  </p>
                </div>
              </div>
              <div className="max-h-[430px] w-full overflow-auto rounded-xl border border-zinc-200 bg-white shadow-sm xl:min-h-0 xl:max-h-none xl:flex-1 dark:border-zinc-800 dark:bg-zinc-900">
                <table className="w-full min-w-[680px] text-left">
                  <thead className="sticky top-0 z-10 bg-zinc-50 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
                    <tr>
                      <th scope="col" className="w-12 px-2 py-2.5 text-center">
                        Orden
                      </th>
                      <th scope="col" className="px-2 py-2.5 xl:hidden">
                        Acciones
                      </th>
                      <th scope="col" className="px-2 py-2.5">
                        Local
                      </th>
                      <th scope="col" className="px-2 py-2.5">
                        Agenda
                      </th>
                      <th scope="col" className="px-2 py-2.5">
                        Recorrido
                      </th>
                      <th
                        scope="col"
                        className="hidden px-2 py-2.5 text-right xl:table-cell"
                      >
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {visitasTabla.map((parada, indice) => (
                      <motion.tr
                        key={parada.clave}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: indice * 0.035 }}
                        className="transition-colors hover:bg-indigo-50/60 dark:hover:bg-indigo-950/20"
                      >
                        <td className="px-2 py-2.5 text-center align-top">
                          <span
                            className={`mx-auto grid h-8 w-8 place-items-center rounded-lg text-xs font-black text-white ${
                              parada.estado === "ATRASADA"
                                ? "bg-rose-600"
                                : parada.estado === "EN_CURSO"
                                  ? "animate-pulse bg-emerald-600"
                                  : "bg-indigo-600"
                            }`}
                          >
                            {parada.orden}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 align-top xl:hidden">
                          <AccionesParada
                            parada={parada}
                            ubicacion={ubicacion}
                            iniciando={iniciando}
                            onNavegar={indicarNavegacion}
                            onIniciar={abrirVisita}
                          />
                        </td>
                        <td className="max-w-44 px-2 py-2.5 align-top">
                          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                            {parada.local.cliente.nombre}
                          </p>
                          <p className="truncate text-sm font-bold">
                            {parada.local.nombre}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 align-top text-[11px] text-zinc-600 dark:text-zinc-300">
                          <span className="block">
                            {formatoHora(parada.programadaEn)} programada
                          </span>
                          {esParadaCalculada(parada) ? (
                            <span className="mt-0.5 block text-zinc-500 dark:text-zinc-400">
                              {formatoHora(parada.llegadaEstimada)} llegada
                            </span>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 align-top text-[11px] text-zinc-600 dark:text-zinc-300">
                          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                            {esParadaCalculada(parada)
                              ? `${formatoDistancia(parada.distanciaDesdeAnteriorMetros)} · ${formatoDuracionSegundos(parada.viajeDesdeAnteriorSegundos)}`
                              : "Pendiente de cálculo"}
                          </p>
                          <span className="mt-0.5 block text-zinc-500 dark:text-zinc-400">
                            {parada.tareasActivas} tareas
                          </span>
                        </td>
                        <td className="hidden px-2 py-2.5 align-top xl:table-cell">
                          <div className="flex justify-end">
                            <AccionesParada
                              parada={parada}
                              ubicacion={ubicacion}
                              iniciando={iniciando}
                              onNavegar={indicarNavegacion}
                              onIniciar={abrirVisita}
                            />
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalTabla > 0 ? (
                <Paginacion
                  page={paginaTabla}
                  totalPages={totalPaginasTabla}
                  total={totalTabla}
                  limit={limiteTabla}
                  onPageChange={(nuevaPagina) => {
                    if (ruta) {
                      setPaginaRuta(nuevaPagina);
                    } else {
                      setPagina(nuevaPagina);
                    }
                  }}
                  onLimitChange={(nuevoLimite) => {
                    if (ruta) {
                      setLimiteRuta(nuevoLimite);
                      setPaginaRuta(1);
                    } else {
                      setLimite(nuevoLimite);
                      setPagina(1);
                    }
                  }}
                />
              ) : null}
            </section>
          </div>

          {ruta ? (
            <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: indice * 0.05 }}
                  className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {etiqueta}
                  </p>
                  <p className="mt-0.5 text-lg font-black tracking-tight sm:text-xl">
                    {valor}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {detalle}
                  </p>
                </motion.article>
              ))}
            </section>
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
            void Promise.all([cargarAgenda(), calcularRuta()]);
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
