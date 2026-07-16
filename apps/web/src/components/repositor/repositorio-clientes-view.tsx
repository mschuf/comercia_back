"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { Paginacion } from "@/components/paginacion";
import { ApiError, apiFetch } from "@/lib/api";
import type { RespuestaPaginada } from "@/types/paginacion";
import type { ClienteRepositor, LocalRepositor } from "@/types/repositor";
import { formatoFechaHora } from "@/utils/fechas";

const LIMITE = 7;

function IconoUbicacion() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1116 0z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function RepositorClientesView() {
  const [clientes, setClientes] = useState<RespuestaPaginada<ClienteRepositor> | null>(null);
  const [locales, setLocales] = useState<RespuestaPaginada<LocalRepositor> | null>(null);
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [paginaClientes, setPaginaClientes] = useState(1);
  const [paginaLocales, setPaginaLocales] = useState(1);
  const [limiteClientes, setLimiteClientes] = useState(LIMITE);
  const [limiteLocales, setLimiteLocales] = useState(LIMITE);
  const [errorClientes, setErrorClientes] = useState<string | null>(null);
  const [errorLocales, setErrorLocales] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    apiFetch<RespuestaPaginada<ClienteRepositor>>(
      `/repositor/clientes?page=${paginaClientes}&limit=${limiteClientes}`,
    )
      .then((respuesta) => {
        if (vigente) {
          setClientes(respuesta);
          setErrorClientes(null);
        }
      })
      .catch((error) => {
        if (vigente) setErrorClientes(error instanceof ApiError ? error.message : "No pudimos cargar tus clientes");
      });
    return () => { vigente = false; };
  }, [limiteClientes, paginaClientes]);

  useEffect(() => {
    let vigente = true;
    const filtro = clienteId === null ? "" : `&clienteId=${clienteId}`;
    apiFetch<RespuestaPaginada<LocalRepositor>>(
      `/repositor/locales?page=${paginaLocales}&limit=${limiteLocales}${filtro}`,
    )
      .then((respuesta) => {
        if (vigente) {
          setLocales(respuesta);
          setErrorLocales(null);
        }
      })
      .catch((error) => {
        if (vigente) setErrorLocales(error instanceof ApiError ? error.message : "No pudimos cargar tus locales");
      });
    return () => { vigente = false; };
  }, [clienteId, limiteLocales, paginaLocales]);

  function elegirCliente(id: number | null) {
    setClienteId(id);
    setPaginaLocales(1);
  }

  const cantidadLocales = locales?.total ?? 0;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-brand-800 to-emerald-600 p-5 text-white shadow-xl shadow-emerald-950/15 sm:p-7">
        <div className="absolute -right-14 -top-16 h-44 w-44 rounded-full border border-white/15 bg-white/5" />
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">Mi cartera</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Mis clientes</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-emerald-50/85 sm:text-base">
            Solo ves los clientes y locales que están asignados a tu recorrido.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/15 px-3 py-1.5 text-sm backdrop-blur">
            <IconoUbicacion /> {cantidadLocales} {cantidadLocales === 1 ? "local asignado" : "locales asignados"}
          </div>
        </motion.div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Clientes asignados</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Elegí uno para filtrar sus locales.</p>
          </div>
          {clienteId !== null && (
            <button type="button" onClick={() => elegirCliente(null)} className="min-h-11 rounded-full border border-zinc-300 px-4 text-sm font-medium dark:border-zinc-700">
              Ver todos
            </button>
          )}
        </div>
        {errorClientes ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{errorClientes}</p>
        ) : clientes === null ? (
          <div className="h-28 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800" />
        ) : clientes.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">Todavía no tenés clientes asignados.</div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {clientes.items.map((cliente, indice) => (
                <motion.button
                  key={cliente.id}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: indice * 0.05 }}
                  whileHover={{ y: -3 }}
                  onClick={() => elegirCliente(cliente.id)}
                  className={`min-h-32 rounded-2xl border p-4 text-left shadow-sm transition ${clienteId === cliente.id ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20 dark:bg-brand-950/40" : "border-zinc-200 bg-white hover:border-brand-300 dark:border-zinc-800 dark:bg-zinc-900"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-300">{cliente.nombre.slice(0, 1).toUpperCase()}</div>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{cliente.localesAsignados} locales</span>
                  </div>
                  <h3 className="mt-3 truncate font-bold text-zinc-900 dark:text-white">{cliente.nombre}</h3>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{cliente.tareasActivas} tareas · Próxima: {formatoFechaHora(cliente.proximaVisita)}</p>
                </motion.button>
              ))}
            </div>
            <Paginacion page={clientes.page} totalPages={clientes.totalPages} total={clientes.total} limit={clientes.limit} onPageChange={setPaginaClientes} onLimitChange={(valor) => { setLimiteClientes(valor); setPaginaClientes(1); }} />
          </>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold tracking-tight">Locales</h2>
        <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">Direcciones, agenda y checklist de tu asignación.</p>
        {errorLocales ? (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{errorLocales}</p>
        ) : locales === null ? (
          <div className="h-40 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800" />
        ) : locales.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">Este cliente todavía no tiene locales asignados a tu usuario.</div>
        ) : (
          <>
            <div className="grid gap-3 lg:grid-cols-2">
              {locales.items.map((local, indice) => (
                <motion.article key={local.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: indice * 0.04 }} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"><IconoUbicacion /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">{local.cliente.nombre}</p>
                      <h3 className="truncate text-base font-bold">{local.nombre}</h3>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{local.zona?.nombre ?? "Sin zona"} · {local.tareasActivas} tareas</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800/70 dark:text-zinc-300">Próxima visita: <strong>{formatoFechaHora(local.fechaVisita)}</strong></div>
                </motion.article>
              ))}
            </div>
            <Paginacion page={locales.page} totalPages={locales.totalPages} total={locales.total} limit={locales.limit} onPageChange={setPaginaLocales} onLimitChange={(valor) => { setLimiteLocales(valor); setPaginaLocales(1); }} />
          </>
        )}
      </section>
    </div>
  );
}
