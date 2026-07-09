"use client";

import { useEffect, useState } from "react";

// Constantes y hook compartidos por el mapa del módulo Impulsador
// (mapa-view + mapa-editor). Copiados del patrón de locales/mapa-picker.tsx:
// tiles CARTO con variante clara/oscura y detección del tema por clase .dark.

// Asunción como centro por defecto
export const CENTRO_DEFECTO: [number, number] = [-25.2867, -57.6472];
export const ZOOM_DEFECTO = 13;

const ATRIBUCION_CARTO =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const CAPAS_MAPA = {
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

// Estado de UI compartido entre la vista y el editor (no es tipo de dominio:
// no viaja por la API, por eso vive junto a los componentes y no en @/types)
export interface SeleccionMapa {
  tipo: "territorio" | "zona";
  id: number;
}

export interface VisibilidadCapas {
  territorios: boolean;
  zonas: boolean;
  locales: boolean;
}

export function useMapaOscuro() {
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
