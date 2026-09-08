"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { OpcionSelector } from "@/types/opcion-selector";
import type { RespuestaPaginada } from "@/types/paginacion";
import { Paginacion } from "@/components/paginacion";
import { PantallaCarga } from "@/components/pantalla-carga";
import { btnGhost, errorBox, inputBase, labelBase } from "@/components/ui";

// Montar con key={url} cuando cambie el alcance para reiniciar la paginación.
export function SelectorPaginado({
  url,
  etiqueta,
  value,
  onChange,
  seleccionActual,
  vacio = "Seleccioná una opción",
  required = false,
  excluirId,
  buscable = false,
}: {
  url: string;
  etiqueta: string;
  value: number | "";
  onChange: (id: number | "") => void;
  seleccionActual?: string;
  vacio?: string;
  required?: boolean;
  excluirId?: number;
  buscable?: boolean;
}) {
  const [datos, setDatos] = useState<RespuestaPaginada<OpcionSelector> | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(7);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);
  const [elegida, setElegida] = useState<OpcionSelector | null>(null);
  const [buscar, setBuscar] = useState("");

  useEffect(() => {
    let vigente = true;
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        apiFetch<RespuestaPaginada<OpcionSelector>>(
          `${url}${url.includes("?") ? "&" : "?"}page=${page}&limit=${limit}${buscable ? `&buscar=${encodeURIComponent(buscar.trim())}` : ""}`,
          { signal: controller.signal },
        )
          .then((respuesta) => {
            if (vigente) {
              setDatos(respuesta);
              setError(null);
            }
          })
          .catch((problema) => {
            if (vigente)
              setError(
                problema instanceof ApiError
                  ? problema.message
                  : "No se pudieron cargar las opciones",
              );
          })
          .finally(() => {
            if (vigente) setCargando(false);
          });
      },
      buscable ? 300 : 0,
    );
    return () => {
      vigente = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [url, page, limit, intento, buscar, buscable]);

  const opciones = (datos?.items ?? []).filter((item) => item.id !== excluirId);
  const fueraDePagina =
    value !== "" && !opciones.some((item) => item.id === value);
  return (
    <div className="w-full min-w-0">
      <PantallaCarga
        visible={cargando && !buscable}
        mensaje={`Cargando ${etiqueta.toLowerCase()}`}
      />
      {buscable ? (
        <label className={labelBase}>
          Buscar {etiqueta.toLowerCase()}
          <input
            type="search"
            className={inputBase}
            value={buscar}
            maxLength={120}
            placeholder="Escribí un nombre para filtrar"
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            onChange={(e) => {
              setBuscar(e.target.value);
              setPage(1);
              setCargando(true);
              setError(null);
            }}
          />
        </label>
      ) : null}
      {buscable ? (
        <p role="status" className="my-2 text-sm text-muted">
          {cargando
            ? "Buscando opciones…"
            : !error && opciones.length === 0
              ? "No se encontraron resultados."
              : "Seleccioná una opción de los resultados."}
        </p>
      ) : null}
      <label className={labelBase}>
        {etiqueta}
        <select
          className={inputBase}
          value={value}
          required={required}
          disabled={cargando || !!error}
          onChange={(evento) => {
            const id =
              evento.target.value === "" ? "" : Number(evento.target.value);
            setElegida(opciones.find((item) => item.id === id) ?? null);
            onChange(id);
          }}
        >
          <option value="">{vacio}</option>
          {fueraDePagina ? (
            <option value={value}>
              {elegida?.id === value
                ? (elegida.nombre ?? elegida.descripcion)
                : (seleccionActual ?? `Seleccionado: ${value}`)}
            </option>
          ) : null}
          {opciones.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nombre ?? item.descripcion}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <div className={`${errorBox} mt-2`}>
          <p>{error}</p>
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              setCargando(true);
              setIntento((n) => n + 1);
            }}
          >
            Reintentar
          </button>
        </div>
      ) : null}
      {datos && !cargando && !error && datos.totalPages > 1 ? (
        <Paginacion
          page={datos.page}
          limit={datos.limit}
          total={datos.total}
          totalPages={datos.totalPages}
          onPageChange={(pagina) => {
            setCargando(true);
            setPage(pagina);
          }}
          onLimitChange={(cantidad) => {
            setCargando(true);
            setLimit(cantidad);
            setPage(1);
          }}
        />
      ) : null}
    </div>
  );
}
