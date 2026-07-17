"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { divIcon, latLngBounds } from "leaflet";
import type { DivIcon, Marker as MarkerLeaflet } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Territorio, Zona } from "@/types/territorio";
import type { LocalMapa } from "@/types/mapa";
import {
  CAPAS_MAPA,
  CENTRO_DEFECTO,
  ZOOM_DEFECTO,
  useMapaOscuro,
  type SeleccionMapa,
  type VisibilidadCapas,
} from "@/components/impulsador/mapa-base";

// Editor de mapa del módulo Impulsador. Client-only: importarlo SIEMPRE con
// next/dynamic y ssr:false (Leaflet toca window al cargar). Componente
// controlado: todo el estado (selección, capas, vértices) vive en mapa-view.

const COLOR_SIN_ZONA = "#b91c1c";
const COLOR_DIBUJO = "#059669";
const COLOR_MOVIMIENTO = "#7c3aed";

// Los divIcon se cachean por color: la paleta es acotada y así no se crea
// un ícono nuevo por marker en cada render
const cachePines = new Map<string, DivIcon>();

function iconoPin(color: string): DivIcon {
  const enCache = cachePines.get(color);
  if (enCache) return enCache;
  const icono = divIcon({
    className: "mapa-pin-contenedor",
    html: `<div class="mapa-pin" style="--mapa-pin-color:${color}"><span></span></div>`,
    iconSize: [34, 42],
    iconAnchor: [17, 40],
  });
  cachePines.set(color, icono);
  return icono;
}

// Vértice arrastrable del modo dibujo: círculo chico blanco con borde brand
const iconoVertice = divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid ${COLOR_DIBUJO};box-shadow:0 1px 4px rgba(0,0,0,.35);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const iconoDestino = divIcon({
  className: "",
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#fff;border:4px solid ${COLOR_MOVIMIENTO};box-shadow:0 2px 8px rgba(0,0,0,.4);"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function ClicksMapa({
  onClick,
}: {
  onClick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function CentrarSeleccion({
  trigger,
  puntos,
}: {
  trigger: number;
  puntos: [number, number][];
}) {
  const map = useMap();
  const puntosRef = useRef(puntos);

  useEffect(() => {
    puntosRef.current = puntos;
  }, [puntos]);

  useEffect(() => {
    if (trigger === 0 || puntosRef.current.length === 0) return;
    map.fitBounds(latLngBounds(puntosRef.current), {
      padding: [48, 48],
      maxZoom: 17,
    });
  }, [trigger, map]);

  return null;
}

// Encuadra todo el contenido cuando el trigger numérico cambia (botón Ver todo).
// Los puntos van por ref para que un refetch no vuelva a mover el mapa.
function CentrarTodo({
  trigger,
  puntos,
}: {
  trigger: number;
  puntos: [number, number][];
}) {
  const map = useMap();
  const puntosRef = useRef(puntos);
  // Se actualiza en un efecto (no en el render) y ANTES del efecto del
  // trigger: los efectos corren en orden de declaración.
  useEffect(() => {
    puntosRef.current = puntos;
  }, [puntos]);

  useEffect(() => {
    if (trigger === 0 || puntosRef.current.length === 0) return;
    map.fitBounds(latLngBounds(puntosRef.current), {
      padding: [32, 32],
      maxZoom: 16,
    });
  }, [trigger, map]);

  return null;
}

interface MapaEditorProps {
  territorios: Territorio[];
  zonas: Zona[];
  locales: LocalMapa[];
  visibilidad: VisibilidadCapas;
  seleccion: SeleccionMapa | null;
  modoDibujo: boolean;
  modoMover: boolean;
  vertices: [number, number][];
  verticesMover: [number, number][];
  destinoMover: [number, number] | null;
  centrarSeleccionTrigger: number;
  onAgregarVertice: (lat: number, lng: number) => void;
  onMoverVertice: (indice: number, lat: number, lng: number) => void;
  onPosicionarMovimiento: (lat: number, lng: number) => void;
  onClickLocal: (id: number) => void;
  onClickElemento: (tipo: "territorio" | "zona", id: number) => void;
}

export function MapaEditor({
  territorios,
  zonas,
  locales,
  visibilidad,
  seleccion,
  modoDibujo,
  modoMover,
  vertices,
  verticesMover,
  destinoMover,
  centrarSeleccionTrigger,
  onAgregarVertice,
  onMoverVertice,
  onPosicionarMovimiento,
  onClickLocal,
  onClickElemento,
}: MapaEditorProps) {
  const capa = useMapaOscuro() ? CAPAS_MAPA.oscuro : CAPAS_MAPA.claro;
  const [triggerCentrar, setTriggerCentrar] = useState(0);

  const coloresPorZona = useMemo(() => {
    const colores = new Map<number, string>();
    for (const z of zonas) colores.set(z.id, z.color);
    return colores;
  }, [zonas]);

  const puntosTodos = useMemo(() => {
    const puntos: [number, number][] = [];
    for (const t of territorios) if (t.poligono) puntos.push(...t.poligono);
    for (const z of zonas) if (z.poligono) puntos.push(...z.poligono);
    for (const l of locales) puntos.push([l.latitud, l.longitud]);
    return puntos;
  }, [territorios, zonas, locales]);

  const puntosSeleccionados = useMemo(() => {
    if (!seleccion) return [];
    const elemento =
      seleccion.tipo === "territorio"
        ? territorios.find((territorio) => territorio.id === seleccion.id)
        : zonas.find((zona) => zona.id === seleccion.id);
    return elemento?.poligono ?? [];
  }, [seleccion, territorios, zonas]);

  const esSeleccionado = (tipo: "territorio" | "zona", id: number) =>
    seleccion !== null && seleccion.tipo === tipo && seleccion.id === id;

  // Mientras se redibuja un elemento, su polígono original se oculta para que
  // no se superponga con la vista previa del dibujo
  const ocultoPorHerramienta = (tipo: "territorio" | "zona", id: number) =>
    (modoDibujo || modoMover) && esSeleccionado(tipo, id);

  return (
    // isolate: los panes de Leaflet usan z-index altos; sin esto se dibujan
    // por encima de modales y del resto de la página
    <div
      className={`relative isolate h-[52dvh] min-h-[320px] w-full overflow-hidden rounded-xl border border-zinc-300 bg-zinc-100 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 lg:h-[70dvh] lg:min-h-[420px] ${
        modoDibujo || modoMover ? "[&_.leaflet-container]:cursor-crosshair" : ""
      } [&_.leaflet-control-attribution]:!bg-white [&_.leaflet-control-attribution]:!text-zinc-700 dark:[&_.leaflet-control-attribution]:!bg-zinc-950 dark:[&_.leaflet-control-attribution]:!text-zinc-200 dark:[&_.leaflet-control-zoom_a]:!border-zinc-700 dark:[&_.leaflet-control-zoom_a]:!bg-zinc-900 dark:[&_.leaflet-control-zoom_a]:!text-zinc-100 dark:[&_.mapa-etiquetas-oscuras]:brightness-150 dark:[&_.mapa-etiquetas-oscuras]:contrast-125`}
    >
      <MapContainer
        center={CENTRO_DEFECTO}
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

        {visibilidad.territorios &&
          territorios.map((t) =>
            t.poligono === null ||
            ocultoPorHerramienta("territorio", t.id) ? null : (
              <Polygon
                key={`territorio-${t.id}`}
                positions={t.poligono}
                pathOptions={{
                  color: t.color,
                  fillColor: t.color,
                  weight: 2,
                  fillOpacity: esSeleccionado("territorio", t.id) ? 0.28 : 0.18,
                  dashArray: esSeleccionado("territorio", t.id)
                    ? "6 6"
                    : undefined,
                  className: esSeleccionado("territorio", t.id)
                    ? "mapa-area-animada"
                    : undefined,
                }}
                eventHandlers={{
                  click: () => {
                    if (!modoDibujo && !modoMover)
                      onClickElemento("territorio", t.id);
                  },
                }}
              >
                <Tooltip sticky>{t.nombre}</Tooltip>
              </Polygon>
            ),
          )}

        {/* Las zonas se renderizan después de los territorios para quedar encima */}
        {visibilidad.zonas &&
          zonas.map((z) =>
            z.poligono === null || ocultoPorHerramienta("zona", z.id) ? null : (
              <Polygon
                key={`zona-${z.id}`}
                positions={z.poligono}
                pathOptions={{
                  color: z.color,
                  fillColor: z.color,
                  weight: 2,
                  fillOpacity: esSeleccionado("zona", z.id) ? 0.42 : 0.3,
                  dashArray: esSeleccionado("zona", z.id) ? "6 6" : undefined,
                  className: esSeleccionado("zona", z.id)
                    ? "mapa-area-animada"
                    : undefined,
                }}
                eventHandlers={{
                  click: () => {
                    if (!modoDibujo && !modoMover)
                      onClickElemento("zona", z.id);
                  },
                }}
              >
                <Tooltip sticky>
                  {z.nombre} · {z.territorioNombre}
                </Tooltip>
              </Polygon>
            ),
          )}

        {visibilidad.locales &&
          locales.map((l) => (
            <Marker
              key={`local-${l.id}`}
              position={[l.latitud, l.longitud]}
              icon={iconoPin(
                (l.zonaId !== null
                  ? coloresPorZona.get(l.zonaId)
                  : undefined) ?? COLOR_SIN_ZONA,
              )}
              eventHandlers={{
                click: () => {
                  if (!modoDibujo && !modoMover) onClickLocal(l.id);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -26]}>
                {l.nombre}
              </Tooltip>
            </Marker>
          ))}

        {modoDibujo && (
          <>
            <ClicksMapa onClick={onAgregarVertice} />
            {vertices.length >= 2 && (
              <Polyline
                positions={vertices}
                pathOptions={{
                  color: COLOR_DIBUJO,
                  weight: 2,
                  dashArray: "4 4",
                }}
              />
            )}
            {vertices.length >= 3 && (
              <Polygon
                positions={vertices}
                pathOptions={{
                  color: COLOR_DIBUJO,
                  weight: 1,
                  fillColor: COLOR_DIBUJO,
                  fillOpacity: 0.15,
                }}
              />
            )}
            {vertices.map(([lat, lng], i) => (
              <Marker
                // el índice es estable: los vértices solo se agregan al final,
                // se quitan del final o se reemplazan en su posición
                key={`vertice-${i}`}
                position={[lat, lng]}
                icon={iconoVertice}
                draggable
                zIndexOffset={1000}
                eventHandlers={{
                  dragend: (e) => {
                    const punto = (e.target as MarkerLeaflet).getLatLng();
                    onMoverVertice(i, punto.lat, punto.lng);
                  },
                }}
              />
            ))}
          </>
        )}

        {modoMover && (
          <>
            <ClicksMapa onClick={onPosicionarMovimiento} />
            {verticesMover.length >= 3 && (
              <Polygon
                positions={verticesMover}
                pathOptions={{
                  color: COLOR_MOVIMIENTO,
                  weight: 3,
                  fillColor: COLOR_MOVIMIENTO,
                  fillOpacity: 0.24,
                  dashArray: "7 5",
                }}
              />
            )}
            {destinoMover && (
              <Marker
                position={destinoMover}
                icon={iconoDestino}
                zIndexOffset={1200}
              >
                <Tooltip direction="top">Nuevo centro</Tooltip>
              </Marker>
            )}
          </>
        )}

        <CentrarTodo trigger={triggerCentrar} puntos={puntosTodos} />
        <CentrarSeleccion
          trigger={centrarSeleccionTrigger}
          puntos={puntosSeleccionados}
        />
      </MapContainer>

      {/* bottom-8 para no tapar la atribución de Leaflet; z arriba de sus panes */}
      <button
        type="button"
        onClick={() => setTriggerCentrar((n) => n + 1)}
        disabled={puntosTodos.length === 0}
        className="absolute bottom-8 right-3 z-[1100] inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-control-line bg-surface-raised px-3 text-sm font-semibold text-foreground shadow-md transition hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-brand-600 disabled:cursor-not-allowed disabled:opacity-50 lg:h-9"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4"
          aria-hidden
        >
          <circle cx="12" cy="12" r="7" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
        Ver todo
      </button>
    </div>
  );
}
