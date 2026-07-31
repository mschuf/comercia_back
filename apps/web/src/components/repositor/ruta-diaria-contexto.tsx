"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { ApiError, apiFetch } from "@/lib/api";
import type {
  OpcionesCargaRuta,
  RutaDiaria,
  RutaDiariaContexto,
} from "@/types/repositor";
import { fechaEnZonaIso } from "@/utils/fechas";

const ContextoRutaDiaria = createContext<RutaDiariaContexto | null>(null);

interface SolicitudRuta {
  numero: number;
  promesa: Promise<RutaDiaria>;
}

export function RutaDiariaProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ruta, setRuta] = useState<RutaDiaria | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rutaActual = useRef<RutaDiaria | null>(null);
  const solicitudes = useRef(new Map<string, SolicitudRuta>());
  const secuencia = useRef(0);
  const ultimaAplicada = useRef(0);

  const cargarRuta = useCallback((opciones: OpcionesCargaRuta = {}) => {
    const guardada = rutaActual.current;
    const actual =
      guardada?.fecha === fechaEnZonaIso(new Date()) ? guardada : null;
    if (guardada && actual === null) {
      rutaActual.current = null;
      setRuta(null);
    }
    const necesitaOrigen =
      opciones.ubicacion !== undefined &&
      actual !== null &&
      !actual.usaUbicacionActual;
    if (actual && opciones.recalcular !== true && !necesitaOrigen) {
      return Promise.resolve(actual);
    }

    const parametros = new URLSearchParams();
    if (opciones.ubicacion) {
      parametros.set("latitud", String(opciones.ubicacion.latitud));
      parametros.set("longitud", String(opciones.ubicacion.longitud));
    }
    if (opciones.recalcular === true) {
      parametros.set("recalcular", "true");
    }
    const consulta = parametros.size > 0 ? `?${parametros.toString()}` : "";
    const clave = `/repositor/ruta-hoy${consulta}`;
    const existente = solicitudes.current.get(clave);
    if (existente) return existente.promesa;

    secuencia.current += 1;
    const numeroSolicitud = secuencia.current;
    setCargando(true);
    setError(null);
    const solicitud = apiFetch<RutaDiaria>(clave)
      .then((datos) => {
        if (numeroSolicitud >= ultimaAplicada.current) {
          ultimaAplicada.current = numeroSolicitud;
          rutaActual.current = datos;
          setRuta(datos);
          setError(null);
        }
        return datos;
      })
      .catch((problema: unknown) => {
        if (numeroSolicitud >= ultimaAplicada.current) {
          ultimaAplicada.current = numeroSolicitud;
          if (rutaActual.current === null) {
            setError(
              problema instanceof ApiError
                ? problema.message
                : "No pudimos cargar la ruta de hoy",
            );
          }
        }
        throw problema;
      })
      .finally(() => {
        if (solicitudes.current.get(clave)?.numero === numeroSolicitud) {
          solicitudes.current.delete(clave);
        }
        if (solicitudes.current.size === 0) setCargando(false);
      });
    solicitudes.current.set(clave, {
      numero: numeroSolicitud,
      promesa: solicitud,
    });
    return solicitud;
  }, []);

  const invalidarRuta = useCallback(() => {
    secuencia.current += 1;
    ultimaAplicada.current = secuencia.current;
    solicitudes.current.clear();
    rutaActual.current = null;
    setRuta(null);
    setCargando(false);
    setError(null);
  }, []);

  const valor = useMemo(
    () => ({ ruta, cargando, error, cargarRuta, invalidarRuta }),
    [cargarRuta, cargando, error, invalidarRuta, ruta],
  );

  return (
    <ContextoRutaDiaria.Provider value={valor}>
      {children}
    </ContextoRutaDiaria.Provider>
  );
}

export function useRutaDiaria(): RutaDiariaContexto {
  const contexto = useContext(ContextoRutaDiaria);
  if (!contexto) {
    throw new Error("useRutaDiaria debe usarse dentro de RutaDiariaProvider");
  }
  return contexto;
}
