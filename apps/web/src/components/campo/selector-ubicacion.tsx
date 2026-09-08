"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { btnGhost, errorBox } from "@/components/ui";

export default function SelectorUbicacion({
  latitud,
  longitud,
  onChange,
}: {
  latitud: number;
  longitud: number;
  onChange: (latitud: number, longitud: number) => void;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const marcador = useRef<L.Marker | null>(null);
  const cambiar = useRef(onChange);
  const [error, setError] = useState("");

  useEffect(() => {
    cambiar.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!contenedor.current) return;
    const instancia = L.map(contenedor.current, {
      scrollWheelZoom: false,
    }).setView([-25.3, -57.6], 15);
    mapa.current = instancia;
    const tiles = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    ).addTo(instancia);
    tiles.on("tileerror", () =>
      setError(
        "No se pudo cargar el mapa. Podés ingresar las coordenadas a mano.",
      ),
    );
    const punto = L.marker([-25.3, -57.6], {
      draggable: true,
      title: "Ubicación del local: arrastrá para mover",
      icon: L.divIcon({
        className: "",
        html: '<span style="display:block;width:24px;height:24px;border:3px solid white;border-radius:50%;background:#047857;box-shadow:0 1px 5px #0008"></span>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    }).addTo(instancia);
    marcador.current = punto;
    const elegir = (posicion: L.LatLng) => {
      const p = posicion.wrap();
      cambiar.current(
        Number(Math.max(-90, Math.min(90, p.lat)).toFixed(6)),
        Number(p.lng.toFixed(6)),
      );
    };
    instancia.on("click", (e: L.LeafletMouseEvent) => elegir(e.latlng));
    punto.on("dragend", () => elegir(punto.getLatLng()));
    const observer = new ResizeObserver(() => instancia.invalidateSize());
    observer.observe(contenedor.current);
    return () => {
      observer.disconnect();
      instancia.remove();
      mapa.current = null;
      marcador.current = null;
    };
  }, []);

  useEffect(() => {
    if (
      !Number.isFinite(latitud) ||
      !Number.isFinite(longitud) ||
      Math.abs(latitud) > 90 ||
      Math.abs(longitud) > 180
    )
      return;
    marcador.current?.setLatLng([latitud, longitud]);
    mapa.current?.panTo([latitud, longitud]);
  }, [latitud, longitud]);

  return (
    <section className="space-y-2" aria-label="Elegir ubicación del local">
      <p className="text-sm text-muted">
        Buscá el local moviendo y ampliando el mapa. Tocá el punto o arrastrá el
        marcador para elegir su ubicación.
      </p>
      <div
        ref={contenedor}
        className="relative z-0 h-72 w-full rounded-xl border border-line"
        aria-label="Mapa interactivo de ubicación"
      />
      <button
        type="button"
        className={`${btnGhost} min-h-11`}
        onClick={() => {
          const centro = mapa.current?.getCenter().wrap();
          if (centro)
            onChange(
              Number(Math.max(-90, Math.min(90, centro.lat)).toFixed(6)),
              Number(centro.lng.toFixed(6)),
            );
        }}
      >
        Usar el centro del mapa
      </button>
      <p className="text-xs text-muted">
        También podés desplazarte con las flechas y acercar con +. Los campos de
        latitud y longitud se mantienen sincronizados.
      </p>
      {error ? (
        <p className={errorBox} role="status">
          {error}
        </p>
      ) : null}
    </section>
  );
}
