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
import type {
  EstadoParadaRuta,
  ParadaRuta,
  VisitaHoy,
} from "@/types/repositor";
import { anguloVehiculoEnRuta } from "@/utils/direccion-ruta";

function iconoParada(orden: number, estado: EstadoParadaRuta) {
  const color =
    estado === "EN_CURSO"
      ? "#059669"
      : estado === "ATRASADA"
        ? "#e11d48"
        : "#4f46e5";
  return divIcon({
    className: "ruta-pin-contenedor",
    html: `<div class="ruta-pin ${estado === "EN_CURSO" ? "ruta-pin-activo" : ""}" style="--ruta-pin-color:${color}"><span>${orden}</span></div>`,
    iconSize: [38, 46],
    iconAnchor: [19, 44],
  });
}

const iconoVehiculo = divIcon({
  className: "ruta-vehiculo-contenedor",
  html: `<div class="ruta-vehiculo">
    <div class="ruta-camion">
      <svg viewBox="0 0 48 32" aria-hidden="true">
        <path fill="#fbbf24" d="M3 6.5h23v16H3z"/>
        <path fill="#f59e0b" d="M5.5 9h7v6h-7z"/>
        <path fill="#fff" d="M26 11h8.5l7 7v4.5H26z"/>
        <path fill="#bfdbfe" d="M29 13.5h4.5l4 4H29z"/>
        <path fill="#4338ca" d="M3 21h39v4H3z"/>
        <circle fill="#1e1b4b" cx="12" cy="25" r="4"/>
        <circle fill="#e0e7ff" cx="12" cy="25" r="1.7"/>
        <circle fill="#1e1b4b" cx="35" cy="25" r="4"/>
        <circle fill="#e0e7ff" cx="35" cy="25" r="1.7"/>
      </svg>
    </div>
  </div>`,
  iconSize: [50, 50],
  iconAnchor: [25, 25],
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
    return geometria
      .slice(1)
      .map((punto, indice) => {
        const anterior = geometria[indice];
        const distancia = Math.hypot(
          punto[0] - anterior[0],
          punto[1] - anterior[1],
        );
        return {
          anterior,
          punto,
          distancia,
          angulo: anguloVehiculoEnRuta(anterior, punto),
        };
      })
      .filter(({ distancia }) => distancia > 0);
  }, [geometria]);

  useEffect(() => {
    if (segmentos.length === 0 || marcador.current === null) return;
    marcador.current
      .getElement()
      ?.style.setProperty(
        "--ruta-vehiculo-angulo",
        `${segmentos[0].angulo}deg`,
      );
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const total = segmentos.reduce(
      (suma, segmento) => suma + segmento.distancia,
      0,
    );
    let frame = 0;
    let indiceAnterior = -1;
    const inicio = performance.now();
    const duracion = Math.min(26000, Math.max(9000, geometria.length * 75));
    const animar = (ahora: number) => {
      const progreso = ((ahora - inicio) % duracion) / duracion;
      let objetivo = progreso * total;
      let segmento = segmentos[0];
      let indiceSegmento = 0;
      for (let indice = 0; indice < segmentos.length; indice += 1) {
        const actual = segmentos[indice];
        segmento = actual;
        indiceSegmento = indice;
        if (objetivo <= actual.distancia) break;
        objetivo -= actual.distancia;
      }
      if (indiceSegmento !== indiceAnterior) {
        marcador.current
          ?.getElement()
          ?.style.setProperty(
            "--ruta-vehiculo-angulo",
            `${segmento.angulo}deg`,
          );
        indiceAnterior = indiceSegmento;
      }
      const fraccion =
        segmento.distancia === 0 ? 0 : objetivo / segmento.distancia;
      marcador.current?.setLatLng([
        segmento.anterior[0] +
          (segmento.punto[0] - segmento.anterior[0]) * fraccion,
        segmento.anterior[1] +
          (segmento.punto[1] - segmento.anterior[1]) * fraccion,
      ]);
      frame = requestAnimationFrame(animar);
    };
    frame = requestAnimationFrame(animar);
    return () => cancelAnimationFrame(frame);
  }, [geometria.length, segmentos]);

  if (geometria.length === 0) return null;
  return (
    <Marker
      ref={marcador}
      position={geometria[0]}
      icon={iconoVehiculo}
      zIndexOffset={1500}
      interactive={false}
    />
  );
}

export function RutaMapa({
  geometria,
  paradas,
  ubicacion,
  calculada,
}: {
  geometria: [number, number][];
  paradas: Array<ParadaRuta | VisitaHoy>;
  ubicacion: { latitud: number; longitud: number } | null;
  calculada: boolean;
}) {
  const capa = useMapaOscuro() ? CAPAS_MAPA.oscuro : CAPAS_MAPA.claro;
  const puntos: [number, number][] =
    geometria.length > 0
      ? geometria
      : paradas.map(({ local }) => [local.latitud, local.longitud]);
  const centro: [number, number] = puntos[0] ?? CENTRO_DEFECTO;

  return (
    <div className="ruta-mapa relative isolate h-[54dvh] min-h-[390px] overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100 shadow-2xl shadow-indigo-950/10 dark:border-zinc-800 dark:bg-zinc-950 lg:h-[68dvh]">
      <MapContainer
        center={centro}
        zoom={ZOOM_DEFECTO}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          key={capa.nombre}
          attribution={capa.attribution}
          maxZoom={20}
          subdomains={capa.subdomains}
          url={capa.url}
        />
        {capa.etiquetasUrl && (
          <TileLayer
            key={`${capa.nombre}-labels`}
            className={capa.etiquetasClassName}
            maxZoom={20}
            subdomains={capa.subdomains}
            url={capa.etiquetasUrl}
            zIndex={2}
          />
        )}
        {geometria.length > 1 && (
          <>
            <Polyline
              positions={geometria}
              pathOptions={{
                color: "#312e81",
                weight: 11,
                opacity: 0.2,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <Polyline
              className="ruta-trazo-animado"
              positions={geometria}
              pathOptions={{
                color: "#6366f1",
                weight: 6,
                opacity: 0.95,
                dashArray: "12 13",
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        )}
        {ubicacion && (
          <Marker
            position={[ubicacion.latitud, ubicacion.longitud]}
            icon={divIcon({
              className: "",
              html: '<div class="ruta-origen"><span></span></div>',
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            })}
          >
            <Tooltip direction="top">Tu ubicación</Tooltip>
          </Marker>
        )}
        {paradas.map((parada) => (
          <Marker
            key={parada.clave}
            position={[parada.local.latitud, parada.local.longitud]}
            icon={iconoParada(parada.orden, parada.estado)}
          >
            <Tooltip direction="top" offset={[0, -40]}>
              <strong>{parada.local.nombre}</strong>
              <br />
              {parada.local.cliente.nombre}
            </Tooltip>
          </Marker>
        ))}
        <VehiculoAnimado geometria={geometria} />
        <AjustarRuta puntos={puntos} />
      </MapContainer>
      <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-full border border-white/60 bg-white/90 px-3 py-1.5 text-xs font-semibold text-indigo-950 shadow-lg backdrop-blur dark:border-zinc-700 dark:bg-zinc-950/90 dark:text-indigo-200">
        {calculada ? "Ruta calculada" : "Locales programados"} ·{" "}
        {paradas.length} paradas
      </div>
    </div>
  );
}
