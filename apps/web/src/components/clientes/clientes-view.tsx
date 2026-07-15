"use client";

import { useCallback, useEffect, useState } from "react";
import { IconoMas } from "@/components/icono-mas";
import { Modal } from "@/components/modal";
import { Paginacion } from "@/components/paginacion";
import {
  btnGhost,
  btnPrimary,
  errorBox,
  inputBase,
  labelBase,
} from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api";
import type { Cliente } from "@/types/cliente";
import type { ConfigImpulsador } from "@/types/impulsador-config";
import type { RespuestaPaginada } from "@/types/paginacion";
import { formatoFechaHora } from "@/utils/fechas";

interface FormCliente {
  nombre: string;
  activo: boolean;
}

interface ClientesViewProps {
  onVerLocales: (cliente: Pick<Cliente, "id" | "nombre">) => void;
}

const INICIAL: FormCliente = { nombre: "", activo: true };

function EstadoCliente({ activo }: { activo: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        activo
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
      }`}
    >
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

export function ClientesView({ onVerLocales }: ClientesViewProps) {
  const [datos, setDatos] = useState<RespuestaPaginada<Cliente> | null>(null);
  const [config, setConfig] = useState<ConfigImpulsador | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(7);
  const [editando, setEditando] = useState<Cliente | "nuevo" | null>(null);
  const [eliminando, setEliminando] = useState<Cliente | null>(null);
  const [form, setForm] = useState<FormCliente>(INICIAL);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const cargar = useCallback(() => {
    return apiFetch<RespuestaPaginada<Cliente>>(
      `/clientes?page=${page}&limit=${limit}`,
    )
      .then((respuesta) => {
        setDatos(respuesta);
        setErrorLista(null);
      })
      .catch((e) =>
        setErrorLista(
          e instanceof ApiError
            ? e.message
            : "No se pudieron cargar los clientes",
        ),
      );
  }, [page, limit]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    apiFetch<ConfigImpulsador>("/impulsador/config")
      .then(setConfig)
      .catch(() => undefined);
  }, []);

  function abrir(cliente: Cliente | "nuevo") {
    setForm(
      cliente === "nuevo"
        ? INICIAL
        : { nombre: cliente.nombre, activo: cliente.activo },
    );
    setErrorForm(null);
    setEditando(cliente);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (editando === null) return;
    setGuardando(true);
    setErrorForm(null);
    try {
      await apiFetch(
        editando === "nuevo" ? "/clientes" : `/clientes/${editando.id}`,
        {
          method: editando === "nuevo" ? "POST" : "PATCH",
          body: JSON.stringify({
            nombre: form.nombre.trim(),
            ...(editando === "nuevo" ? {} : { activo: form.activo }),
          }),
        },
      );
      setEditando(null);
      await cargar();
    } catch (e) {
      setErrorForm(
        e instanceof ApiError ? e.message : "No se pudo guardar el cliente",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    if (!eliminando || borrando || eliminando.localesCount > 0) return;
    setBorrando(true);
    setErrorEliminar(null);
    try {
      await apiFetch(`/clientes/${eliminando.id}`, { method: "DELETE" });
      setEliminando(null);
      if (datos?.items.length === 1 && page > 1) {
        setPage((actual) => actual - 1);
      } else {
        await cargar();
      }
    } catch (e) {
      setErrorEliminar(
        e instanceof ApiError ? e.message : "No se pudo eliminar el cliente",
      );
    } finally {
      setBorrando(false);
    }
  }

  const esGestor = config?.esGestor === true;
  const clientes = datos?.items ?? [];

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Listado de clientes</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Administrá clientes y abrí sus locales sin salir de esta sección.
          </p>
        </div>
        {esGestor && (
          <button
            type="button"
            onClick={() => abrir("nuevo")}
            aria-label="Crear cliente"
            title="Crear cliente"
            className={`${btnPrimary} h-11 w-11 shrink-0 p-0`}
          >
            <IconoMas className="h-5 w-5" />
          </button>
        )}
      </div>

      {errorLista && <p className={`${errorBox} mt-4`}>{errorLista}</p>}

      {clientes.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Todavía no hay clientes para mostrar.
          </p>
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-950/60">
              <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 text-center font-medium">Locales</th>
                <th className="px-4 py-3 font-medium">Actualizado</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr
                  key={cliente.id}
                  className="border-b border-zinc-100 transition last:border-0 hover:bg-zinc-50/80 dark:border-zinc-800/70 dark:hover:bg-zinc-800/40"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        {cliente.nombre.charAt(0).toUpperCase()}
                      </span>
                      <span className="max-w-64 font-semibold text-zinc-900 dark:text-zinc-100">
                        {cliente.nombre}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold [font-variant-numeric:tabular-nums]">
                    {cliente.localesCount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {formatoFechaHora(cliente.updatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <EstadoCliente activo={cliente.activo} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onVerLocales(cliente)}
                        className="inline-flex min-h-11 items-center rounded-lg bg-brand-50 px-3 text-xs font-semibold text-brand-700 transition hover:bg-brand-100 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
                      >
                        Ver locales
                      </button>
                      {esGestor && (
                        <>
                          <button
                            type="button"
                            onClick={() => abrir(cliente)}
                            aria-label={`Editar ${cliente.nombre}`}
                            className="grid h-11 w-11 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          >
                            <IconoEditar />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setErrorEliminar(null);
                              setEliminando(cliente);
                            }}
                            aria-label={`Eliminar ${cliente.nombre}`}
                            className="grid h-11 w-11 place-items-center rounded-lg text-zinc-500 transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-600/40 dark:text-zinc-400 dark:hover:bg-red-950 dark:hover:text-red-400"
                          >
                            <IconoEliminar />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {datos && datos.total > 0 && (
        <Paginacion
          page={datos.page}
          totalPages={datos.totalPages}
          total={datos.total}
          limit={datos.limit}
          onPageChange={setPage}
          onLimitChange={(nuevo) => {
            setLimit(nuevo);
            setPage(1);
          }}
        />
      )}

      <Modal
        titulo={editando === "nuevo" ? "Crear cliente" : "Editar cliente"}
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
      >
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <label className={labelBase}>
            Nombre
            <input
              value={form.nombre}
              onChange={(e) =>
                setForm((actual) => ({ ...actual, nombre: e.target.value }))
              }
              minLength={2}
              maxLength={120}
              required
              className={inputBase}
            />
          </label>
          {editando !== "nuevo" && (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    activo: e.target.checked,
                  }))
                }
                className="h-4 w-4 accent-brand-700"
              />
              Cliente activo
            </label>
          )}
          {errorForm && <p className={errorBox}>{errorForm}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditando(null)}
              className={btnGhost}
            >
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className={btnPrimary}>
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        titulo="Eliminar cliente"
        abierto={eliminando !== null}
        onCerrar={() => setEliminando(null)}
      >
        {eliminando && eliminando.localesCount > 0 ? (
          <>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              <span className="font-semibold">{eliminando.nombre}</span> tiene{" "}
              {eliminando.localesCount} locales. Eliminá primero esos locales
              para conservar su historial de visitas.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEliminando(null)}
                className={btnGhost}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const cliente = eliminando;
                  setEliminando(null);
                  onVerLocales(cliente);
                }}
                className={btnPrimary}
              >
                Ver sus locales
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              ¿Seguro que querés eliminar{" "}
              <span className="font-semibold">{eliminando?.nombre}</span>? Esta
              acción no se puede deshacer.
            </p>
            {errorEliminar && (
              <p className={`${errorBox} mt-3`}>{errorEliminar}</p>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setEliminando(null)}
                className={btnGhost}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmarEliminar()}
                disabled={borrando}
                className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-600/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {borrando ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function IconoEditar() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4.5 w-4.5"
      aria-hidden
    >
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  );
}

function IconoEliminar() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4.5 w-4.5"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}
