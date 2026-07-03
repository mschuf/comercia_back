"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CountryCode } from "libphonenumber-js";
import "flag-icons/css/flag-icons.min.css";

export interface PaisItem {
  codigo: CountryCode;
  nombre: string;
  prefijo: string;
}

// Combobox de país con búsqueda y banderas (los <select> nativos no permiten
// imágenes en las opciones ni filtrado, por eso es un componente propio).
export function SelectorPais({
  paises,
  value,
  onChange,
}: {
  paises: PaisItem[];
  value: CountryCode;
  onChange: (codigo: CountryCode) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [indiceActivo, setIndiceActivo] = useState(0);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  const seleccionado =
    paises.find((p) => p.codigo === value) ?? paises[0] ?? null;

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda);
    if (!q) {
      return paises;
    }
    return paises.filter(
      (p) =>
        normalizar(p.nombre).includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        `+${p.prefijo}`.includes(q) ||
        p.prefijo.includes(q),
    );
  }, [paises, busqueda]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!abierto) {
      return;
    }
    function alClickearFuera(e: MouseEvent | TouchEvent) {
      if (!contenedorRef.current?.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", alClickearFuera);
    document.addEventListener("touchstart", alClickearFuera);
    return () => {
      document.removeEventListener("mousedown", alClickearFuera);
      document.removeEventListener("touchstart", alClickearFuera);
    };
  }, [abierto]);

  // Mantener la opción activa a la vista al navegar con el teclado
  useEffect(() => {
    if (!abierto) {
      return;
    }
    listaRef.current
      ?.querySelector(`[data-indice="${indiceActivo}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [abierto, indiceActivo]);

  function abrir() {
    setBusqueda("");
    setIndiceActivo(0);
    setAbierto(true);
  }

  function elegir(codigo: CountryCode) {
    onChange(codigo);
    setAbierto(false);
  }

  function alTeclear(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceActivo((i) => Math.min(i + 1, filtrados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceActivo((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const p = filtrados[indiceActivo];
      if (p) {
        elegir(p.codigo);
      }
    } else if (e.key === "Escape") {
      setAbierto(false);
    }
  }

  return (
    <div ref={contenedorRef} className="relative">
      {/* Control: bandera + nombre, alineados con flex */}
      <button
        type="button"
        onClick={() => (abierto ? setAbierto(false) : abrir())}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        className="flex w-full items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-left text-[15px] text-zinc-900 shadow-sm outline-none transition hover:border-zinc-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500"
      >
        {seleccionado && (
          <>
            <span
              aria-hidden
              className={`fi fi-${seleccionado.codigo.toLowerCase()} shrink-0 rounded-[2px] text-[15px] leading-none shadow-sm`}
            />
            <span className="min-w-0 flex-1 truncate">
              {seleccionado.nombre}
              <span className="ml-1 text-zinc-400">+{seleccionado.prefijo}</span>
            </span>
          </>
        )}
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="currentColor"
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
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setIndiceActivo(0);
            }}
            onKeyDown={alTeclear}
            placeholder="Buscar país o prefijo..."
            autoFocus
            className="w-full border-b border-zinc-200 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-zinc-400 dark:border-zinc-700"
          />
          <ul ref={listaRef} role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtrados.map((p, i) => (
              <li
                key={p.codigo}
                data-indice={i}
                role="option"
                aria-selected={p.codigo === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(p.codigo)}
                onMouseEnter={() => setIndiceActivo(i)}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm ${
                  i === indiceActivo
                    ? "bg-brand-50 text-brand-900 dark:bg-brand-950 dark:text-brand-100"
                    : ""
                } ${p.codigo === value ? "font-semibold" : ""}`}
              >
                <span
                  aria-hidden
                  className={`fi fi-${p.codigo.toLowerCase()} shrink-0 rounded-[2px] text-[15px] leading-none shadow-sm`}
                />
                <span className="min-w-0 flex-1 truncate">{p.nombre}</span>
                <span className="shrink-0 text-xs text-zinc-400">
                  +{p.prefijo}
                </span>
              </li>
            ))}
            {filtrados.length === 0 && (
              <li className="px-3 py-3 text-sm text-zinc-400">
                Sin resultados para &quot;{busqueda}&quot;
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}
