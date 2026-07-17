"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Paginacion } from "@/components/paginacion";
import { ApiError, apiFetch } from "@/lib/api";
import type { RespuestaPaginada } from "@/types/paginacion";
import type { TareasLocalRepositor } from "@/types/repositor";

export function RepositorTareasView() {
  const [respuesta, setRespuesta] = useState<RespuestaPaginada<TareasLocalRepositor> | null>(null);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(7);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    apiFetch<RespuestaPaginada<TareasLocalRepositor>>(`/repositor/tareas?page=${pagina}&limit=${limite}`)
      .then((datos) => {
        if (vigente) {
          setRespuesta(datos);
          setError(null);
        }
      })
      .catch((problema) => {
        if (vigente) setError(problema instanceof ApiError ? problema.message : "No pudimos cargar tus tareas");
      });
    return () => { vigente = false; };
  }, [limite, pagina]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-violet-800 to-fuchsia-600 p-4 text-white shadow-lg shadow-violet-950/15 sm:p-5">
        <div className="absolute right-5 top-4 h-20 w-20 rounded-full border-[14px] border-white/10" />
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-200 sm:text-[11px]">Checklist operativo</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Mis tareas</h1>
          <p className="mt-1 max-w-xl text-xs text-violet-100 sm:text-sm">Cada checklist está agrupado por cliente y local. Al iniciar una visita vas a poder completarlo y adjuntar fotos.</p>
        </motion.div>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{error}</p>
      ) : respuesta === null ? (
        <div className="space-y-3">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />)}</div>
      ) : respuesta.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface-raised p-10 text-center text-sm text-muted">No hay tareas porque todavía no tenés locales asignados.</div>
      ) : (
        <>
          <div className="space-y-3">
            {respuesta.items.map((grupo, indice) => {
              const expandido = abierto === grupo.local.id;
              const total = grupo.tareas.length;
              const progreso = total === 0 ? 100 : Math.round(grupo.completadasEnVisita / total * 100);
              return (
                <motion.article key={grupo.local.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: indice * 0.05 }} className="overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-[0_10px_30px_rgba(var(--warm-shadow),0.05)]">
                  <button type="button" onClick={() => setAbierto(expandido ? null : grupo.local.id)} aria-expanded={expandido} className="flex min-h-24 w-full items-center gap-4 p-4 text-left sm:p-5">
                    <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-violet-100 font-bold text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                      {total}
                      {grupo.visitaAbiertaId !== null && <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-emerald-500 ring-4 ring-white dark:ring-zinc-900" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-400">{grupo.local.cliente.nombre}</p>
                      <h2 className="truncate font-bold text-zinc-900 dark:text-white">{grupo.local.nombre}</h2>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"><motion.div initial={{ width: 0 }} animate={{ width: `${progreso}%` }} className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500" /></div>
                    </div>
                    <svg viewBox="0 0 20 20" fill="currentColor" className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${expandido ? "rotate-180" : ""}`} aria-hidden><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
                  </button>
                  <AnimatePresence initial={false}>
                    {expandido && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <ul className="space-y-2 border-t border-zinc-100 p-4 dark:border-zinc-800 sm:p-5">
                          {grupo.tareas.length === 0 ? <li className="text-sm text-zinc-500">Este cliente no tiene tareas activas.</li> : grupo.tareas.map((tarea, posicion) => (
                            <motion.li key={tarea.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: posicion * 0.035 }} className="flex gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800">
                              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-violet-300 text-xs font-bold text-violet-700 dark:border-violet-700 dark:text-violet-300">{posicion + 1}</span>
                              <div><p className="text-sm font-semibold">{tarea.titulo}</p><p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{tarea.descripcion || "Sin instrucciones adicionales"}{tarea.requiereFoto ? " · Requiere foto" : ""}</p></div>
                            </motion.li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.article>
              );
            })}
          </div>
          <Paginacion page={respuesta.page} totalPages={respuesta.totalPages} total={respuesta.total} limit={respuesta.limit} onPageChange={setPagina} onLimitChange={(valor) => { setLimite(valor); setPagina(1); }} />
        </>
      )}
    </div>
  );
}
