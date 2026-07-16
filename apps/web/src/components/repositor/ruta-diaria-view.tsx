"use client";

import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { VisitaActiva } from "@/components/impulsador/visita-activa";
import { ApiError, apiFetch } from "@/lib/api";
import { obtenerUbicacion } from "@/lib/geolocalizacion";
import type { ParadaRuta, RutaDiaria } from "@/types/repositor";
import type { Visita } from "@/types/visita";
import { urlNavegarA, urlRutaCompleta } from "@/utils/google-maps";

const RutaMapa = dynamic(() => import("@/components/repositor/ruta-mapa").then((modulo) => modulo.RutaMapa), {
  ssr: false,
  loading: () => <div className="h-[54dvh] min-h-[390px] animate-pulse rounded-3xl bg-zinc-200 dark:bg-zinc-800" />,
});

function formatoDistancia(metros: number) {
  return metros < 1000 ? `${Math.round(metros)} m` : `${(metros / 1000).toFixed(1)} km`;
}

function formatoDuracion(segundos: number) {
  const minutos = Math.round(segundos / 60);
  return minutos < 60 ? `${minutos} min` : `${Math.floor(minutos / 60)} h ${minutos % 60} min`;
}

function formatoHora(iso: string) {
  return new Date(iso).toLocaleTimeString("es-PY", { hour: "2-digit", minute: "2-digit" });
}

export function RutaDiariaView() {
  const [ruta, setRuta] = useState<RutaDiaria | null>(null);
  const [ubicacion, setUbicacion] = useState<{ latitud: number; longitud: number } | null>(null);
  const [avisoGps, setAvisoGps] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [iniciando, setIniciando] = useState<string | null>(null);
  const [visita, setVisita] = useState<Visita | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    let posicion: { latitud: number; longitud: number } | null = null;
    try {
      posicion = await obtenerUbicacion();
      setUbicacion(posicion);
      setAvisoGps(null);
    } catch (problema) {
      setAvisoGps(problema instanceof Error ? `${problema.message} La ruta se ordenó sin tu punto de partida.` : "La ruta se ordenó sin tu punto de partida.");
    }
    try {
      const consulta = posicion ? `?latitud=${posicion.latitud}&longitud=${posicion.longitud}` : "";
      setRuta(await apiFetch<RutaDiaria>(`/repositor/ruta-hoy${consulta}`));
    } catch (problema) {
      setError(problema instanceof ApiError ? problema.message : "No pudimos calcular la ruta de hoy");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const inicio = window.setTimeout(() => void cargar(), 0);
    return () => window.clearTimeout(inicio);
  }, [cargar]);

  async function abrirVisita(parada: ParadaRuta) {
    if (iniciando !== null) return;
    setIniciando(parada.clave);
    setError(null);
    try {
      if (parada.visitaAbiertaId !== null) {
        setVisita(await apiFetch<Visita>(`/visitas/${parada.visitaAbiertaId}`));
      } else {
        const posicion = await obtenerUbicacion();
        setVisita(await apiFetch<Visita>("/visitas", {
          method: "POST",
          body: JSON.stringify({ localId: parada.local.id, latitud: posicion.latitud, longitud: posicion.longitud }),
        }));
      }
    } catch (problema) {
      setError(problema instanceof Error ? problema.message : "No pudimos iniciar la visita");
    } finally {
      setIniciando(null);
    }
  }

  const urlCompleta = ruta ? urlRutaCompleta(ruta.paradas, ubicacion) : null;
  const siguiente = ruta?.paradas[0] ?? null;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-700 p-5 text-white shadow-xl shadow-indigo-950/20 sm:p-7">
        <div className="ruta-orbita absolute -right-10 -top-16 h-52 w-52 rounded-full border border-indigo-300/20" />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-200">Plan inteligente del día</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Mi ruta de visitas</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-indigo-100/85 sm:text-base">Ordenamos tus locales por horario y tiempo real de traslado para reducir vueltas y llegadas tarde.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void cargar()} disabled={cargando} className="min-h-11 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold backdrop-blur transition hover:bg-white/20 disabled:opacity-60">{cargando ? "Calculando…" : "Recalcular"}</button>
            {siguiente && <a href={urlNavegarA(siguiente)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-indigo-950 shadow-lg transition hover:-translate-y-0.5">Iniciar navegación</a>}
          </div>
        </motion.div>
      </section>

      {avisoGps && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">{avisoGps}</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>}

      {cargando && ruta === null ? (
        <div className="grid gap-3 sm:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />)}</div>
      ) : ruta && (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Pendientes", String(ruta.paradas.length), `${ruta.totalCompletadas} completadas`],
              ["Distancia", formatoDistancia(ruta.distanciaTotalMetros), ruta.fuente === "OSRM" ? "por calles" : "estimada"],
              ["En traslado", formatoDuracion(ruta.duracionTrasladoSegundos), "sin contar visitas"],
              ["Ahorro", formatoDistancia(ruta.ahorroEstimadoMetros), "vs. orden horario"],
            ].map(([etiqueta, valor, detalle], indice) => (
              <motion.article key={etiqueta} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: indice * 0.07 }} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{etiqueta}</p><p className="mt-1 text-2xl font-black tracking-tight">{valor}</p><p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{detalle}</p>
              </motion.article>
            ))}
          </section>

          {ruta.paradas.length === 0 ? (
            <section className="rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl dark:bg-emerald-950">✓</div><h2 className="mt-4 text-xl font-bold">No tenés visitas pendientes hoy</h2><p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Cuando el Team Leader programe una visita para hoy, aparecerá automáticamente acá.</p></section>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.75fr)]">
              <RutaMapa geometria={ruta.geometria} paradas={ruta.paradas} ubicacion={ubicacion} />
              <section className="min-w-0">
                <div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="text-lg font-bold">Orden recomendado</h2><p className="text-sm text-zinc-500 dark:text-zinc-400">Llegadas estimadas según el tránsito calculado.</p></div>{urlCompleta && <a href={urlCompleta} target="_blank" rel="noreferrer" className="shrink-0 text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300">Abrir ruta</a>}</div>
                <ol className="space-y-3">
                  {ruta.paradas.map((parada, indice) => (
                    <motion.li key={parada.clave} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: indice * 0.055 }} className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                      <div className="flex gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-black text-white ${parada.estado === "ATRASADA" ? "bg-rose-600" : parada.estado === "EN_CURSO" ? "animate-pulse bg-emerald-600" : "bg-indigo-600"}`}>{parada.orden}</span><div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">{parada.local.cliente.nombre}</p><h3 className="truncate font-bold">{parada.local.nombre}</h3><p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Programada {formatoHora(parada.programadaEn)} · Llegada {formatoHora(parada.llegadaEstimada)}</p><p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{formatoDistancia(parada.distanciaDesdeAnteriorMetros)} · {formatoDuracion(parada.viajeDesdeAnteriorSegundos)} · {parada.tareasActivas} tareas</p></div></div>
                      <div className="mt-3 grid grid-cols-2 gap-2"><a href={urlNavegarA(parada)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-indigo-200 px-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 dark:border-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-950">Navegar</a><button type="button" onClick={() => void abrirVisita(parada)} disabled={iniciando !== null} className="min-h-11 rounded-xl bg-brand-700 px-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50">{iniciando === parada.clave ? "Verificando GPS…" : parada.visitaAbiertaId ? "Continuar visita" : "Iniciar visita"}</button></div>
                    </motion.li>
                  ))}
                </ol>
              </section>
            </div>
          )}
        </>
      )}

      {visita && <VisitaActiva visita={visita} onCerrar={() => setVisita(null)} onFinalizada={() => { setVisita(null); void cargar(); }} />}
    </div>
  );
}
