"use client";

import { useEffect, useMemo, useRef } from "react";
import { divIcon, latLngBounds } from "leaflet";
import type { Marker as MarkerLeaflet } from "leaflet";
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  CAPAS_MAPA,
  CENTRO_DEFECTO,
  ZOOM_DEFECTO,
  useMapaOscuro,
} from "@/components/impulsador/mapa-base";
import type { ParadaRuta } from "@/types/repositor";

function iconoParada(orden: number, estado: ParadaRuta["estado"]) {
  const color = estado === "EN_CURSO" ? "#059669" : estado === "ATRASADA" ? "#e11d48" : "#4f46e5";
  return divIcon({
    className: "ruta-pin-contenedor",
    html: `<div class="ruta-pin ${estado === "EN_CURSO" ? "ruta-pin-activo" : ""}" style="--ruta-pin-color:${color}"><span>${orden}</span></div>`,
    iconSize: [38, 46],
    iconAnchor: [19, 44],
  });
}

const iconoVehiculo = divIcon({
  className: "ruta-vehiculo-contenedor",
  html: '<div class="ruta-vehiculo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 2l7 19-7-4-7 4 7-19z"/></svg></div>',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});

function AjustarRuta({ puntos }: { puntos: [number, number][] }) {
  const mapa = useMap();
  useEffect(() => {
    if (puntos.length === 0) return;
    if (puntos.length === 1) {
      mapa.setView(puntos[0], 16, { animate: true });
      return;
    }
    mapa.fitBounds(latLngBounds(puntos), {
      padding: [42, 42],
      maxZoom: 16,
      animate: true,
    });
  }, [mapa, puntos]);
  return null;
}

function VehiculoAnimado({ geometria }: { geometria: [number, number][] }) {
  const marcador = useRef<MarkerLeaflet | null>(null);
  const segmentos = useMemo(() => {
    if (geometria.length < 2) return [];
    return geometria.slice(1).map((punto, indice) => {
      const anterior = geometria[indice];
      const distancia = Math.hypot(punto[0] - anterior[0], punto[1] - anterior[1]);
      return { anterior, punto, distancia };
    });
  }, [geometria]);

  useEffect(() => {
    if (segmentos.length === 0 || marcador.current === null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const total = segmentos.reduce((suma, segmento) => suma + segmento.distancia, 0);
    let frame = 0;
    const inicio = performance.now();
    const duracion = Math.min(26000, Math.max(9000, geometria.length * 75));
    const animar = (ahora: number) => {
      const progreso = ((ahora - inicio) % duracion) / duracion;
      let objetivo = progreso * total;
      let segmento = segmentos[0];
      for (const actual of segmentos) {
        segmento = actual;
        if (objetivo <= actual.distancia) break;
        objetivo -= actual.distancia;
      }
      const fraccion = segmento.distancia === 0 ? 0 : objetivo / segmento.distancia;
      marcador.current?.setLatLng([
        segmento.anterior[0] + (segmento.punto[0] - segmento.anterior[0]) * fraccion,
        segmento.anterior[1] + (segmento.punto[1] - segmento.anterior[1]) * fraccion,
      ]);
      frame = requestAnimationFrame(animar);
    };
    frame = requestAnimationFrame(animar);
    return () => cancelAnimationFrame(frame);
  }, [geometria.length, segmentos]);

  if (geometria.length === 0) return null;
  return <Marker ref={marcador} position={geometria[0]} icon={iconoVehiculo} zIndexOffset={1500} interactive={false} />;
}

export function RutaMapa({
  geometria,
  paradas,
  ubicacion,
}: {
  geometria: [number, number][];
  paradas: ParadaRuta[];
  ubicacion: { latitud: number; longitud: number } | null;
}) {
  const capa = useMapaOscuro() ? CAPAS_MAPA.oscuro : CAPAS_MAPA.claro;
  const puntos: [number, number][] =
    geometria.length > 0
      ? geometria
      : paradas.map(({ local }) => [local.latitud, local.longitud]);
  const centro: [number, number] = puntos[0] ?? CENTRO_DEFECTO;

  return (
    <div className="ruta-mapa relative isolate h-[54dvh] min-h-[390px] overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100 shadow-2xl shadow-indigo-950/10 dark:border-zinc-800 dark:bg-zinc-950 lg:h-[68dvh]">
      <MapContainer center={centro} zoom={ZOOM_DEFECTO} scrollWheelZoom className="h-full w-full">
        <TileLayer key={capa.nombre} attribution={capa.attribution} maxZoom={20} subdomains={capa.subdomains} url={capa.url} />
        {capa.etiquetasUrl && <TileLayer key={`${capa.nombre}-labels`} className={capa.etiquetasClassName} maxZoom={20} subdomains={capa.subdomains} url={capa.etiquetasUrl} zIndex={2} />}
        {geometria.length > 1 && (
          <>
            <Polyline positions={geometria} pathOptions={{ color: "#312e81", weight: 11, opacity: 0.2, lineCap: "round", lineJoin: "round" }} />
            <Polyline className="ruta-trazo-animado" positions={geometria} pathOptions={{ color: "#6366f1", weight: 6, opacity: 0.95, dashArray: "12 13", lineCap: "round", lineJoin: "round" }} />
          </>
        )}
        {ubicacion && (
          <Marker position={[ubicacion.latitud, ubicacion.longitud]} icon={divIcon({ className: "", html: '<div class="ruta-origen"><span></span></div>', iconSize: [26, 26], iconAnchor: [13, 13] })}>
            <Tooltip direction="top">Tu ubicación</Tooltip>
          </Marker>
        )}
        {paradas.map((parada) => (
          <Marker key={parada.clave} position={[parada.local.latitud, parada.local.longitud]} icon={iconoParada(parada.orden, parada.estado)}>
            <Tooltip direction="top" offset={[0, -40]}><strong>{parada.local.nombre}</strong><br />{parada.local.cliente.nombre}</Tooltip>
          </Marker>
        ))}
        <VehiculoAnimado geometria={geometria} />
        <AjustarRuta puntos={puntos} />
      </MapContainer>
      <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-xs font-semibold text-indigo-950 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-950/90 dark:text-indigo-200">
        Ruta optimizada · {paradas.length} paradas
      </div>
    </div>
  );
}
