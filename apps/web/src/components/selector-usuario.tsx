"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { buscarUsuariosAsignables } from "@/lib/usuarios-asignables";
import type { UsuarioAsignable } from "@/types/local";
import type { RespuestaPaginada } from "@/types/paginacion";
import { normalizarBusqueda } from "@/utils/texto";

interface SelectorUsuarioProps {
  value: number | "";
  onChange: (usuarioId: number | "") => void;
  seleccionadoInicial?: UsuarioAsignable | null;
  usuariosPermitidos?: UsuarioAsignable[];
  disabled?: boolean;
}

const ESPERA_BUSQUEDA_MS = 280;
const LIMITE_PAGINA = 15;

export function SelectorUsuario({
  value,
  onChange,
  seleccionadoInicial = null,
  usuariosPermitidos,
  disabled = false,
}: SelectorUsuarioProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  const [datos, setDatos] =
    useState<RespuestaPaginada<UsuarioAsignable> | null>(null);
  const [claveResuelta, setClaveResuelta] = useState<string | null>(null);
  const [errorSolicitud, setErrorSolicitud] = useState<{
    clave: string;
    mensaje: string;
  } | null>(null);
  const [reintento, setReintento] = useState(0);
  const [seleccionRecordada, setSeleccionRecordada] =
    useState<UsuarioAsignable | null>(seleccionadoInicial);
  const [indiceActivo, setIndiceActivo] = useState(0);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const idBase = useId();
  const idsPermitidos = useMemo(
    () =>
      usuariosPermitidos === undefined
        ? null
        : new Set(usuariosPermitidos.map((usuario) => usuario.id)),
    [usuariosPermitidos],
  );
  const claveSolicitud = `${busquedaAplicada}\u0000${pagina}\u0000${reintento}`;
  const usaBusquedaRemota =
    abierto && !disabled && idsPermitidos === null;
  const cargando = usaBusquedaRemota && claveResuelta !== claveSolicitud;
  const error =
    errorSolicitud?.clave === claveSolicitud
      ? errorSolicitud.mensaje
      : null;

  const seleccionado =
    (seleccionRecordada?.id === value ? seleccionRecordada : null) ??
    (seleccionadoInicial?.id === value ? seleccionadoInicial : null) ??
    usuariosPermitidos?.find((usuario) => usuario.id === value) ??
    datos?.items.find((usuario) => usuario.id === value) ??
    null;

  const opciones = useMemo(() => {
    const consulta = normalizarBusqueda(busqueda.trim());
    const candidatos = new Map<number, UsuarioAsignable>();

    for (const usuario of usuariosPermitidos ?? []) {
      candidatos.set(usuario.id, usuario);
    }
    for (const usuario of datos?.items ?? []) {
      if (idsPermitidos === null || idsPermitidos.has(usuario.id)) {
        candidatos.set(usuario.id, usuario);
      }
    }
    if (
      seleccionado &&
      (idsPermitidos === null || idsPermitidos.has(seleccionado.id))
    ) {
      candidatos.set(seleccionado.id, seleccionado);
    }

    const encontrados = [...candidatos.values()].filter((usuario) =>
      consulta
        ? normalizarBusqueda(
            `${usuario.nombre} ${usuario.nombreLogin ?? ""} ${usuario.rol ?? ""}`,
          ).includes(consulta)
        : true,
    );
    return consulta ? encontrados : [null, ...encontrados];
  }, [busqueda, datos, idsPermitidos, seleccionado, usuariosPermitidos]);

  useEffect(() => {
    if (!abierto) return;
    const temporizador = window.setTimeout(() => {
      setBusquedaAplicada(busqueda.trim());
      setPagina(1);
    }, ESPERA_BUSQUEDA_MS);
    return () => window.clearTimeout(temporizador);
  }, [abierto, busqueda]);

  useEffect(() => {
    // Locales ya conoce el único repositor permitido por su zona. El acceso
    // remoto se reserva para conjuntos abiertos, como el selector del Mapa.
    if (!abierto || disabled || idsPermitidos !== null) return;
    const controlador = new AbortController();
    let vigente = true;
    buscarUsuariosAsignables({
      buscar: busquedaAplicada,
      page: pagina,
      limit: LIMITE_PAGINA,
      signal: controlador.signal,
    })
      .then((respuesta) => {
        if (vigente) {
          setDatos(respuesta);
          setErrorSolicitud(null);
          setClaveResuelta(claveSolicitud);
        }
      })
      .catch(() => {
        if (vigente && !controlador.signal.aborted) {
          setErrorSolicitud({
            clave: claveSolicitud,
            mensaje: "No pudimos buscar los repositores.",
          });
          setClaveResuelta(claveSolicitud);
        }
      });

    return () => {
      vigente = false;
      controlador.abort();
    };
  }, [
    abierto,
    busquedaAplicada,
    claveSolicitud,
    disabled,
    idsPermitidos,
    pagina,
  ]);

  useEffect(() => {
    if (!abierto) return;
    function cerrarAlClickearFuera(evento: MouseEvent | TouchEvent) {
      if (!contenedorRef.current?.contains(evento.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", cerrarAlClickearFuera);
    document.addEventListener("touchstart", cerrarAlClickearFuera);
    return () => {
      document.removeEventListener("mousedown", cerrarAlClickearFuera);
      document.removeEventListener("touchstart", cerrarAlClickearFuera);
    };
  }, [abierto]);

  const indiceVisible = Math.min(
    indiceActivo,
    Math.max(0, opciones.length - 1),
  );

  useEffect(() => {
    if (!abierto) return;
    listaRef.current
      ?.querySelector(`[data-indice="${indiceVisible}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [abierto, indiceVisible]);

  function abrir() {
    setBusqueda("");
    setBusquedaAplicada("");
    setPagina(1);
    setIndiceActivo(0);
    setAbierto(true);
  }

  function elegir(usuario: UsuarioAsignable | null) {
    setSeleccionRecordada(usuario);
    onChange(usuario?.id ?? "");
    setAbierto(false);
  }

  function alTeclear(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setIndiceActivo((indice) =>
        Math.min(indice + 1, Math.max(0, opciones.length - 1)),
      );
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setIndiceActivo((indice) => Math.max(0, indice - 1));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      const opcion = opciones[indiceVisible];
      if (opcion !== undefined) elegir(opcion);
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      evento.stopPropagation();
      setAbierto(false);
    }
  }

  return (
    <div ref={contenedorRef} className="relative mt-1.5">
      <button
        type="button"
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={`${idBase}-lista`}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-control-line bg-surface-raised px-3 py-2.5 text-left text-sm text-foreground shadow-sm outline-none transition hover:border-brand-500 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/55 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {seleccionado?.nombre ??
              (disabled ? "Elegí primero una zona" : "Sin repositor")}
          </span>
          {seleccionado && (seleccionado.nombreLogin || seleccionado.rol) && (
            <span className="block truncate text-xs text-zinc-400">
              {seleccionado.nombreLogin
                ? `@${seleccionado.nombreLogin}`
                : seleccionado.rol}
              {seleccionado.nombreLogin && seleccionado.rol
                ? ` · ${seleccionado.rol}`
                : ""}
            </span>
          )}
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${abierto ? "rotate-180" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {abierto && (
        <div className="mt-1.5 overflow-hidden rounded-xl border border-line bg-surface-raised shadow-[0_18px_50px_rgba(var(--warm-shadow),0.16)]">
          <input
            type="search"
            value={busqueda}
            onChange={(evento) => {
              setBusqueda(evento.target.value);
              setIndiceActivo(0);
            }}
            onKeyDown={alTeclear}
            placeholder="Buscar por nombre, usuario o rol..."
            aria-label="Buscar repositor"
            aria-controls={`${idBase}-lista`}
            aria-activedescendant={`${idBase}-opcion-${indiceVisible}`}
            autoFocus
            className="w-full border-b border-control-line bg-surface-raised px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:ring-2 focus:ring-inset focus:ring-brand-600/55"
          />
          <ul
            ref={listaRef}
            id={`${idBase}-lista`}
            role="listbox"
            className="max-h-52 overflow-y-auto py-1"
          >
            {opciones.map((usuario, indice) => {
              const seleccionadoAhora = usuario?.id === value;
              return (
                <li
                  key={usuario?.id ?? "sin-repositor"}
                  id={`${idBase}-opcion-${indice}`}
                  data-indice={indice}
                  role="option"
                  aria-selected={seleccionadoAhora}
                  onMouseDown={(evento) => evento.preventDefault()}
                  onMouseEnter={() => setIndiceActivo(indice)}
                  onClick={() => elegir(usuario)}
                  className={`flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm transition ${
                    indice === indiceVisible
                      ? "bg-brand-50 text-brand-900 dark:bg-brand-950 dark:text-brand-100"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  } ${seleccionadoAhora ? "font-semibold" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      {usuario?.nombre ?? "Sin repositor"}
                    </span>
                    {usuario?.nombreLogin && (
                      <span className="block truncate text-xs font-normal text-zinc-400">
                        @{usuario.nombreLogin}
                      </span>
                    )}
                  </span>
                  {usuario?.rol && (
                    <span className="shrink-0 text-xs font-normal text-zinc-400">
                      {usuario.rol}
                    </span>
                  )}
                </li>
              );
            })}
            {opciones.length === 0 && (
              <li className="px-3 py-4 text-sm text-zinc-400">
                {cargando
                  ? "Buscando repositores..."
                  : "No se encontró ningún repositor."}
              </li>
            )}
          </ul>
          {error ? (
            <div className="flex min-h-11 items-center justify-between gap-3 border-t border-control-line px-3 py-2 text-xs text-red-600 dark:text-red-400">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setReintento((actual) => actual + 1)}
                className="min-h-11 shrink-0 rounded-lg px-3 font-semibold transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500/50 dark:hover:bg-red-950"
              >
                Reintentar
              </button>
            </div>
          ) : null}
          {idsPermitidos === null && datos && datos.totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 border-t border-control-line px-2 py-1.5 text-xs text-muted">
              <button
                type="button"
                onClick={() => {
                  setIndiceActivo(0);
                  setPagina((actual) => Math.max(1, actual - 1));
                }}
                disabled={pagina <= 1 || cargando}
                className="min-h-11 rounded-lg px-3 font-medium text-foreground transition hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span aria-live="polite">
                {cargando
                  ? "Buscando…"
                  : `${datos.page} / ${datos.totalPages}`}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIndiceActivo(0);
                  setPagina((actual) =>
                    Math.min(datos.totalPages, actual + 1),
                  );
                }}
                disabled={pagina >= datos.totalPages || cargando}
                className="min-h-11 rounded-lg px-3 font-medium text-foreground transition hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
