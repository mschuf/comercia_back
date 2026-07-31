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
      ? "var(--route-active)"
      : estado === "ATRASADA"
        ? "var(--route-late)"
        : "var(--route-pending)";
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
        <path fill="var(--accent)" d="M3 6.5h23v16H3z"/>
        <path fill="var(--accent-ink)" d="M5.5 9h7v6h-7z"/>
        <path fill="var(--surface-raised)" d="M26 11h8.5l7 7v4.5H26z"/>
        <path fill="var(--accent-soft)" d="M29 13.5h4.5l4 4H29z"/>
        <path fill="var(--commercial-ink-soft)" d="M3 21h39v4H3z"/>
        <circle fill="var(--commercial-ink)" cx="12" cy="25" r="4"/>
        <circle fill="var(--surface-raised)" cx="12" cy="25" r="1.7"/>
        <circle fill="var(--commercial-ink)" cx="35" cy="25" r="4"/>
        <circle fill="var(--surface-raised)" cx="35" cy="25" r="1.7"/>
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
    <div className="ruta-mapa relative isolate h-[54dvh] min-h-[390px] overflow-hidden rounded-3xl border border-line bg-surface-soft shadow-[0_18px_44px_rgba(var(--warm-shadow),0.12)] lg:h-[68dvh]">
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
                color: "var(--route-line-shadow)",
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
                color: "var(--route-line)",
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
      <div className="pointer-events-none absolute left-3 top-3 z-[1000] rounded-full border border-control-line bg-surface-raised px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg">
        {calculada ? "Ruta calculada" : "Locales programados"} ·{" "}
        {paradas.length} paradas
      </div>
    </div>
  );
}
