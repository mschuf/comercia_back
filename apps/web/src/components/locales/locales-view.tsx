"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
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
import { formatoCoordenada } from "@/utils/formato";
import { formatoFechaHora } from "@/utils/fechas";
import type { RespuestaPaginada } from "@/types/paginacion";
import type { Local, UsuarioAsignable } from "@/types/local";
import type { Zona } from "@/types/territorio";
import type { ConfigImpulsador } from "@/types/impulsador-config";
import type { Cliente } from "@/types/cliente";

// Leaflet solo existe en el navegador: import dinámico sin SSR
const MapaPicker = dynamic(
  () => import("@/components/locales/mapa-picker").then((m) => m.MapaPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-[52dvh] min-h-[340px] w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800 sm:h-[58dvh] sm:min-h-[430px] lg:h-[560px] lg:min-h-0" />
    ),
  },
);

interface FormLocal {
  nombre: string;
  clienteId: number | "";
  latitud: string;
  longitud: string;
  usuarioId: number | "";
  zonaId: number | "";
  // Texto libre del input numérico; "" = usa el radio por defecto de la config
  radioMetros: string;
  requiereFotoPresencia: boolean;
  activo: boolean;
}

interface LocalesViewProps {
  clienteInicial?: Pick<Cliente, "id" | "nombre">;
  onLimpiarCliente?: () => void;
}

const FORM_VACIO: FormLocal = {
  nombre: "",
  clienteId: "",
  latitud: "",
  longitud: "",
  usuarioId: "",
  zonaId: "",
  radioMetros: "",
  requiereFotoPresencia: false,
  activo: true,
};

function parseCoordenada(texto: string): number | null {
  const n = Number(texto.trim().replace(",", "."));
  return texto.trim() !== "" && Number.isFinite(n) ? n : null;
}

function EstadoLocal({ activo }: { activo: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
        activo
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
      }`}
    >
      {activo ? "Activo" : "Inactivo"}
    </span>
  );
}

export function LocalesView({
  clienteInicial,
  onLimpiarCliente,
}: LocalesViewProps) {
  // La regla de qué roles gestionan vive en el backend: mientras la config
  // carga nos comportamos como no-gestor (sin botones de gestión).
  const [config, setConfig] = useState<ConfigImpulsador | null>(null);
  const esGestor = config?.esGestor ?? false;

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(7);
  const [clienteIdFiltro, setClienteIdFiltro] = useState<number | "">(
    clienteInicial?.id ?? "",
  );
  const [usuarioIdFiltro, setUsuarioIdFiltro] = useState<number | "">("");
  const [datos, setDatos] = useState<RespuestaPaginada<Local> | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [asignables, setAsignables] = useState<UsuarioAsignable[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // null = cerrado; "nuevo" = alta; Local = edición
  const [editando, setEditando] = useState<Local | "nuevo" | null>(null);
  const [form, setForm] = useState<FormLocal>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [eliminando, setEliminando] = useState<Local | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  const parametrosListado = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (clienteIdFiltro !== "") {
    parametrosListado.set("clienteId", String(clienteIdFiltro));
  }
  if (usuarioIdFiltro !== "") {
    parametrosListado.set("usuarioId", String(usuarioIdFiltro));
  }
  const rutaListado = `/locales?${parametrosListado.toString()}`;

  const cargar = useCallback(() => {
    setErrorCarga(null);
    return apiFetch<RespuestaPaginada<Local>>(rutaListado)
      .then(setDatos)
      .catch((err) =>
        setErrorCarga(
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar los locales",
        ),
      );
  }, [rutaListado]);

  // cargando solo cubre la carga inicial (los cambios de página refrescan sin parpadeo)
  useEffect(() => {
    let vigente = true;
    apiFetch<RespuestaPaginada<Local>>(rutaListado)
      .then((data) => {
        if (vigente) {
          setDatos(data);
          setErrorCarga(null);
        }
      })
      .catch((err) => {
        if (vigente) {
          setErrorCarga(
            err instanceof ApiError
              ? err.message
              : "No se pudieron cargar los locales",
          );
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [rutaListado]);

  useEffect(() => {
    let vigente = true;
    apiFetch<ConfigImpulsador>("/impulsador/config")
      .then((data) => {
        if (vigente) setConfig(data);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    let vigente = true;
    apiFetch<RespuestaPaginada<Cliente>>("/clientes?page=1&limit=50")
      .then((data) => {
        if (vigente) setClientes(data.items.filter((c) => c.activo));
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

  useEffect(() => {
    if (!esGestor) return;
    let vigente = true;
    Promise.all([
      apiFetch<UsuarioAsignable[]>("/locales/usuarios-asignables"),
      apiFetch<Zona[]>("/zonas/todas"),
    ])
      .then(([usuarios, zonasDisponibles]) => {
        if (vigente) {
          setAsignables(usuarios);
          setZonas(zonasDisponibles);
        }
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [esGestor]);

  function abrirNuevo() {
    setForm({
      ...FORM_VACIO,
      clienteId:
        clienteIdFiltro === "" ? (clientes[0]?.id ?? "") : clienteIdFiltro,
      zonaId: zonas[0]?.id ?? "",
    });
    setErrorForm(null);
    setEditando("nuevo");
  }

  function abrirEdicion(local: Local) {
    setForm({
      nombre: local.nombre,
      clienteId: local.cliente.id,
      latitud: formatoCoordenada(local.latitud),
      longitud: formatoCoordenada(local.longitud),
      usuarioId: local.asignadoA?.id ?? "",
      zonaId: local.zona?.id ?? "",
      radioMetros: local.radioMetros?.toString() ?? "",
      requiereFotoPresencia: local.requiereFotoPresencia,
      activo: local.activo,
    });
    setErrorForm(null);
    setEditando(local);
  }

  function alClickEnMapa(lat: number, lng: number) {
    setForm((f) => ({
      ...f,
      latitud: formatoCoordenada(lat),
      longitud: formatoCoordenada(lng),
    }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (guardando || editando === null) return;

    const nombre = form.nombre.trim();
    const latitud = parseCoordenada(form.latitud);
    const longitud = parseCoordenada(form.longitud);
    if (nombre.length < 2) {
      setErrorForm("El nombre debe tener al menos 2 caracteres");
      return;
    }
    if (form.clienteId === "") {
      setErrorForm("Elegí el cliente del local");
      return;
    }
    if (form.zonaId === "") {
      setErrorForm("Elegí la zona del local");
      return;
    }
    if (form.usuarioId === "") {
      setErrorForm("Elegí el repositor asignado al local");
      return;
    }
    if (latitud === null || latitud < -90 || latitud > 90) {
      setErrorForm("La latitud debe ser un número entre -90 y 90");
      return;
    }
    if (longitud === null || longitud < -180 || longitud > 180) {
      setErrorForm("La longitud debe ser un número entre -180 y 180");
      return;
    }
    let radioMetros: number | null = null;
    if (form.radioMetros !== "") {
      const radio = Number(form.radioMetros);
      if (!Number.isInteger(radio) || radio < 10 || radio > 50000) {
        setErrorForm("El radio debe ser un entero entre 10 y 50000 metros");
        return;
      }
      radioMetros = radio;
    }

    setErrorForm(null);
    setGuardando(true);
    try {
      const inicial = editando === "nuevo" ? null : editando;
      const body = {
        nombre,
        clienteId: form.clienteId,
        latitud,
        longitud,
        usuarioId: form.usuarioId,
        zonaId: form.zonaId,
        radioMetros,
        requiereFotoPresencia: form.requiereFotoPresencia,
        ...(inicial ? { activo: form.activo } : {}),
      };
      if (inicial) {
        await apiFetch(`/locales/${inicial.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/locales", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setEditando(null);
      await cargar();
    } catch (err) {
      setErrorForm(
        err instanceof ApiError ? err.message : "No se pudo guardar el local",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarEliminar() {
    if (!eliminando || borrando) return;
    setBorrando(true);
    setErrorEliminar(null);
    try {
      await apiFetch(`/locales/${eliminando.id}`, { method: "DELETE" });
      setEliminando(null);
      // Si borré el único registro de la página, retrocedo una página
      if (datos && datos.items.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        await cargar();
      }
    } catch (err) {
      setErrorEliminar(
        err instanceof ApiError ? err.message : "No se pudo eliminar el local",
      );
    } finally {
      setBorrando(false);
    }
  }

  const latForm = parseCoordenada(form.latitud);
  const lngForm = parseCoordenada(form.longitud);
  const zonaSeleccionada = zonas.find((z) => z.id === form.zonaId);
  const idsRepositoresZona = new Set(
    zonaSeleccionada?.repositores.map((u) => u.id) ?? [],
  );
  const asignablesDeZona = asignables.filter((u) =>
    idsRepositoresZona.has(u.id),
  );

  if (cargando && !datos) {
    return <p className="text-sm text-zinc-400">Cargando locales...</p>;
  }

  if (errorCarga && !datos) {
    return <p className={errorBox}>{errorCarga}</p>;
  }

  const locales = datos?.items ?? [];
  const clienteSeleccionado =
    clientes.find((cliente) => cliente.id === clienteIdFiltro) ??
    clienteInicial;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Locales</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {esGestor
              ? "Filtrá por cliente o repositor y administrá los puntos de visita."
              : "Estos son los locales que te asignó tu líder."}
          </p>
        </div>
        {esGestor && (
          <button
            type="button"
            onClick={abrirNuevo}
            aria-label="Crear local"
            title="Crear local"
            className={`${btnPrimary} h-11 w-11 shrink-0 p-0`}
          >
            <IconoMas className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:flex-row sm:items-end dark:border-zinc-800 dark:bg-zinc-950/60">
        <label className={`${labelBase} min-w-0 sm:w-64`}>
          Cliente
          <select
            value={clienteIdFiltro}
            onChange={(e) => {
              const valor = e.target.value === "" ? "" : Number(e.target.value);
              setClienteIdFiltro(valor);
              setPage(1);
              if (valor === "") onLimpiarCliente?.();
            }}
            className={inputBase}
          >
            <option value="">Todos los clientes</option>
            {clienteSeleccionado &&
              !clientes.some(
                (cliente) => cliente.id === clienteSeleccionado.id,
              ) && (
                <option value={clienteSeleccionado.id}>
                  {clienteSeleccionado.nombre}
                </option>
              )}
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre}
              </option>
            ))}
          </select>
        </label>
        {esGestor && (
          <label className={`${labelBase} min-w-0 sm:w-64`}>
            Repositor
            <select
              value={usuarioIdFiltro}
              onChange={(e) => {
                setUsuarioIdFiltro(
                  e.target.value === "" ? "" : Number(e.target.value),
                );
                setPage(1);
              }}
              className={inputBase}
            >
              <option value="">Todos los repositores</option>
              {asignables.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombre}
                  {usuario.rol ? ` — ${usuario.rol}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        {(clienteIdFiltro !== "" || usuarioIdFiltro !== "") && (
          <button
            type="button"
            onClick={() => {
              setClienteIdFiltro("");
              setUsuarioIdFiltro("");
              setPage(1);
              onLimpiarCliente?.();
            }}
            className={`${btnGhost} min-h-11`}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {errorCarga && <p className={`${errorBox} mt-4`}>{errorCarga}</p>}

      {locales.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {clienteIdFiltro !== "" || usuarioIdFiltro !== ""
              ? "No hay locales que coincidan con los filtros seleccionados."
              : esGestor
                ? "Todavía no hay locales cargados. Creá el primero con el botón «+»."
                : "Todavía no tenés locales asignados."}
          </p>
        </div>
      ) : (
        <>
          {false && (
            <div className="mt-4 grid gap-3 md:hidden">
              {locales.map((l) => (
                <article
                  key={l.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-base font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                        {l.nombre}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Actualizado {formatoFechaHora(l.updatedAt)}
                      </p>
                    </div>
                    <EstadoLocal activo={l.activo} />
                  </div>

                  <dl className="mt-4 space-y-2 text-sm">
                    <div>
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        Asignado a
                      </dt>
                      <dd className="mt-0.5 text-zinc-700 dark:text-zinc-200">
                        {l.asignadoA ? (
                          l.asignadoA.nombre
                        ) : (
                          <span className="text-zinc-400 dark:text-zinc-500">
                            Sin asignar
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                        Coordenadas
                      </dt>
                      <dd className="mt-0.5 break-all text-zinc-700 [font-variant-numeric:tabular-nums] dark:text-zinc-200">
                        {formatoCoordenada(l.latitud)},{" "}
                        {formatoCoordenada(l.longitud)}
                      </dd>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                          Zona
                        </dt>
                        <dd className="mt-0.5 break-words text-zinc-700 dark:text-zinc-200">
                          {l.zona ? (
                            l.zona.nombre
                          ) : (
                            <span className="text-zinc-400 dark:text-zinc-500">
                              —
                            </span>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                          Próx. visita
                        </dt>
                        <dd className="mt-0.5 text-zinc-700 [font-variant-numeric:tabular-nums] dark:text-zinc-200">
                          {formatoFechaHora(l.fechaVisita)}
                        </dd>
                      </div>
                    </div>
                  </dl>

                  {esGestor && (
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={() => abrirEdicion(l)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-4 w-4"
                          aria-hidden
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorEliminar(null);
                          setEliminando(l);
                        }}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-600/40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        <svg
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="h-4 w-4"
                          aria-hidden
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full min-w-[1040px] text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950/60">
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-4 py-3 font-medium">Local</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Coordenadas</th>
                  <th className="px-4 py-3 font-medium">Zona</th>
                  <th className="px-4 py-3 font-medium">Asignado a</th>
                  <th className="px-4 py-3 font-medium">Próx. visita</th>
                  <th className="px-4 py-3 font-medium">Actualizado</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  {esGestor && (
                    <th className="px-4 py-3 text-right font-medium">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {locales.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-zinc-100 transition last:border-0 hover:bg-zinc-50/80 dark:border-zinc-800/60 dark:hover:bg-zinc-800/40"
                  >
                    <td className="px-4 py-3 font-medium">{l.nombre}</td>
                    <td className="px-4 py-3 font-medium text-brand-700 dark:text-brand-300">
                      {l.cliente.nombre}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 [font-variant-numeric:tabular-nums] dark:text-zinc-400">
                      {formatoCoordenada(l.latitud)},{" "}
                      {formatoCoordenada(l.longitud)}
                    </td>
                    <td className="px-4 py-3">
                      {l.zona ? (
                        l.zona.nombre
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {l.asignadoA ? (
                        l.asignadoA.nombre
                      ) : (
                        <span className="text-zinc-400">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 [font-variant-numeric:tabular-nums] dark:text-zinc-400">
                      {formatoFechaHora(l.fechaVisita)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 [font-variant-numeric:tabular-nums] dark:text-zinc-400">
                      {formatoFechaHora(l.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoLocal activo={l.activo} />
                    </td>
                    {esGestor && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => abrirEdicion(l)}
                            aria-label={`Editar ${l.nombre}`}
                            className="grid h-11 w-11 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          >
                            <svg
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-4.5 w-4.5"
                              aria-hidden
                            >
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setErrorEliminar(null);
                              setEliminando(l);
                            }}
                            aria-label={`Eliminar ${l.nombre}`}
                            className="grid h-11 w-11 place-items-center rounded-lg text-zinc-500 transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-600/40 dark:text-zinc-400 dark:hover:bg-red-950 dark:hover:text-red-400"
                          >
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
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {datos && datos.total > 0 && (
        <Paginacion
          page={datos.page}
          totalPages={datos.totalPages}
          total={datos.total}
          limit={datos.limit}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      )}

      {/* Modal alta/edición con mapa */}
      <Modal
        titulo={editando === "nuevo" ? "Nuevo local" : "Editar local"}
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
        ancho="xl"
      >
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
              Ubicación{" "}
              <span className="font-normal text-zinc-400">
                — hacé clic en el mapa o cargá las coordenadas a mano
              </span>
            </p>
            {editando !== null && (
              <MapaPicker
                lat={latForm}
                lng={lngForm}
                onSeleccion={alClickEnMapa}
              />
            )}
          </div>

          <label className={labelBase}>
            Nombre del local
            <input
              type="text"
              value={form.nombre}
              onChange={(e) =>
                setForm((f) => ({ ...f, nombre: e.target.value }))
              }
              placeholder="Ej. Súper San Lorenzo Centro"
              maxLength={120}
              required
              className={inputBase}
            />
          </label>

          <label className={labelBase}>
            Cliente
            <select
              value={form.clienteId}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  clienteId: Number(e.target.value),
                }))
              }
              required
              className={inputBase}
            >
              <option value="" disabled>
                Elegí un cliente
              </option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelBase}>
              Latitud
              <input
                type="text"
                inputMode="decimal"
                value={form.latitud}
                onChange={(e) =>
                  setForm((f) => ({ ...f, latitud: e.target.value }))
                }
                placeholder="-25.286700"
                required
                className={inputBase}
              />
            </label>
            <label className={labelBase}>
              Longitud
              <input
                type="text"
                inputMode="decimal"
                value={form.longitud}
                onChange={(e) =>
                  setForm((f) => ({ ...f, longitud: e.target.value }))
                }
                placeholder="-57.647200"
                required
                className={inputBase}
              />
            </label>
          </div>

          <label className={labelBase}>
            Asignado a
            <select
              value={form.usuarioId}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  usuarioId:
                    e.target.value === "" ? "" : Number(e.target.value),
                }))
              }
              required
              className={inputBase}
            >
              <option value="" disabled>
                Elegí un repositor de la zona
              </option>
              {asignablesDeZona.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                  {u.rol ? ` — ${u.rol}` : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelBase}>
              Zona
              <select
                value={form.zonaId}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    zonaId: e.target.value === "" ? "" : Number(e.target.value),
                    usuarioId: "",
                  }))
                }
                required
                className={inputBase}
              >
                <option value="" disabled>
                  Elegí una zona
                </option>
                {zonas.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.nombre} — {z.territorioNombre}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelBase}>
              Radio de verificación (m)
              <input
                type="number"
                inputMode="numeric"
                min={10}
                max={50000}
                value={form.radioMetros}
                onChange={(e) =>
                  setForm((f) => ({ ...f, radioMetros: e.target.value }))
                }
                placeholder="Por defecto (config)"
                className={inputBase}
              />
            </label>
            <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={form.requiereFotoPresencia}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    requiereFotoPresencia: e.target.checked,
                  }))
                }
                className="h-4 w-4 accent-brand-700"
              />
              Exigir foto de presencia al visitar
            </label>
          </div>

          <p className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
            Los días y horarios se administran desde la pantalla Visitas.
          </p>

          {editando !== null && editando !== "nuevo" && (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, activo: e.target.checked }))
                }
                className="h-4 w-4 accent-brand-700"
              />
              Local activo
            </label>
          )}

          {errorForm && <p className={errorBox}>{errorForm}</p>}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setEditando(null)}
              className={btnGhost}
            >
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className={btnPrimary}>
              {guardando
                ? "Guardando..."
                : editando === "nuevo"
                  ? "Crear local"
                  : "Guardar cambios"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmación de borrado */}
      <Modal
        titulo="Eliminar local"
        abierto={eliminando !== null}
        onCerrar={() => setEliminando(null)}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          ¿Seguro que querés eliminar{" "}
          <span className="font-semibold">{eliminando?.nombre}</span>? Esta
          acción no se puede deshacer.
        </p>
        {errorEliminar && <p className={`${errorBox} mt-3`}>{errorEliminar}</p>}
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
            onClick={confirmarEliminar}
            disabled={borrando}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {borrando ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
