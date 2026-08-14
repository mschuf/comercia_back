"use client";

/* Hallmark · prioridades y alcance visibles en una lista móvil compacta. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { IconoMas } from "@/components/icono-mas";
import { Modal } from "@/components/modal";
import { PantallaCarga } from "@/components/pantalla-carga";
import { Paginacion } from "@/components/paginacion";
import { SelectorUsuario } from "@/components/selector-usuario";
import { useToast } from "@/components/toast/toast-provider";
import {
  btnGhost,
  btnPrimary,
  errorBox,
  inputBase,
  labelBase,
} from "@/components/ui";
import type { RespuestaPaginada } from "@/types/paginacion";
import type {
  FormularioTarea,
  TareaGlobal,
  TareasQuitadasUsuario,
} from "@/types/tarea";
import type { Local, UsuarioAsignable } from "@/types/local";
import {
  etiquetaAlcanceLocales,
  etiquetaAlcanceUsuarios,
  fechaHoraParaApi,
  fechaHoraParaInput,
} from "@/utils/tareas";
import {
  SeguimientoTareasView,
  type FiltrosSeguimientoTareas,
} from "@/components/equipo/seguimiento-tareas-view";

const FORM_INICIAL: FormularioTarea = {
  titulo: "",
  descripcion: "",
  requiereFoto: false,
  orden: 0,
  activo: true,
  alcance: "EQUIPO_COMPLETO",
  equipoRaiz: null,
  destinatarios: [],
  alcanceLocales: "TODOS",
  cliente: null,
  locales: [],
  vigenteDesde: "",
  vigenteHasta: "",
};
const ROLES_EQUIPO_RAIZ = ["teamleader.impulsador"];

function ListaTareasGlobalesMovil({
  tareas,
  onEditar,
}: {
  tareas: TareaGlobal[];
  onEditar: (tarea: TareaGlobal) => void;
}) {
  return (
    <ul className="mt-5 space-y-3 md:hidden" aria-label="Tareas">
      {tareas.map((tarea) => {
        return (
          <li
            key={tarea.id}
            className="rounded-xl border border-line bg-surface-raised p-4 [content-visibility:auto]"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                {tarea.orden}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-semibold ${
                    tarea.activo ? "text-foreground" : "text-muted line-through"
                  }`}
                >
                  {tarea.titulo}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {tarea.descripcion}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                  tarea.activo
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {tarea.activo ? "Activa" : "Inactiva"}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3 text-xs">
              <p className="rounded-lg bg-surface-soft px-2.5 py-2 text-muted">
                Foto:{" "}
                <strong className="text-foreground">
                  {tarea.requiereFoto ? "requerida" : "no requerida"}
                </strong>
              </p>
              <p className="col-span-2 rounded-lg bg-surface-soft px-2.5 py-2 text-muted">
                <strong className="text-foreground">
                  {tarea.alcanceLocales === "SELECCIONADOS"
                    ? `${tarea.localesAsignados} local${tarea.localesAsignados === 1 ? "" : "es"}`
                    : tarea.alcanceLocales === "CLIENTE"
                      ? tarea.cliente?.nombre ?? "Cliente"
                      : etiquetaAlcanceLocales(tarea.alcanceLocales)}
                </strong>
              </p>
              <p className="rounded-lg bg-surface-soft px-2.5 py-2 text-muted">
                <strong className="text-foreground">
                  {tarea.alcance === "SELECCIONADOS"
                    ? `${tarea.usuariosAsignados} persona${tarea.usuariosAsignados === 1 ? "" : "s"}`
                    : etiquetaAlcanceUsuarios(tarea.alcance)}
                  {tarea.usuariosExcluidos > 0
                    ? ` · ${tarea.usuariosExcluidos} excluido${tarea.usuariosExcluidos === 1 ? "" : "s"}`
                    : ""}
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={() => onEditar(tarea)}
              disabled={!tarea.editable}
              className={`${btnGhost} mt-3 min-h-11 w-full whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {tarea.editable ? "Editar tarea" : "Asignada por supervisión"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function TareasView({
  filtrosIniciales,
}: {
  filtrosIniciales?: FiltrosSeguimientoTareas;
}) {
  return filtrosIniciales ? (
    <SeguimientoTareasView
      key={`${filtrosIniciales.repositorId ?? 0}:${filtrosIniciales.localId ?? 0}:${filtrosIniciales.novedadId ?? 0}`}
      filtros={filtrosIniciales}
    />
  ) : (
    <TareasAdministracionView />
  );
}

function TareasAdministracionView() {
  const { mostrarToast } = useToast();
  const [datos, setDatos] = useState<RespuestaPaginada<TareaGlobal> | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(7);
  const [editando, setEditando] = useState<TareaGlobal | "nueva" | null>(null);
  const [form, setForm] = useState<FormularioTarea>(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [localesDisponibles, setLocalesDisponibles] = useState<Local[]>([]);
  const [modalQuitarAbierto, setModalQuitarAbierto] = useState(false);
  const [usuarioAQuitar, setUsuarioAQuitar] = useState<UsuarioAsignable | null>(
    null,
  );
  const [quitandoTareas, setQuitandoTareas] = useState(false);
  const clientesDisponibles = useMemo(
    () =>
      Array.from(
        new Map(
          localesDisponibles.map((local) => [local.cliente.id, local.cliente]),
        ).values(),
      ).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [localesDisponibles],
  );

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

  useEffect(() => {
    let vigente = true;
    async function cargarLocales() {
      try {
        const primera = await apiFetch<RespuestaPaginada<Local>>(
          "/locales?page=1&limit=50",
        );
        const paginas = await Promise.all(
          Array.from(
            { length: Math.min(4, primera.totalPages) - 1 },
            (_, indice) =>
              apiFetch<RespuestaPaginada<Local>>(
                `/locales?page=${indice + 2}&limit=50`,
              ),
          ),
        );
        if (vigente) {
          setLocalesDisponibles([
            ...primera.items,
            ...paginas.flatMap(({ items }) => items),
          ]);
        }
      } catch {
        if (vigente) setLocalesDisponibles([]);
      }
    }
    void cargarLocales();
    return () => {
      vigente = false;
    };
  }, []);

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
            alcance: tarea.alcance,
            equipoRaiz: tarea.equipoRaiz,
            destinatarios: tarea.destinatarios,
            alcanceLocales: tarea.alcanceLocales,
            cliente: tarea.cliente,
            locales: tarea.locales,
            vigenteDesde: fechaHoraParaInput(tarea.vigenteDesde),
            vigenteHasta: fechaHoraParaInput(tarea.vigenteHasta),
          },
    );
    setError(null);
    setEditando(tarea);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (editando === null) return;
    if (form.alcance === "SELECCIONADOS" && form.destinatarios.length === 0) {
      setError("Elegí al menos una persona para esta tarea.");
      return;
    }
    if (form.alcanceLocales === "SELECCIONADOS" && form.locales.length === 0) {
      setError("Elegí al menos un local para esta tarea.");
      return;
    }
    if (form.alcanceLocales === "CLIENTE" && form.cliente === null) {
      setError("Elegí un cliente para esta tarea.");
      return;
    }
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
            alcance: form.alcance,
            equipoRaizId: form.equipoRaiz?.id,
            usuarioIds: form.destinatarios.map(({ id }) => id),
            alcanceLocales: form.alcanceLocales,
            clienteId: form.cliente?.id,
            localIds: form.locales.map(({ id }) => id),
            vigenteDesde: fechaHoraParaApi(form.vigenteDesde),
            vigenteHasta: fechaHoraParaApi(form.vigenteHasta),
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

  async function quitarTodasDeUsuario() {
    if (!usuarioAQuitar) {
      setError("Elegí una persona para quitarle sus tareas.");
      return;
    }
    const usuario = usuarioAQuitar;
    setQuitandoTareas(true);
    setError(null);
    try {
      const resultado = await apiFetch<TareasQuitadasUsuario>(
        `/tareas/usuarios/${usuario.id}`,
        { method: "DELETE" },
      );
      setModalQuitarAbierto(false);
      setUsuarioAQuitar(null);
      cargar();
      mostrarToast({
        tipo: "exito",
        mensaje:
          resultado.tareasQuitadas === 0
            ? `${usuario.nombre} ya no tenía tareas asignadas.`
            : `Se quitaron ${resultado.tareasQuitadas} tarea${resultado.tareasQuitadas === 1 ? "" : "s"} de ${usuario.nombre}. El resto del equipo no fue afectado.`,
      });
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : "No se pudieron quitar las tareas de esta persona",
      );
    } finally {
      setQuitandoTareas(false);
    }
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Tareas</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500 dark:text-zinc-400">
            Creá tareas globales o dirigilas a personas y locales concretos. Los
            checklists siguen disponibles para los roles de reposición.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setUsuarioAQuitar(null);
              setModalQuitarAbierto(true);
            }}
            className={`${btnGhost} flex-1 gap-2 sm:flex-none`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden
            >
              <path d="M16 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" />
              <circle cx="9.5" cy="7" r="4" />
              <path d="M17 11h5" />
            </svg>
            Quitar tareas a una persona
          </button>
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
      </div>

      {error && editando === null && !modalQuitarAbierto && (
        <p className={`${errorBox} mt-4`}>{error}</p>
      )}

      {datos && datos.items.length > 0 && (
        <>
          <ListaTareasGlobalesMovil tareas={datos.items} onEditar={abrir} />
          <div className="mt-5 hidden overflow-x-auto rounded-xl border border-line bg-surface-raised md:block">
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
                      <td className="px-4 py-3 text-xs text-muted">
                        <span className="block whitespace-nowrap font-medium text-foreground">
                          {tarea.alcance === "SELECCIONADOS"
                            ? `${tarea.usuariosAsignados} seleccionado${tarea.usuariosAsignados === 1 ? "" : "s"}`
                            : etiquetaAlcanceUsuarios(tarea.alcance)}
                          {tarea.usuariosExcluidos > 0
                            ? ` · ${tarea.usuariosExcluidos} excluido${tarea.usuariosExcluidos === 1 ? "" : "s"}`
                            : ""}
                          {" · "}
                          {tarea.alcanceLocales === "SELECCIONADOS"
                            ? `${tarea.localesAsignados} local${tarea.localesAsignados === 1 ? "" : "es"}`
                            : tarea.alcanceLocales === "CLIENTE"
                              ? tarea.cliente?.nombre ?? "Cliente"
                              : "todos los locales"}
                        </span>
                        {tarea.alcance === "SELECCIONADOS" ? (
                          <span className="mt-0.5 block max-w-56 truncate">
                            {tarea.destinatarios
                              .map(({ nombre }) => nombre)
                              .join(", ")}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => abrir(tarea)}
                          disabled={!tarea.editable}
                          className={`${btnGhost} min-h-11 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {tarea.editable ? "Editar" : "Solo lectura"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
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
          <fieldset className="space-y-2">
            <legend className={labelBase}>Asignar esta tarea a</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(
                [
                  ["EQUIPO_DIRECTO", "Equipo directo"],
                  ["EQUIPO_COMPLETO", "Equipo completo"],
                  ["SELECCIONADOS", "Elegir personas"],
                  ["EMPRESA", "Toda la empresa"],
                ] as const
              ).map(([valor, etiqueta]) => (
                <label
                  key={valor}
                  className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium ${
                    form.alcance === valor
                      ? "border-brand-500 bg-brand-50 text-brand-900 dark:bg-brand-950 dark:text-brand-100"
                      : "border-control-line bg-surface-raised text-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="alcance-tarea"
                    checked={form.alcance === valor}
                    onChange={() =>
                      setForm((actual) => ({
                        ...actual,
                        alcance: valor,
                        destinatarios:
                          valor === "SELECCIONADOS"
                            ? actual.destinatarios
                            : [],
                        equipoRaiz:
                          valor === "EQUIPO_DIRECTO" ||
                          valor === "EQUIPO_COMPLETO"
                            ? actual.equipoRaiz
                            : null,
                      }))
                    }
                    className="accent-brand-700"
                  />
                  {etiqueta}
                </label>
              ))}
            </div>
          </fieldset>
          {form.alcance === "EQUIPO_DIRECTO" ||
          form.alcance === "EQUIPO_COMPLETO" ? (
            <div>
              <p className={labelBase}>Equipo base (opcional)</p>
              <SelectorUsuario
                value={form.equipoRaiz?.id ?? ""}
                rolesPermitidos={ROLES_EQUIPO_RAIZ}
                seleccionadoInicial={
                  form.equipoRaiz
                    ? { ...form.equipoRaiz, rol: null }
                    : null
                }
                onChange={() => undefined}
                onSelect={(usuario) =>
                  setForm((actual) => ({
                    ...actual,
                    equipoRaiz: usuario
                      ? { id: usuario.id, nombre: usuario.nombre }
                      : null,
                  }))
                }
              />
              <p className="mt-1 text-xs text-muted">
                Si no elegís otro equipo, se usa el tuyo. El supervisor puede
                elegir un team leader propio.
              </p>
            </div>
          ) : null}
          {form.alcance === "SELECCIONADOS" ? (
            <div>
              <p className={labelBase}>Agregar persona</p>
              <SelectorUsuario
                value=""
                onChange={() => undefined}
                onSelect={(usuario) => {
                  if (!usuario) return;
                  setForm((actual) =>
                    actual.destinatarios.some(({ id }) => id === usuario.id)
                      ? actual
                      : {
                          ...actual,
                          destinatarios: [
                            ...actual.destinatarios,
                            { id: usuario.id, nombre: usuario.nombre },
                          ],
                        },
                  );
                }}
              />
              {form.destinatarios.length > 0 ? (
                <ul
                  className="mt-3 flex flex-wrap gap-2"
                  aria-label="Personas seleccionadas"
                >
                  {form.destinatarios.map((usuario) => (
                    <li key={usuario.id}>
                      <button
                        type="button"
                        onClick={() =>
                          setForm((actual) => ({
                            ...actual,
                            destinatarios: actual.destinatarios.filter(
                              ({ id }) => id !== usuario.id,
                            ),
                          }))
                        }
                        className="min-h-11 whitespace-nowrap rounded-full border border-brand-200 bg-brand-50 px-3 text-sm font-medium text-brand-900 hover:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-600/55 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-100"
                        aria-label={`Quitar a ${usuario.nombre}`}
                      >
                        {usuario.nombre} ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted">
                  Todavía no elegiste a nadie.
                </p>
              )}
            </div>
          ) : null}
          <fieldset className="space-y-2">
            <legend className={labelBase}>Aplicar en</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  ["TODOS", "Todos los locales"],
                  ["CLIENTE", "Todo un cliente"],
                  ["SELECCIONADOS", "Elegir locales"],
                ] as const
              ).map(([valor, etiqueta]) => (
                <label
                  key={valor}
                  className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium ${
                    form.alcanceLocales === valor
                      ? "border-brand-500 bg-brand-50 text-brand-900 dark:bg-brand-950 dark:text-brand-100"
                      : "border-control-line bg-surface-raised text-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="alcance-locales-tarea"
                    checked={form.alcanceLocales === valor}
                    onChange={() =>
                      setForm((actual) => ({
                        ...actual,
                        alcanceLocales: valor,
                        locales:
                          valor === "SELECCIONADOS" ? actual.locales : [],
                        cliente:
                          valor === "CLIENTE" ? actual.cliente : null,
                      }))
                    }
                    className="accent-brand-700"
                  />
                  {etiqueta}
                </label>
              ))}
            </div>
          </fieldset>
          {form.alcanceLocales === "CLIENTE" ? (
            <label className={labelBase}>
              Cliente
              <select
                value={form.cliente?.id ?? ""}
                onChange={(e) => {
                  const cliente = clientesDisponibles.find(
                    ({ id }) => id === Number(e.target.value),
                  );
                  setForm((actual) => ({
                    ...actual,
                    cliente: cliente ?? null,
                  }));
                }}
                required
                className={inputBase}
              >
                <option value="">Elegí un cliente</option>
                {clientesDisponibles.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {form.alcanceLocales === "SELECCIONADOS" ? (
            <fieldset className="max-h-52 overflow-y-auto rounded-xl border border-control-line p-2">
              <legend className="px-2 text-sm font-semibold text-foreground">
                Locales del equipo
              </legend>
              {localesDisponibles.map((local) => {
                const marcado = form.locales.some(({ id }) => id === local.id);
                return (
                  <label
                    key={local.id}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-surface-soft"
                  >
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() =>
                        setForm((actual) => ({
                          ...actual,
                          locales: marcado
                            ? actual.locales.filter(({ id }) => id !== local.id)
                            : [
                                ...actual.locales,
                                { id: local.id, nombre: local.nombre },
                              ],
                        }))
                      }
                      className="accent-brand-700"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {local.nombre}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {local.cliente.nombre}
                      </span>
                    </span>
                  </label>
                );
              })}
              {localesDisponibles.length === 0 ? (
                <p className="px-2 py-4 text-sm text-muted">
                  No hay locales disponibles dentro de tu equipo.
                </p>
              ) : null}
            </fieldset>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={labelBase}>
              Vigente desde (opcional)
              <input
                type="datetime-local"
                value={form.vigenteDesde}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    vigenteDesde: e.target.value,
                  }))
                }
                className={inputBase}
              />
            </label>
            <label className={labelBase}>
              Vigente hasta (opcional)
              <input
                type="datetime-local"
                value={form.vigenteHasta}
                min={form.vigenteDesde || undefined}
                onChange={(e) =>
                  setForm((actual) => ({
                    ...actual,
                    vigenteHasta: e.target.value,
                  }))
                }
                className={inputBase}
              />
            </label>
          </div>
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
            Alcance: {etiquetaAlcanceUsuarios(form.alcance).toLowerCase()} y{" "}
            {etiquetaAlcanceLocales(form.alcanceLocales).toLowerCase()}. Las
            visitas ya registradas conservan su versión de la tarea.
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

      <Modal
        titulo="Quitar todas las tareas"
        abierto={modalQuitarAbierto}
        onCerrar={() => {
          if (quitandoTareas) return;
          setModalQuitarAbierto(false);
          setUsuarioAQuitar(null);
          setError(null);
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
            Esta acción quita las tareas solamente de la persona que elijas. No
            desactiva las tareas del resto del equipo y conserva el historial de
            visitas ya realizadas.
          </div>
          <div>
            <p className={labelBase}>Persona</p>
            <SelectorUsuario
              value={usuarioAQuitar?.id ?? ""}
              seleccionadoInicial={usuarioAQuitar}
              onChange={() => undefined}
              onSelect={setUsuarioAQuitar}
              disabled={quitandoTareas}
            />
          </div>
          {usuarioAQuitar ? (
            <p className="rounded-xl bg-surface-soft px-3.5 py-3 text-sm text-muted">
              Vas a quitar todas las tareas de{" "}
              <strong className="text-foreground">
                {usuarioAQuitar.nombre}
              </strong>
              .
            </p>
          ) : null}
          {error ? <p className={errorBox}>{error}</p> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setModalQuitarAbierto(false);
                setUsuarioAQuitar(null);
                setError(null);
              }}
              disabled={quitandoTareas}
              className={btnGhost}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void quitarTodasDeUsuario()}
              disabled={!usuarioAQuitar || quitandoTareas}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-600/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              Quitar todas sus tareas
            </button>
          </div>
        </div>
      </Modal>

      <PantallaCarga
        visible={quitandoTareas}
        mensaje="Quitando tareas"
        detalle="Estamos actualizando solamente las asignaciones de esta persona."
      />
    </div>
  );
}
