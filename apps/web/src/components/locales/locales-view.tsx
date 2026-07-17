"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { IconoMas } from "@/components/icono-mas";
import { Modal } from "@/components/modal";
import { Paginacion } from "@/components/paginacion";
import { PantallaCarga } from "@/components/pantalla-carga";
import { SelectorUsuario } from "@/components/selector-usuario";
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
  // Texto libre del input numérico; "" = usa el radio general de 200 metros
  radioMetros: string;
  requiereFotoPresencia: boolean;
  activo: boolean;
}

interface LocalesViewProps {
  clienteInicial?: Pick<Cliente, "id" | "nombre">;
  repositorInicial?: { id?: number; nombre: string };
  onLimpiarCliente?: () => void;
  onLimpiarRepositor?: () => void;
}

const ESPERA_BUSQUEDA_MS = 350;

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
  repositorInicial,
  onLimpiarCliente,
  onLimpiarRepositor,
}: LocalesViewProps) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(7);
  const [clienteIdFiltro, setClienteIdFiltro] = useState<number | "">(
    clienteInicial?.id ?? "",
  );
  const [usuarioIdFiltro, setUsuarioIdFiltro] = useState<number | "">(
    repositorInicial?.id ?? "",
  );
  const [repositorFiltro, setRepositorFiltro] = useState(
    repositorInicial?.nombre ?? "",
  );
  const [repositorAplicado, setRepositorAplicado] = useState(
    repositorInicial?.id ? "" : (repositorInicial?.nombre ?? ""),
  );
  const [datos, setDatos] = useState<RespuestaPaginada<Local> | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

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
  const [navegando, setNavegando] = useState<string | null>(null);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setRepositorAplicado(
        usuarioIdFiltro === "" ? repositorFiltro.trim() : "",
      );
      setPage(1);
    }, ESPERA_BUSQUEDA_MS);
    return () => window.clearTimeout(temporizador);
  }, [repositorFiltro, usuarioIdFiltro]);

  const parametrosListado = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (clienteIdFiltro !== "") {
    parametrosListado.set("clienteId", String(clienteIdFiltro));
  }
  if (usuarioIdFiltro !== "") {
    parametrosListado.set("usuarioId", String(usuarioIdFiltro));
  } else if (repositorAplicado) {
    parametrosListado.set("repositor", repositorAplicado);
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
    let vigente = true;
    apiFetch<Zona[]>("/zonas/todas")
      .then((zonasDisponibles) => {
        if (vigente) setZonas(zonasDisponibles);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, []);

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

  function verTareas(local: Local) {
    if (local.tareasCount === 0 || navegando !== null) return;
    setNavegando(`Abriendo las tareas de ${local.nombre}`);
    const parametros = new URLSearchParams({
      localId: String(local.id),
      local: local.nombre,
    });
    if (local.asignadoA) {
      parametros.set("repositorId", String(local.asignadoA.id));
      parametros.set("repositor", local.asignadoA.nombre);
    }
    router.push(`/panel/team-leader/tareas?${parametros.toString()}`);
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
  const asignablesDeZona: UsuarioAsignable[] = (
    zonaSeleccionada?.repositores ?? []
  ).map((usuario) => ({
    ...usuario,
    rol: null,
  }));
  const asignadoInicial =
    asignablesDeZona.find((usuario) => usuario.id === form.usuarioId) ??
    (editando !== null &&
    editando !== "nuevo" &&
    editando.asignadoA?.id === form.usuarioId
      ? {
          id: editando.asignadoA.id,
          nombre: editando.asignadoA.nombre,
          rol: null,
        }
      : null);

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
            Filtrá por cliente o repositor y administrá los puntos de visita.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirNuevo}
          aria-label="Crear local"
          title="Crear local"
          className={`${btnPrimary} h-11 w-11 shrink-0 p-0`}
        >
          <IconoMas className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 sm:flex-row sm:items-end dark:border-zinc-800 dark:bg-zinc-950">
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
        <div className={`${labelBase} min-w-0 sm:w-72`}>
          <label htmlFor="filtro-repositor-locales">Repositor</label>
          <div className="relative">
            <input
              id="filtro-repositor-locales"
              type="search"
              value={repositorFiltro}
              placeholder="Buscar por nombre"
              onChange={(e) => {
                setRepositorFiltro(e.target.value);
                setUsuarioIdFiltro("");
                setPage(1);
              }}
              className={`${inputBase} pr-11`}
            />
            {repositorFiltro ? (
              <button
                type="button"
                onClick={() => {
                  setRepositorFiltro("");
                  setRepositorAplicado("");
                  setUsuarioIdFiltro("");
                  setPage(1);
                  onLimpiarRepositor?.();
                }}
                aria-label="Ver todos los repositores"
                title="Ver todos los repositores"
                className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:bg-surface-soft hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span aria-hidden>×</span>
              </button>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setRepositorFiltro("");
            setRepositorAplicado("");
            setUsuarioIdFiltro("");
            setPage(1);
            onLimpiarRepositor?.();
          }}
          disabled={!repositorFiltro && usuarioIdFiltro === ""}
          className={`${btnGhost} min-h-12 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45`}
        >
          Todos los repositores
        </button>
        {(clienteIdFiltro !== "" || repositorFiltro !== "") && (
          <button
            type="button"
            onClick={() => {
              setClienteIdFiltro("");
              setUsuarioIdFiltro("");
              setRepositorFiltro("");
              setRepositorAplicado("");
              setPage(1);
              onLimpiarCliente?.();
              onLimpiarRepositor?.();
            }}
            className={`${btnGhost} min-h-11`}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {errorCarga && <p className={`${errorBox} mt-4`}>{errorCarga}</p>}

      {locales.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line bg-surface-raised p-10 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {clienteIdFiltro !== "" ||
            repositorAplicado !== "" ||
            usuarioIdFiltro !== ""
              ? "No hay locales que coincidan con los filtros seleccionados."
              : "Todavía no hay locales cargados. Creá el primero con el botón «+»."}
          </p>
        </div>
      ) : (
        <>
          {false && (
            <div className="mt-4 grid gap-3 md:hidden">
              {locales.map((l) => (
                <article
                  key={l.id}
                  className="rounded-xl border border-line bg-surface-raised p-4 shadow-[0_8px_24px_rgba(var(--warm-shadow),0.05)]"
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

                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => abrirEdicion(l)}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-control-line bg-surface-raised px-3 text-sm font-medium text-foreground transition hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-focus"
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
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-red-300 bg-surface-raised px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-600 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
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
                </article>
              ))}
            </div>
          )}

          <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface-raised shadow-[0_10px_30px_rgba(var(--warm-shadow),0.05)]">
            <table className="w-full min-w-[1140px] text-left text-sm">
              <thead className="bg-surface-soft">
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-foreground">
                  <th className="px-4 py-3 font-medium">Local</th>
                  <th className="px-4 py-3 font-medium">Tareas</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Coordenadas</th>
                  <th className="px-4 py-3 font-medium">Zona</th>
                  <th className="px-4 py-3 font-medium">Asignado a</th>
                  <th className="px-4 py-3 font-medium">Próx. visita</th>
                  <th className="px-4 py-3 font-medium">Actualizado</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {locales.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-line bg-surface-raised transition last:border-0 hover:bg-surface-soft"
                  >
                    <td className="px-4 py-3 font-medium">{l.nombre}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => verTareas(l)}
                        disabled={l.tareasCount === 0}
                        className={`${btnGhost} min-w-24 gap-2 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45`}
                        aria-label={`Ver tareas de ${l.nombre}`}
                      >
                        <IconoTareas />
                        {l.tareasCount}
                      </button>
                    </td>
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
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => abrirEdicion(l)}
                          aria-label={`Editar ${l.nombre}`}
                          className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface-raised text-muted transition hover:bg-surface-soft hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
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
                          className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface-raised text-muted transition hover:border-red-300 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-600 dark:hover:border-red-800 dark:hover:bg-red-950 dark:hover:text-red-300"
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

          <div>
            <p className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
              Asignado a
            </p>
            <SelectorUsuario
              key={`${editando === "nuevo" ? "nuevo" : (editando?.id ?? "cerrado")}-${form.zonaId}`}
              value={form.usuarioId}
              seleccionadoInicial={asignadoInicial}
              usuariosPermitidos={asignablesDeZona}
              disabled={form.zonaId === ""}
              onChange={(usuarioId) =>
                setForm((f) => ({
                  ...f,
                  usuarioId,
                }))
              }
            />
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              {form.zonaId === ""
                ? "Elegí una zona para ver su repositor."
                : asignablesDeZona.length === 0
                  ? "La zona seleccionada todavía no tiene un repositor."
                  : "La asignación se limita al repositor de la zona."}
            </p>
          </div>

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
                placeholder="Por defecto (200 m)"
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

          <p className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
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

      <PantallaCarga
        visible={navegando !== null}
        mensaje={navegando ?? "Abriendo tareas"}
        detalle="Preparamos el seguimiento del repositor y el local seleccionados."
      />
    </div>
  );
}

function IconoTareas() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M6.5 2A1.5 1.5 0 005 3.5V4H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1v-.5A1.5 1.5 0 0013.5 2h-7zM7 4v-.5h6V4H7zm7.03 4.47a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 01-1.06 0l-2-2a.75.75 0 011.06-1.06L9 12.44l3.97-3.97a.75.75 0 011.06 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
