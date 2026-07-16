"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { PantallaCarga } from "@/components/pantalla-carga";
import { Paginacion } from "@/components/paginacion";
import { ApiError, apiFetch } from "@/lib/api";
import type { RespuestaPaginada } from "@/types/paginacion";
import type { ClienteRepositor, LocalRepositor } from "@/types/repositor";
import { formatoFechaHora } from "@/utils/fechas";

const LIMITE_INICIAL = 7;

type PestanaCartera = "CLIENTES" | "LOCALES";

function IconoUbicacion() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden
    >
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1116 0z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function RepositorClientesView() {
  const [pestana, setPestana] = useState<PestanaCartera>("CLIENTES");
  const [clientes, setClientes] =
    useState<RespuestaPaginada<ClienteRepositor> | null>(null);
  const [locales, setLocales] =
    useState<RespuestaPaginada<LocalRepositor> | null>(null);
  const [filtroCliente, setFiltroCliente] = useState<Pick<
    ClienteRepositor,
    "id" | "nombre"
  > | null>(null);
  const [totalLocalesAsignados, setTotalLocalesAsignados] = useState(0);
  const [paginaClientes, setPaginaClientes] = useState(1);
  const [paginaLocales, setPaginaLocales] = useState(1);
  const [limiteClientes, setLimiteClientes] = useState(LIMITE_INICIAL);
  const [limiteLocales, setLimiteLocales] = useState(LIMITE_INICIAL);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [cargandoLocales, setCargandoLocales] = useState(true);
  const [errorClientes, setErrorClientes] = useState<string | null>(null);
  const [errorLocales, setErrorLocales] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    apiFetch<RespuestaPaginada<ClienteRepositor>>(
      `/repositor/clientes?page=${paginaClientes}&limit=${limiteClientes}`,
    )
      .then((respuesta) => {
        if (!vigente) return;
        setClientes(respuesta);
        setErrorClientes(null);
      })
      .catch((error: unknown) => {
        if (!vigente) return;
        setErrorClientes(
          error instanceof ApiError
            ? error.message
            : "No pudimos cargar tus clientes",
        );
      })
      .finally(() => {
        if (vigente) setCargandoClientes(false);
      });
    return () => {
      vigente = false;
    };
  }, [limiteClientes, paginaClientes]);

  useEffect(() => {
    let vigente = true;
    const filtro =
      filtroCliente === null ? "" : `&clienteId=${filtroCliente.id}`;
    apiFetch<RespuestaPaginada<LocalRepositor>>(
      `/repositor/locales?page=${paginaLocales}&limit=${limiteLocales}${filtro}`,
    )
      .then((respuesta) => {
        if (!vigente) return;
        setLocales(respuesta);
        if (filtroCliente === null) setTotalLocalesAsignados(respuesta.total);
        setErrorLocales(null);
      })
      .catch((error: unknown) => {
        if (!vigente) return;
        setErrorLocales(
          error instanceof ApiError
            ? error.message
            : "No pudimos cargar tus locales",
        );
      })
      .finally(() => {
        if (vigente) setCargandoLocales(false);
      });
    return () => {
      vigente = false;
    };
  }, [filtroCliente, limiteLocales, paginaLocales]);

  function verLocalesDe(cliente: ClienteRepositor) {
    setCargandoLocales(true);
    setFiltroCliente({ id: cliente.id, nombre: cliente.nombre });
    setPaginaLocales(1);
    setPestana("LOCALES");
  }

  function verTodosLosLocales() {
    if (filtroCliente === null) return;
    setCargandoLocales(true);
    setFiltroCliente(null);
    setPaginaLocales(1);
  }

  function cambiarPaginaClientes(pagina: number) {
    setCargandoClientes(true);
    setPaginaClientes(pagina);
  }

  function cambiarLimiteClientes(limite: number) {
    setCargandoClientes(true);
    setLimiteClientes(limite);
    setPaginaClientes(1);
  }

  function cambiarPaginaLocales(pagina: number) {
    setCargandoLocales(true);
    setPaginaLocales(pagina);
  }

  function cambiarLimiteLocales(limite: number) {
    setCargandoLocales(true);
    setLimiteLocales(limite);
    setPaginaLocales(1);
  }

  const cargaActiva = cargandoClientes
    ? {
        mensaje: "Cargando clientes",
        detalle: "Actualizamos la cartera asignada a tu usuario.",
      }
    : cargandoLocales
      ? {
          mensaje: "Cargando locales",
          detalle: "Actualizamos las direcciones y próximas visitas.",
        }
      : null;

  return (
    <div className="space-y-4 sm:space-y-6" aria-busy={cargaActiva !== null}>
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-950 via-brand-800 to-emerald-600 p-4 text-white shadow-lg shadow-emerald-950/15 sm:p-5">
        <div className="absolute -right-14 -top-16 h-44 w-44 rounded-full border border-white/15 bg-white/5" />
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200 sm:text-[11px]">
            Mi cartera
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
            Mis clientes
          </h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-emerald-50/85 sm:text-sm">
            Consultá por separado los clientes y locales asignados a tu
            recorrido.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/15 px-2.5 py-1 text-xs backdrop-blur">
            <IconoUbicacion /> {totalLocalesAsignados}{" "}
            {totalLocalesAsignados === 1
              ? "local asignado"
              : "locales asignados"}
          </div>
        </motion.div>
      </section>

      <div
        className="flex w-fit max-w-full items-center gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900"
        role="tablist"
        aria-label="Contenido de mi cartera"
      >
        {(["CLIENTES", "LOCALES"] as const).map((opcion) => {
          const activa = pestana === opcion;
          const cantidad =
            opcion === "CLIENTES"
              ? (clientes?.total ?? 0)
              : totalLocalesAsignados;
          return (
            <button
              key={opcion}
              id={`pestana-${opcion.toLowerCase()}`}
              type="button"
              role="tab"
              aria-selected={activa}
              aria-controls={`panel-${opcion.toLowerCase()}`}
              onClick={() => setPestana(opcion)}
              className={`min-h-11 rounded-lg px-2.5 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-brand-600/40 sm:min-h-9 sm:px-3 sm:text-sm ${
                activa
                  ? "bg-white text-brand-800 shadow-sm dark:bg-zinc-800 dark:text-brand-300"
                  : "text-zinc-500 hover:bg-white/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-white"
              }`}
            >
              {opcion === "CLIENTES" ? "Clientes" : "Locales"}
              <span className="ml-1.5 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-600 sm:text-xs dark:bg-zinc-700 dark:text-zinc-300">
                {cantidad}
              </span>
            </button>
          );
        })}
      </div>

      {pestana === "CLIENTES" ? (
        <section
          id="panel-clientes"
          role="tabpanel"
          aria-labelledby="pestana-clientes"
        >
          <div className="mb-3">
            <h2 className="text-lg font-bold tracking-tight">
              Clientes asignados
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Abrí sus locales o consultá cantidades y próximas visitas.
            </p>
          </div>

          {errorClientes ? (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {errorClientes}
            </p>
          ) : clientes === null ? (
            <div className="h-44 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800" />
          ) : clientes.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              Todavía no tenés clientes asignados.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <table
                  className="w-full min-w-[760px] text-left text-sm"
                  aria-label="Clientes asignados"
                >
                  <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/60 dark:text-zinc-400">
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th scope="col" className="px-4 py-3 font-medium">
                        Cliente
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Locales
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Tareas activas
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Próxima visita
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right font-medium"
                      >
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.items.map((cliente) => (
                      <tr
                        key={cliente.id}
                        className="border-b border-zinc-100 transition hover:bg-brand-50/60 dark:border-zinc-800/70 dark:hover:bg-brand-950/20"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-100 font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                              {cliente.nombre.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {cliente.nombre}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {cliente.localesAsignados}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {cliente.tareasActivas}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                          {formatoFechaHora(cliente.proximaVisita)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => verLocalesDe(cliente)}
                            className="min-h-11 rounded-xl border border-brand-200 px-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:border-brand-900 dark:text-brand-300 dark:hover:bg-brand-950"
                          >
                            Ver locales
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginacion
                page={clientes.page}
                totalPages={clientes.totalPages}
                total={clientes.total}
                limit={clientes.limit}
                onPageChange={cambiarPaginaClientes}
                onLimitChange={cambiarLimiteClientes}
              />
            </>
          )}
        </section>
      ) : (
        <section
          id="panel-locales"
          role="tabpanel"
          aria-labelledby="pestana-locales"
        >
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Locales asignados
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Direcciones, agenda y checklist de tu asignación.
              </p>
            </div>
            {filtroCliente !== null ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-brand-100 px-3 py-1.5 text-sm font-medium text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                  Cliente: {filtroCliente.nombre}
                </span>
                <button
                  type="button"
                  onClick={verTodosLosLocales}
                  className="min-h-11 rounded-xl border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Ver todos
                </button>
              </div>
            ) : null}
          </div>

          {errorLocales ? (
            <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {errorLocales}
            </p>
          ) : locales === null ? (
            <div className="h-44 animate-pulse rounded-2xl bg-zinc-200/70 dark:bg-zinc-800" />
          ) : locales.items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
              No hay locales para el filtro seleccionado.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <table
                  className="w-full min-w-[820px] text-left text-sm"
                  aria-label="Locales asignados"
                >
                  <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-950/60 dark:text-zinc-400">
                    <tr className="border-b border-zinc-200 dark:border-zinc-800">
                      <th scope="col" className="px-4 py-3 font-medium">
                        Local
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Cliente
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Zona
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Tareas activas
                      </th>
                      <th scope="col" className="px-4 py-3 font-medium">
                        Próxima visita
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {locales.items.map((local) => (
                      <tr
                        key={local.id}
                        className="border-b border-zinc-100 transition hover:bg-sky-50/60 dark:border-zinc-800/70 dark:hover:bg-sky-950/20"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                              <IconoUbicacion />
                            </span>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {local.nombre}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {local.cliente.nombre}
                        </td>
                        <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                          {local.zona?.nombre ?? "Sin zona"}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {local.tareasActivas}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                          {formatoFechaHora(local.fechaVisita)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginacion
                page={locales.page}
                totalPages={locales.totalPages}
                total={locales.total}
                limit={locales.limit}
                onPageChange={cambiarPaginaLocales}
                onLimitChange={cambiarLimiteLocales}
              />
            </>
          )}
        </section>
      )}

      <PantallaCarga
        visible={cargaActiva !== null}
        mensaje={cargaActiva?.mensaje ?? "Cargando cartera"}
        detalle={cargaActiva?.detalle}
      />
    </div>
  );
}
