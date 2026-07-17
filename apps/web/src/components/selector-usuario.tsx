"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { UsuarioAsignable } from "@/types/local";
import { normalizarBusqueda } from "@/utils/texto";

interface SelectorUsuarioProps {
  usuarios: UsuarioAsignable[];
  value: number | "";
  onChange: (usuarioId: number | "") => void;
}

export function SelectorUsuario({
  usuarios,
  value,
  onChange,
}: SelectorUsuarioProps) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [indiceActivo, setIndiceActivo] = useState(0);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);
  const idBase = useId();
  const seleccionado = usuarios.find((usuario) => usuario.id === value) ?? null;

  const opciones = useMemo(() => {
    const consulta = normalizarBusqueda(busqueda.trim());
    const encontrados = consulta
      ? usuarios.filter((usuario) =>
          normalizarBusqueda(
            `${usuario.nombre} ${usuario.nombreLogin ?? ""} ${usuario.rol ?? ""}`,
          ).includes(consulta),
        )
      : usuarios;
    return consulta ? encontrados : [null, ...encontrados];
  }, [busqueda, usuarios]);

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

  useEffect(() => {
    if (!abierto) return;
    listaRef.current
      ?.querySelector(`[data-indice="${indiceActivo}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [abierto, indiceActivo]);

  function abrir() {
    setBusqueda("");
    setIndiceActivo(0);
    setAbierto(true);
  }

  function elegir(usuario: UsuarioAsignable | null) {
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
      const opcion = opciones[indiceActivo];
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
        aria-haspopup="listbox"
        aria-expanded={abierto}
        aria-controls={`${idBase}-lista`}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-control-line bg-surface-raised px-3 py-2.5 text-left text-sm text-foreground shadow-sm outline-none transition hover:border-brand-500 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/55"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">
            {seleccionado?.nombre ?? "Sin repositor"}
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
            aria-activedescendant={`${idBase}-opcion-${indiceActivo}`}
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
                    indice === indiceActivo
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
                No se encontró ningún usuario.
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
