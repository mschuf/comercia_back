"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
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
import type { RespuestaPaginada } from "@/types/paginacion";
import type { TareaGlobal } from "@/types/tarea";
import {
  SeguimientoTareasView,
  type FiltrosSeguimientoTareas,
} from "@/components/equipo/seguimiento-tareas-view";

interface FormTarea {
  titulo: string;
  descripcion: string;
  requiereFoto: boolean;
  orden: number;
  activo: boolean;
}

const FORM_INICIAL: FormTarea = {
  titulo: "",
  descripcion: "",
  requiereFoto: false,
  orden: 0,
  activo: true,
};

export function TareasView({
  filtrosIniciales,
}: {
  filtrosIniciales?: FiltrosSeguimientoTareas;
}) {
  return filtrosIniciales ? (
    <SeguimientoTareasView filtros={filtrosIniciales} />
  ) : (
    <TareasAdministracionView />
  );
}

function TareasAdministracionView() {
  const [datos, setDatos] = useState<RespuestaPaginada<TareaGlobal> | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(7);
  const [editando, setEditando] = useState<TareaGlobal | "nueva" | null>(null);
  const [form, setForm] = useState<FormTarea>(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    apiFetch<RespuestaPaginada<TareaGlobal>>(
      `/tareas?page=${page}&limit=${limit}`,
    )
      .then((respuesta) => {
        setDatos(respuesta);
        setError(null);
      })
      .catch((e) =>
        setError(
          e instanceof ApiError
            ? e.message
            : "No se pudieron cargar las tareas",
        ),
      );
  }, [page, limit]);

  useEffect(() => cargar(), [cargar]);

  function abrir(tarea: TareaGlobal | "nueva") {
    setForm(
      tarea === "nueva"
        ? {
            ...FORM_INICIAL,
            orden: (datos?.items.at(-1)?.orden ?? -1) + 1,
          }
        : {
            titulo: tarea.titulo,
            descripcion: tarea.descripcion,
            requiereFoto: tarea.requiereFoto,
            orden: tarea.orden,
            activo: tarea.activo,
          },
    );
    setError(null);
    setEditando(tarea);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (editando === null) return;
    setGuardando(true);
    setError(null);
    try {
      await apiFetch(
        editando === "nueva" ? "/tareas" : `/tareas/${editando.id}`,
        {
          method: editando === "nueva" ? "POST" : "PATCH",
          body: JSON.stringify({
            titulo: form.titulo.trim(),
            descripcion: form.descripcion.trim(),
            requiereFoto: form.requiereFoto,
            orden: form.orden,
            ...(editando === "nueva" ? {} : { activo: form.activo }),
          }),
        },
      );
      setEditando(null);
      cargar();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo guardar la tarea",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Tareas</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            El mismo checklist se aplica a todos los clientes y sus locales. Al
            editar una tarea se actualizan las existentes y se crean
            automáticamente las que falten.
          </p>
        </div>
        <button
          type="button"
          onClick={() => abrir("nueva")}
          aria-label="Crear tarea"
          title="Crear tarea"
          className={`${btnPrimary} h-11 w-11 shrink-0 p-0`}
        >
          <IconoMas className="h-5 w-5" />
        </button>
      </div>

      {error && editando === null && (
        <p className={`${errorBox} mt-4`}>{error}</p>
      )}

      {datos && datos.items.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-surface-raised">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-soft text-xs font-semibold uppercase tracking-wide text-foreground">
                <th
                  scope="col"
                  className="w-20 px-4 py-3 text-center font-medium"
                >
                  Orden
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Tarea
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Foto
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Alcance
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody>
              {datos.items.map((tarea) => {
                const completa =
                  tarea.clientesAsignados === tarea.clientesEmpresa;
                return (
                  <tr
                    key={tarea.id}
                    className="border-b border-line bg-surface-raised align-top transition last:border-0 hover:bg-surface-soft"
                  >
                    <td className="px-4 py-3 text-center font-semibold text-brand-700 [font-variant-numeric:tabular-nums] dark:text-brand-300">
                      {tarea.orden}
                    </td>
                    <td className="max-w-md px-4 py-3">
                      <p
                        className={`font-semibold ${
                          tarea.activo
                            ? "text-zinc-900 dark:text-zinc-100"
                            : "text-zinc-400 line-through dark:text-zinc-500"
                        }`}
                      >
                        {tarea.titulo}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                        {tarea.descripcion}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          tarea.activo
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                      >
                        {tarea.activo ? "Activa" : "Inactiva"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {tarea.requiereFoto ? "Requerida" : "No"}
                    </td>
                    <td
                      className={`px-4 py-3 text-xs ${
                        completa
                          ? "text-zinc-500 dark:text-zinc-400"
                          : "font-medium text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      <span className="block whitespace-nowrap">
                        {tarea.clientesAsignados}/{tarea.clientesEmpresa}{" "}
                        clientes
                      </span>
                      <span className="mt-0.5 block whitespace-nowrap">
                        {tarea.localesEmpresa} locales
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => abrir(tarea)}
                        className={`${btnGhost} min-h-11 whitespace-nowrap`}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {datos && datos.items.length === 0 && (
        <p className="mt-5 rounded-xl border border-dashed border-line bg-surface-raised px-4 py-10 text-center text-sm text-muted">
          Todavía no hay tareas.
        </p>
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
        titulo={editando === "nueva" ? "Nueva tarea" : "Editar tarea"}
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
      >
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <label className={labelBase}>
            Título
            <input
              type="text"
              value={form.titulo}
              onChange={(e) =>
                setForm((actual) => ({
                  ...actual,
                  titulo: e.target.value,
                }))
              }
              minLength={2}
              maxLength={120}
              required
              className={inputBase}
            />
          </label>
          <label className={labelBase}>
            Descripción / instrucciones
            <textarea
              value={form.descripcion}
              onChange={(e) =>
                setForm((actual) => ({
                  ...actual,
                  descripcion: e.target.value,
                }))
              }
              minLength={2}
              maxLength={300}
              rows={4}
              required
              className={inputBase}
            />
          </label>
          <label className={labelBase}>
            Orden
            <input
              type="number"
              value={form.orden}
              min={0}
              required
              onChange={(e) =>
                setForm((actual) => ({
                  ...actual,
                  orden: Number(e.target.value),
                }))
              }
              className={inputBase}
            />
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={form.requiereFoto}
              onChange={(e) =>
                setForm((actual) => ({
                  ...actual,
                  requiereFoto: e.target.checked,
                }))
              }
              className="h-4 w-4 accent-brand-700"
            />
            Exigir foto para completar esta tarea
          </label>
          {editando !== "nueva" && (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
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
              Tarea activa
            </label>
          )}
          <p className="rounded-lg bg-brand-50 px-3 py-2.5 text-xs text-brand-800 dark:bg-brand-950 dark:text-brand-200">
            Al guardar, este cambio se sincroniza con todos los clientes y sus
            locales sin borrar las respuestas de visitas anteriores.
          </p>
          {error && <p className={errorBox}>{error}</p>}
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
    </div>
  );
}
