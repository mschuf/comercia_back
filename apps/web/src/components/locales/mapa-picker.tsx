"use client";

import { useEffect } from "react";
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

  return (
    // isolate: los panes de Leaflet usan z-index altos; sin esto se dibujan
    // por encima del contenido del modal
    <div className="isolate h-56 w-full overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700 sm:h-64">
      <MapContainer
        center={centro}
        zoom={ZOOM_DEFECTO}
        scrollWheelZoom
        className="h-full w-full cursor-crosshair"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClicksEnMapa onSeleccion={onSeleccion} />
        <CentrarEn lat={lat} lng={lng} />
        {lat !== null && lng !== null && (
          <Marker position={[lat, lng]} icon={iconoPin} />
        )}
      </MapContainer>
    </div>
  );
}
