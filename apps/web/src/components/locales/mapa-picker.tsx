"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";

// Selector de ubicación con Leaflet + OpenStreetMap. Client-only: importarlo
// SIEMPRE con next/dynamic y ssr:false (Leaflet toca window al cargar).

// Asunción como centro por defecto
const CENTRO_DEFECTO: [number, number] = [-25.2867, -57.6472];
const ZOOM_DEFECTO = 13;
const ATRIBUCION_CARTO =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

const CAPAS_MAPA = {
  claro: {
    nombre: "voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    attribution: ATRIBUCION_CARTO,
    subdomains: "abcd",
    etiquetasUrl: null,
    etiquetasClassName: undefined,
  },
  oscuro: {
    nombre: "dark-matter",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}.png",
    attribution: ATRIBUCION_CARTO,
    subdomains: "abcd",
    etiquetasUrl:
      "https://{s}.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}.png",
    etiquetasClassName: "mapa-etiquetas-oscuras",
  },
} as const;

// Pin propio con divIcon: evita los PNG rotos del ícono default de Leaflet
const iconoPin = divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#b91c1c;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:grid;place-items:center;"><div style="width:8px;height:8px;border-radius:50%;background:#fff;"></div></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

function ClicksEnMapa({
  onSeleccion,
}: {
  onSeleccion: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSeleccion(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Re-centra suavemente cuando cambian las coordenadas (ej. carga manual)
function CentrarEn({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (lat !== null && lng !== null) {
      map.panTo([lat, lng]);
    }
  }, [lat, lng, map]);
  return null;
}

function useMapaOscuro() {
  const [oscuro, setOscuro] = useState(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const raiz = document.documentElement;
    const actualizar = () => setOscuro(raiz.classList.contains("dark"));
    actualizar();

    const observer = new MutationObserver(actualizar);
    observer.observe(raiz, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  return oscuro;
}

export function MapaPicker({
  lat,
  lng,
  onSeleccion,
}: {
  lat: number | null;
  lng: number | null;
  onSeleccion: (lat: number, lng: number) => void;
}) {
  const centro: [number, number] =
    lat !== null && lng !== null ? [lat, lng] : CENTRO_DEFECTO;
  const capa = useMapaOscuro() ? CAPAS_MAPA.oscuro : CAPAS_MAPA.claro;

  return (
    // isolate: los panes de Leaflet usan z-index altos; sin esto se dibujan
    // por encima del contenido del modal
    <div className="isolate h-[52dvh] min-h-[340px] w-full overflow-hidden rounded-lg border border-zinc-300 bg-zinc-100 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 sm:h-[58dvh] sm:min-h-[430px] lg:h-[560px] lg:min-h-0 [&_.leaflet-control-attribution]:!bg-white [&_.leaflet-control-attribution]:!text-zinc-700 dark:[&_.leaflet-control-attribution]:!bg-zinc-950 dark:[&_.leaflet-control-attribution]:!text-zinc-200 dark:[&_.leaflet-control-zoom_a]:!border-zinc-700 dark:[&_.leaflet-control-zoom_a]:!bg-zinc-900 dark:[&_.leaflet-control-zoom_a]:!text-zinc-100 dark:[&_.mapa-etiquetas-oscuras]:brightness-150 dark:[&_.mapa-etiquetas-oscuras]:contrast-125">
      <MapContainer
        center={centro}
        zoom={ZOOM_DEFECTO}
        scrollWheelZoom
        className="h-full w-full cursor-crosshair"
      >
        <TileLayer
          key={capa.nombre}
          attribution={capa.attribution}
          maxZoom={20}
          subdomains={capa.subdomains}
          url={capa.url}
        />
        {capa.etiquetasUrl !== null && (
          <TileLayer
            key={`${capa.nombre}-etiquetas`}
            className={capa.etiquetasClassName}
            maxZoom={20}
            opacity={1}
            subdomains={capa.subdomains}
            url={capa.etiquetasUrl}
            zIndex={2}
          />
        )}
        <ClicksEnMapa onSeleccion={onSeleccion} />
        <CentrarEn lat={lat} lng={lng} />
        {lat !== null && lng !== null && (
          <Marker position={[lat, lng]} icon={iconoPin} />
        )}
      </MapContainer>
    </div>
  );
}
