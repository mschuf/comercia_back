"use client";

/* Hallmark · component: lista móvil de paradas · genre: utilitarian · theme: tokens Comercia
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (46–50) · pre-emit critique: P4 H5 E5 S5 R5 V4
 */

import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PantallaCarga } from "@/components/pantalla-carga";
import { Paginacion } from "@/components/paginacion";
import { useRutaDiaria } from "@/components/repositor/ruta-diaria-contexto";
import { obtenerUbicacion } from "@/lib/geolocalizacion";
import type { ParadaRuta } from "@/types/repositor";
import { formatoDuracionSegundos } from "@/utils/duracion";
import { formatoDistancia } from "@/utils/distancia";
import { fechaEnZonaIso } from "@/utils/fechas";
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

interface AccionesParadaProps {
  parada: ParadaRuta;
  onNavegar: (mensaje: string) => void;
  className?: string;
}

function AccionesParada({
  parada,
  onNavegar,
  className = "",
}: AccionesParadaProps) {
  return (
    <a
      href={urlNavegarA(parada)}
      target="_blank"
      rel="noreferrer"
      onClick={() => onNavegar(`Iniciando navegación a ${parada.local.nombre}`)}
      aria-label={`Abrir mapa hacia ${parada.local.nombre}`}
      title={`Abrir mapa hacia ${parada.local.nombre}`}
      className={`inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-lg border border-accent bg-surface-raised px-3 text-xs font-bold text-accent-ink transition hover:bg-surface-soft active:translate-y-px focus-visible:ring-2 focus-visible:ring-focus ${className}`}
    >
      Abrir mapa
    </a>
  );
}

interface ListaParadasMovilProps {
  paradas: ParadaRuta[];
  onNavegar: (mensaje: string) => void;
}

function ListaParadasMovil({ paradas, onNavegar }: ListaParadasMovilProps) {
  return (
    <ol
      className="space-y-3 md:hidden"
      aria-label="Orden recomendado de visitas"
    >
      {paradas.map((parada) => {
        const estado =
          parada.estado === "ATRASADA"
            ? "Atrasada"
            : parada.estado === "EN_CURSO"
              ? "En curso"
              : "Pendiente";
        const colorEstado =
          parada.estado === "ATRASADA"
            ? "bg-rose-600"
            : parada.estado === "EN_CURSO"
              ? "bg-emerald-600"
              : "bg-brand-700";
        return (
          <li
            key={parada.clave}
            className="[contain-intrinsic-size:auto_9rem] [content-visibility:auto]"
          >
            <article className="rounded-2xl border border-line bg-surface-raised p-4 shadow-[0_10px_30px_rgba(var(--warm-shadow),0.05)]">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black text-white ${colorEstado}`}
                  aria-label={`Parada ${parada.orden}: ${estado}`}
                >
                  {parada.orden}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold uppercase tracking-wide text-accent-ink">
                        {parada.local.cliente.nombre}
                      </p>
                      <h3 className="mt-0.5 truncate text-base font-extrabold text-foreground">
                        {parada.local.nombre}
                      </h3>
                    </div>
                    <span className="shrink-0 rounded-full bg-surface-soft px-2 py-1 text-[11px] font-bold text-muted">
                      {estado}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {parada.local.zona ?? "Sin zona asignada"}
                  </p>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-y border-line py-3 text-sm">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Agenda
                  </dt>
                  <dd className="mt-0.5 font-semibold text-foreground">
                    {formatoHora(parada.programadaEn)} programada
                  </dd>
                  <dd className="text-xs text-muted">
                    Llegada {formatoHora(parada.llegadaEstimada)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                    Recorrido
                  </dt>
                  <dd className="mt-0.5 font-semibold text-foreground">
                    {formatoDistancia(parada.distanciaDesdeAnteriorMetros)}
                  </dd>
                  <dd className="text-xs text-muted">
                    {formatoDuracionSegundos(parada.viajeDesdeAnteriorSegundos)}{" "}
                    · {parada.tareasActivas} tareas
                  </dd>
                </div>
              </dl>

              <div className="mt-3 grid">
                <AccionesParada
                  parada={parada}
                  onNavegar={onNavegar}
                  className="w-full"
                />
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}

export function RutaDiariaView() {
  const {
    ruta,
    cargando: cargandoRuta,
    error: errorRuta,
    cargarRuta,
  } = useRutaDiaria();
  const [paginaRuta, setPaginaRuta] = useState(1);
  const [limiteRuta, setLimiteRuta] = useState(7);
  const [ubicacion, setUbicacion] = useState<{
    latitud: number;
    longitud: number;
  } | null>(null);
  const [avisoGps, setAvisoGps] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preparandoRuta, setPreparandoRuta] = useState(false);
  const [navegando, setNavegando] = useState<string | null>(null);
  const temporizadorNavegacion = useRef<number | null>(null);
  const intentoAutomatico = useRef(false);
  const fechaRuta = ruta?.fecha;
  const usaUbicacionActual = ruta?.usaUbicacionActual ?? false;
  const totalParadasRuta = ruta?.paradas.length;

  const prepararRuta = useCallback(async () => {
    const rutaVigente = fechaRuta === fechaEnZonaIso(new Date());
    if (rutaVigente && (usaUbicacionActual || totalParadasRuta === 0)) {
      return;
    }
    setPreparandoRuta(true);
    let posicion: { latitud: number; longitud: number } | null = null;
    try {
      posicion = await obtenerUbicacion({ maximumAge: 0 });
      setUbicacion(posicion);
      setAvisoGps(null);
    } catch (problema) {
      setUbicacion(null);
      setAvisoGps(
        problema instanceof Error
          ? `${problema.message} Mostramos el recorrido guardado sin usar tu posición como origen.`
          : "Mostramos el recorrido guardado sin usar tu posición como origen.",
      );
    }
    try {
      await cargarRuta({
        ...(posicion ? { ubicacion: posicion } : {}),
      });
      setPaginaRuta(1);
      setError(null);
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "No pudimos cargar la ruta de hoy",
      );
    } finally {
      setPreparandoRuta(false);
    }
  }, [cargarRuta, fechaRuta, totalParadasRuta, usaUbicacionActual]);

  useEffect(() => {
    if (intentoAutomatico.current) return;
    intentoAutomatico.current = true;
    void prepararRuta();
  }, [prepararRuta]);

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

  async function iniciarNavegacionCompleta() {
    if (navegando !== null || preparandoRuta || cargandoRuta) return;
    setNavegando("Actualizando tu ubicación");
    setError(null);
    let abriendoMaps = false;
    try {
      const posicion = await obtenerUbicacion({ maximumAge: 0 });
      setUbicacion(posicion);
      setAvisoGps(null);
      setNavegando("Recalculando la ruta desde tu ubicación");
      const nuevaRuta = await cargarRuta({
        ubicacion: posicion,
        recalcular: true,
      });
      setPaginaRuta(1);
      const url = urlRutaCompleta(nuevaRuta.paradas, posicion);
      if (url === null) {
        throw new Error("No hay locales pendientes para iniciar la navegación");
      }
      abriendoMaps = true;
      indicarNavegacion("Abriendo Google Maps");
      window.location.assign(url);
    } catch (problema) {
      setError(
        problema instanceof Error
          ? problema.message
          : "No pudimos iniciar la navegación",
      );
    } finally {
      if (!abriendoMaps) setNavegando(null);
    }
  }

  const visitasMapa = ruta?.paradas ?? [];
  const totalTabla = visitasMapa.length;
  const totalPaginasTabla = Math.max(1, Math.ceil(totalTabla / limiteRuta));
  const visitasTabla = visitasMapa.slice(
    (paginaRuta - 1) * limiteRuta,
    paginaRuta * limiteRuta,
  );
  const calculando = preparandoRuta || cargandoRuta;
  const mensajeError = error ?? errorRuta;
  const cargaActiva =
    navegando !== null
      ? {
          mensaje: navegando,
          detalle:
            navegando === "Actualizando tu ubicación"
              ? "El GPS actual será el punto inicial del recorrido."
              : navegando === "Recalculando la ruta desde tu ubicación"
                ? "Ordenamos nuevamente los locales antes de abrir el mapa."
                : "Estamos abriendo Google Maps con el destino seleccionado.",
        }
      : calculando
        ? {
            mensaje: ruta ? "Actualizando recorrido" : "Preparando recorrido",
            detalle: ruta
              ? "Usamos la ruta guardada y actualizamos el punto de partida."
              : "Recuperamos la mejor ruta disponible para hoy.",
          }
        : null;

  return (
    <div
      className="min-w-0 space-y-4 sm:space-y-5"
      aria-busy={cargaActiva !== null}
    >
      <section className="relative overflow-hidden rounded-2xl border border-brand-800 bg-commercial-ink p-4 text-white shadow-[0_16px_40px_rgba(var(--warm-shadow),0.18)] sm:p-5">
        <div className="ruta-orbita absolute -right-8 -top-16 h-40 w-40 rounded-full border border-accent/30" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-on-ink sm:text-[11px]">
              Recorrido programado de hoy
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
              Mis visitas
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/80 sm:text-sm">
              Consultá el mapa, el orden sugerido y los tiempos de traslado. Las
              tareas se gestionan desde Mis tareas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {visitasMapa.length > 0 ? (
              <button
                type="button"
                onClick={() => void iniciarNavegacionCompleta()}
                disabled={navegando !== null || calculando}
                title="Actualizar ubicación e iniciar la ruta en Google Maps"
                className="inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-accent bg-accent px-4 text-sm font-extrabold text-brand-950 shadow-sm transition hover:brightness-105 active:translate-y-px focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0"
              >
                <IconoAbrirRuta />
                Iniciar navegación
              </button>
            ) : null}
          </div>
        </motion.div>
      </section>

      {avisoGps ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {avisoGps}
        </p>
      ) : null}
      {mensajeError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {mensajeError}
        </p>
      ) : null}

      {ruta === null ? (
        mensajeError ? null : (
          <div className="h-[54dvh] min-h-[390px] animate-pulse rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
        )
      ) : visitasMapa.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-line bg-surface-raised p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-950">
            ✓
          </div>
          <h2 className="mt-4 text-xl font-bold">
            No tenés visitas pendientes hoy
          </h2>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Cuando el Supervisor programe una visita para hoy, aparecerá acá.
          </p>
        </section>
      ) : (
        <>
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(420px,.9fr)] xl:items-stretch">
            <RutaMapa
              geometria={ruta.geometria}
              paradas={visitasMapa}
              ubicacion={ubicacion}
              calculada
            />
            <section className="min-w-0 w-full xl:flex xl:h-[68dvh] xl:min-h-[390px] xl:flex-col">
              <div className="mb-2">
                <div>
                  <h2 className="text-base font-bold sm:text-lg">
                    Orden recomendado
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
                    Ordenado por horarios y tiempos de traslado.
                  </p>
                </div>
              </div>
              <ListaParadasMovil
                paradas={visitasTabla}
                onNavegar={indicarNavegacion}
              />
              <div className="hidden max-h-[430px] w-full overflow-auto rounded-xl border border-line bg-surface-raised shadow-[0_10px_30px_rgba(var(--warm-shadow),0.05)] md:block xl:min-h-0 xl:max-h-none xl:flex-1">
                <table className="w-full min-w-[680px] text-left">
                  <thead className="sticky top-0 z-10 bg-surface-soft text-xs font-semibold uppercase tracking-wide text-foreground">
                    <tr>
                      <th scope="col" className="w-12 px-2 py-2.5 text-center">
                        Orden
                      </th>
                      <th scope="col" className="px-2 py-2.5 xl:hidden">
                        Mapa
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
                        Mapa
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
                        className="border-b border-line bg-surface-raised transition-colors last:border-0 hover:bg-surface-soft"
                      >
                        <td className="px-2 py-2.5 text-center align-top">
                          <span
                            className={`mx-auto grid h-8 w-8 place-items-center rounded-lg text-xs font-black text-white ${
                              parada.estado === "ATRASADA"
                                ? "bg-rose-600"
                                : parada.estado === "EN_CURSO"
                                  ? "animate-pulse bg-emerald-600"
                                  : "bg-brand-700"
                            }`}
                          >
                            {parada.orden}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 align-top xl:hidden">
                          <AccionesParada
                            parada={parada}
                            onNavegar={indicarNavegacion}
                          />
                        </td>
                        <td className="max-w-44 px-2 py-2.5 align-top">
                          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-accent-ink">
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
                          <span className="mt-0.5 block text-zinc-500 dark:text-zinc-400">
                            {formatoHora(parada.llegadaEstimada)} llegada
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-2.5 align-top text-[11px] text-zinc-600 dark:text-zinc-300">
                          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                            {`${formatoDistancia(parada.distanciaDesdeAnteriorMetros)} · ${formatoDuracionSegundos(parada.viajeDesdeAnteriorSegundos)}`}
                          </p>
                          <span className="mt-0.5 block text-zinc-500 dark:text-zinc-400">
                            {parada.tareasActivas} tareas
                          </span>
                        </td>
                        <td className="hidden px-2 py-2.5 align-top xl:table-cell">
                          <div className="flex justify-end">
                            <AccionesParada
                              parada={parada}
                              onNavegar={indicarNavegacion}
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
                  page={paginaRuta}
                  totalPages={totalPaginasTabla}
                  total={totalTabla}
                  limit={limiteRuta}
                  onPageChange={setPaginaRuta}
                  onLimitChange={(nuevoLimite) => {
                    setLimiteRuta(nuevoLimite);
                    setPaginaRuta(1);
                  }}
                />
              ) : null}
            </section>
          </div>
        </>
      )}

      <PantallaCarga
        visible={cargaActiva !== null}
        mensaje={cargaActiva?.mensaje ?? "Procesando"}
        detalle={cargaActiva?.detalle}
      />
    </div>
  );
}
