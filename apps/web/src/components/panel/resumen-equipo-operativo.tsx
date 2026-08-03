"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import type { ResumenEquipoOperativo } from "@/types/equipo";

interface TarjetaResumen {
  clave: keyof ResumenEquipoOperativo;
  etiqueta: string;
  detalle: string;
  href: string;
  destacar?: boolean;
}

const TARJETAS: readonly TarjetaResumen[] = [
  {
    clave: "miembros",
    etiqueta: "Personas a cargo",
    detalle: "equipo asignado",
    href: "/panel/supervisor/equipo",
  },
  {
    clave: "visitasEnCurso",
    etiqueta: "En visita ahora",
    detalle: "recorridos abiertos",
    href: "/panel/supervisor/equipo",
  },
  {
    clave: "tareasPendientes",
    etiqueta: "Tareas por revisar",
    detalle: "checklists pendientes",
    href: "/panel/supervisor/tareas",
  },
  {
    clave: "novedadesSinLeer",
    etiqueta: "Novedades sin leer",
    detalle: "requieren atención",
    href: "/panel/supervisor/tareas",
    destacar: true,
  },
];

export function ResumenEquipoOperativo() {
  const [resumen, setResumen] = useState<ResumenEquipoOperativo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    apiFetch<ResumenEquipoOperativo>("/equipo/resumen")
      .then((respuesta) => {
        if (!vigente) return;
        setResumen(respuesta);
        setError(null);
      })
      .catch((problema) => {
        if (!vigente) return;
        setError(
          problema instanceof ApiError
            ? problema.message
            : "No pudimos cargar el panorama del equipo",
        );
      });

    return () => {
      vigente = false;
    };
  }, []);

  return (
    <section
      aria-labelledby="pulso-equipo-titulo"
      className="rounded-[1.4rem] border border-line bg-surface p-4 shadow-[0_14px_38px_rgba(var(--warm-shadow),0.06)] sm:p-5"
    >
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent-ink">
            Panorama operativo
          </p>
          <h2
            id="pulso-equipo-titulo"
            className="mt-1 text-lg font-extrabold tracking-[-0.025em] sm:text-xl"
          >
            Lo que necesita seguimiento
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Una vista directa de tu equipo, sus recorridos y pendientes actuales.
          </p>
        </div>
        <Link
          href="/panel/supervisor/equipo"
          className="inline-flex min-h-11 w-fit items-center whitespace-nowrap rounded-xl border border-control-line bg-surface-raised px-3.5 text-sm font-bold text-foreground transition-[background-color,border-color] duration-200 hover:border-brand-500 hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-focus"
        >
          Ver equipo
        </Link>
      </header>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-300 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          {error}
        </p>
      ) : resumen === null ? (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-hidden>
          {TARJETAS.map((tarjeta) => (
            <div
              key={tarjeta.clave}
              className="h-[7.25rem] rounded-xl bg-surface-soft"
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-live="polite">
          {TARJETAS.map((tarjeta) => (
            <Link
              key={tarjeta.clave}
              href={tarjeta.href}
              className={`min-w-0 rounded-xl border p-3 transition-[border-color,background-color] duration-200 hover:border-brand-500 focus-visible:ring-2 focus-visible:ring-focus ${
                tarjeta.destacar && resumen.novedadesSinLeer > 0
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-surface-raised hover:bg-surface-soft"
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                {tarjeta.etiqueta}
              </p>
              <p className="mt-1 text-2xl font-black tracking-[-0.04em] text-foreground sm:text-3xl">
                {resumen[tarjeta.clave]}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-muted">
                {tarjeta.detalle}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
