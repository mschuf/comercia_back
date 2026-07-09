"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch, ApiError } from "@/lib/api";
import { Modal } from "@/components/modal";
import { Paginacion } from "@/components/paginacion";
import {
  btnGhost,
  btnPrimary,
  errorBox,
  inputBase,
  labelBase,
} from "@/components/ui";
import { formatoCoordenada, formatoFechaHora } from "@/utils/formato";
import { fechaInputAIso, formatoFecha, isoAFechaInput } from "@/utils/fechas";
import type { RespuestaPaginada } from "@/types/paginacion";
import type {
  Local,
  LocalDetalle,
  TareaLocal,
  UsuarioAsignable,
} from "@/types/local";
import type { Zona } from "@/types/territorio";
import type { ConfigImpulsador } from "@/types/impulsador-config";

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
  latitud: string;
  longitud: string;
  usuarioId: number | "";
  zonaId: number | "";
  // Texto libre del input numérico; "" = usa el radio por defecto de la config
  radioMetros: string;
  // "" o "aaaa-mm-dd" (input type="date")
  fechaVisita: string;
  requiereFotoPresencia: boolean;
  activo: boolean;
}

const FORM_VACIO: FormLocal = {
  nombre: "",
  latitud: "",
  longitud: "",
  usuarioId: "",
  zonaId: "",
  radioMetros: "",
  fechaVisita: "",
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

export function LocalesView() {
  // La regla de qué roles gestionan vive en el backend: mientras la config
  // carga nos comportamos como no-gestor (sin botones de gestión).
  const [config, setConfig] = useState<ConfigImpulsador | null>(null);
  const esGestor = config?.esGestor ?? false;

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(7);
  const [datos, setDatos] = useState<RespuestaPaginada<Local> | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [asignables, setAsignables] = useState<UsuarioAsignable[]>([]);
  const [zonas, setZonas] = useState<Zona[]>([]);

  // null = cerrado; "nuevo" = alta; Local = edición
  const [editando, setEditando] = useState<Local | "nuevo" | null>(null);
  const [checklistDe, setChecklistDe] = useState<Local | null>(null);
  const [form, setForm] = useState<FormLocal>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [eliminando, setEliminando] = useState<Local | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setErrorCarga(null);
    return apiFetch<RespuestaPaginada<Local>>(
      `/locales?page=${page}&limit=${limit}`,
    )
      .then(setDatos)
      .catch((err) =>
        setErrorCarga(
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar los locales",
        ),
      );
  }, [page, limit]);

  // cargando solo cubre la carga inicial (los cambios de página refrescan sin parpadeo)
  useEffect(() => {
    let vigente = true;
    apiFetch<RespuestaPaginada<Local>>(`/locales?page=${page}&limit=${limit}`)
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
  }, [page, limit]);

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
    if (!esGestor) return;
    let vigente = true;
    apiFetch<UsuarioAsignable[]>("/locales/usuarios-asignables")
      .then((data) => {
        if (vigente) setAsignables(data);
      })
      .catch(() => undefined);
    // Puede fallar con 403 si la empresa no tiene la página de zonas: sin zonas
    apiFetch<Zona[]>("/zonas/todas")
      .then((data) => {
        if (vigente) setZonas(data);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [esGestor]);

  function abrirNuevo() {
    setForm(FORM_VACIO);
    setErrorForm(null);
    setEditando("nuevo");
  }

  function abrirEdicion(local: Local) {
    setForm({
      nombre: local.nombre,
      latitud: formatoCoordenada(local.latitud),
      longitud: formatoCoordenada(local.longitud),
      usuarioId: local.asignadoA?.id ?? "",
      zonaId: local.zona?.id ?? "",
      radioMetros: local.radioMetros?.toString() ?? "",
      fechaVisita: isoAFechaInput(local.fechaVisita),
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
        latitud,
        longitud,
        usuarioId: form.usuarioId === "" ? null : form.usuarioId,
        zonaId: form.zonaId === "" ? null : form.zonaId,
        radioMetros,
        fechaVisita: fechaInputAIso(form.fechaVisita),
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

  if (cargando && !datos) {
    return <p className="text-sm text-zinc-400">Cargando locales...</p>;
  }

  if (errorCarga && !datos) {
    return <p className={errorBox}>{errorCarga}</p>;
  }

  const locales = datos?.items ?? [];

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {esGestor
            ? "Locales de tu empresa: crealos con el mapa y asignalos a tu equipo."
            : "Estos son los locales que te asignó tu líder."}
        </p>
        {esGestor && (
          <button type="button" onClick={abrirNuevo} className={btnPrimary}>
            + Nuevo local
          </button>
        )}
      </div>

      {errorCarga && <p className={`${errorBox} mt-4`}>{errorCarga}</p>}

      {locales.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {esGestor
              ? "Todavía no hay locales cargados. Creá el primero con el botón «Nuevo local»."
              : "Todavía no tenés locales asignados."}
          </p>
        </div>
      ) : (
        <>
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
                        {formatoFecha(l.fechaVisita)}
                      </dd>
                    </div>
                  </div>
                </dl>

                {esGestor && (
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setChecklistDe(l)}
                      className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Checklist
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {l.tareasCount}
                      </span>
                    </button>
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

          <div className="mt-4 hidden overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="px-4 py-3 font-medium">Nombre</th>
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
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
                  >
                    <td className="px-4 py-3 font-medium">{l.nombre}</td>
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
                      {formatoFecha(l.fechaVisita)}
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
                            onClick={() => setChecklistDe(l)}
                            aria-label={`Checklist de ${l.nombre}`}
                            className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          >
                            Checklist
                            <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                              {l.tareasCount}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirEdicion(l)}
                            aria-label={`Editar ${l.nombre}`}
                            className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
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
                            className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-600/40 dark:text-zinc-400 dark:hover:bg-red-950 dark:hover:text-red-400"
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
              className={inputBase}
            >
              <option value="">Sin asignar</option>
              {asignables.map((u) => (
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
                  }))
                }
                className={inputBase}
              >
                <option value="">Sin zona</option>
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
            <label className={labelBase}>
              Próxima visita
              <input
                type="date"
                value={form.fechaVisita}
                onChange={(e) =>
                  setForm((f) => ({ ...f, fechaVisita: e.target.value }))
                }
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

      {/* Modal de checklist: al cerrar se refresca el listado (tareasCount pudo cambiar) */}
      {checklistDe && (
        <ModalChecklist
          local={checklistDe}
          onCerrar={() => {
            setChecklistDe(null);
            void cargar();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// Checklist de tareas de un local
// ============================================================

function ModalChecklist({
  local,
  onCerrar,
}: {
  local: Local;
  onCerrar: () => void;
}) {
  const [detalle, setDetalle] = useState<LocalDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutando, setMutando] = useState(false);
  // Confirmación inline de borrado: id de la tarea con los botones Sí/No visibles
  const [confirmandoId, setConfirmandoId] = useState<number | null>(null);
  const [avisoDesactivada, setAvisoDesactivada] = useState(false);

  const [nuevaDescripcion, setNuevaDescripcion] = useState("");
  const [nuevaRequiereFoto, setNuevaRequiereFoto] = useState(false);

  useEffect(() => {
    let vigente = true;
    apiFetch<LocalDetalle>(`/locales/${local.id}`)
      .then((data) => {
        if (vigente) setDetalle(data);
      })
      .catch((err) => {
        if (vigente) {
          setError(
            err instanceof ApiError
              ? err.message
              : "No se pudo cargar el checklist",
          );
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [local.id]);

  // Toda mutación re-lee el detalle para reflejar el estado real del servidor
  async function mutar(fn: () => Promise<unknown>): Promise<boolean> {
    if (mutando) return false;
    setError(null);
    setMutando(true);
    try {
      await fn();
      setDetalle(await apiFetch<LocalDetalle>(`/locales/${local.id}`));
      return true;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar el cambio",
      );
      return false;
    } finally {
      setMutando(false);
    }
  }

  function actualizarTarea(
    tareaId: number,
    cambios: Partial<Pick<TareaLocal, "requiereFoto" | "orden" | "activo">>,
  ) {
    void mutar(() =>
      apiFetch(`/locales/${local.id}/tareas/${tareaId}`, {
        method: "PATCH",
        body: JSON.stringify(cambios),
      }),
    );
  }

  function eliminarTarea(tareaId: number) {
    setConfirmandoId(null);
    void mutar(async () => {
      const res = await apiFetch<{ ok: boolean; desactivada: boolean }>(
        `/locales/${local.id}/tareas/${tareaId}`,
        { method: "DELETE" },
      );
      if (res.desactivada) {
        setAvisoDesactivada(true);
        // Aviso temporal: se oculta solo después de unos segundos
        setTimeout(() => setAvisoDesactivada(false), 6000);
      }
    });
  }

  async function agregarTarea(e: React.FormEvent) {
    e.preventDefault();
    const descripcion = nuevaDescripcion.trim();
    if (descripcion.length === 0 || mutando) return;
    // La nueva tarea va al final del checklist
    const orden =
      (detalle?.tareas ?? []).reduce((max, t) => Math.max(max, t.orden), 0) + 1;
    const ok = await mutar(() =>
      apiFetch(`/locales/${local.id}/tareas`, {
        method: "POST",
        body: JSON.stringify({
          descripcion,
          requiereFoto: nuevaRequiereFoto,
          orden,
        }),
      }),
    );
    if (ok) {
      setNuevaDescripcion("");
      setNuevaRequiereFoto(false);
    }
  }

  const tareas = detalle?.tareas ?? [];

  return (
    <Modal
      titulo={`Checklist — ${local.nombre}`}
      abierto
      onCerrar={onCerrar}
      ancho="lg"
    >
      {error && <p className={`${errorBox} mb-3`}>{error}</p>}
      {avisoDesactivada && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          La tarea tenía respuestas de visitas: se desactivó en lugar de
          borrarse.
        </p>
      )}

      {cargando ? (
        <p className="text-sm text-zinc-400">Cargando checklist...</p>
      ) : detalle === null ? null : tareas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Este local todavía no tiene tareas. Agregá la primera acá abajo.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {tareas.map((t) => (
            <li
              key={t.id}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <p
                className={`text-sm ${
                  t.activo
                    ? "text-zinc-800 dark:text-zinc-100"
                    : "text-zinc-400 line-through dark:text-zinc-500"
                }`}
              >
                {t.descripcion}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <label className="flex h-8 cursor-pointer items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                  <input
                    type="checkbox"
                    checked={t.requiereFoto}
                    disabled={mutando}
                    onChange={(e) =>
                      actualizarTarea(t.id, { requiereFoto: e.target.checked })
                    }
                    className="h-3.5 w-3.5 accent-brand-700 disabled:cursor-not-allowed"
                  />
                  📷 requiere foto
                </label>
                <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                  Orden
                  <input
                    // La key remonta el input cuando el servidor confirma otro orden
                    key={`${t.id}-${t.orden}`}
                    type="number"
                    defaultValue={t.orden}
                    min={0}
                    disabled={mutando}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (
                        e.target.value.trim() !== "" &&
                        Number.isInteger(n) &&
                        n >= 0 &&
                        n !== t.orden
                      ) {
                        actualizarTarea(t.id, { orden: n });
                      }
                    }}
                    className="w-16 rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </label>
                <button
                  type="button"
                  disabled={mutando}
                  onClick={() => actualizarTarea(t.id, { activo: !t.activo })}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-brand-600/40 disabled:cursor-not-allowed disabled:opacity-50 ${
                    t.activo
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
                      : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                  }`}
                >
                  {t.activo ? "Activa" : "Inactiva"}
                </button>
                <div className="ml-auto">
                  {confirmandoId === t.id ? (
                    <span className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
                      ¿Eliminar?
                      <button
                        type="button"
                        disabled={mutando}
                        onClick={() => eliminarTarea(t.id)}
                        className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-600/40 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmandoId(null)}
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={mutando}
                      onClick={() => setConfirmandoId(t.id)}
                      aria-label={`Eliminar tarea ${t.descripcion}`}
                      className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-600/40 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-red-950 dark:hover:text-red-400"
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
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!cargando && detalle !== null && (
        <form
          onSubmit={agregarTarea}
          className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            Nueva tarea
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={nuevaDescripcion}
              onChange={(e) => setNuevaDescripcion(e.target.value)}
              placeholder="Ej. Verificar exhibición en góndola"
              maxLength={300}
              className={`${inputBase} sm:flex-1`}
            />
            <label className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={nuevaRequiereFoto}
                onChange={(e) => setNuevaRequiereFoto(e.target.checked)}
                className="h-4 w-4 accent-brand-700"
              />
              📷 Foto
            </label>
            <button
              type="submit"
              disabled={mutando || nuevaDescripcion.trim().length === 0}
              className={btnPrimary}
            >
              Agregar
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onCerrar} className={btnGhost}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
