"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { apiSubirFoto, urlFotoVisita } from "@/lib/api-archivos";
import { obtenerUbicacion } from "@/lib/geolocalizacion";
import { Modal } from "@/components/modal";
import { btnPrimary, errorBox, inputBase } from "@/components/ui";
import { formatoFechaHora } from "@/utils/fechas";
import type { Visita, VisitaTarea } from "@/types/visita";

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

type EstadoFoto = "inactivo" | "subiendo" | "quitando";

// Widget compartido de foto (tareas y foto de presencia): sacar, repetir y quitar
function WidgetFoto({
  foto,
  estado,
  faltaRequerida,
  onSeleccion,
  onQuitar,
}: {
  foto: string | null;
  estado: EstadoFoto;
  faltaRequerida: boolean;
  onSeleccion: (archivo: File) => void;
  onQuitar: () => void;
}) {
  function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    // reset del input para poder volver a elegir el mismo archivo
    e.target.value = "";
    if (archivo) onSeleccion(archivo);
  }

  if (estado !== "inactivo") {
    return (
      <div className="flex h-11 items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Spinner />
        {estado === "subiendo" ? "Subiendo…" : "Quitando…"}
      </div>
    );
  }

  if (!foto) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus-within:ring-2 focus-within:ring-brand-600/40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={alElegir}
          />
          📷 Sacar foto
        </label>
        {faltaRequerida && (
          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            requerida
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Foto autenticada por cookie: next/image no puede optimizarla */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={urlFotoVisita(foto)}
        crossOrigin="use-credentials"
        alt="Foto de la visita"
        className="h-20 w-20 rounded-lg border border-zinc-200 object-cover dark:border-zinc-800"
      />
      <div className="flex gap-2">
        <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 focus-within:ring-2 focus-within:ring-brand-600/40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={alElegir}
          />
          Repetir
        </label>
        <button
          type="button"
          onClick={onQuitar}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-600/40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        >
          Quitar
        </button>
      </div>
    </div>
  );
}

export function VisitaActiva({
  visita: visitaInicial,
  onCerrar,
  onFinalizada,
}: {
  visita: Visita;
  onCerrar: () => void;
  onFinalizada: () => void;
}) {
  // La visita se va actualizando con la respuesta de cada endpoint
  const [visita, setVisita] = useState<Visita>(visitaInicial);
  const [comentariosAbiertos, setComentariosAbiertos] = useState<Set<number>>(
    () =>
      new Set(
        visitaInicial.tareas.filter((t) => t.comentario).map((t) => t.id),
      ),
  );
  const [borradores, setBorradores] = useState<Record<number, string>>({});
  const [tareaOcupada, setTareaOcupada] = useState<number | null>(null);
  const [fotoEnProceso, setFotoEnProceso] = useState<{
    clave: number | "presencia";
    accion: "subiendo" | "quitando";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [exito, setExito] = useState(false);

  const tareas = [...visita.tareas].sort((a, b) => a.orden - b.orden);
  const completadas = tareas.filter((t) => t.completada).length;
  const progreso =
    tareas.length === 0 ? 100 : Math.round((completadas / tareas.length) * 100);

  const pendientes: string[] = [];
  for (const t of tareas) {
    if (!t.completada) pendientes.push(`Completar «${t.descripcion}»`);
    if (t.requiereFoto && !t.foto)
      pendientes.push(`Sacar la foto de «${t.descripcion}»`);
  }
  if (visita.requiereFotoPresencia && !visita.fotoPresencia) {
    pendientes.push("Sacar la foto de presencia");
  }

  function estadoFoto(clave: number | "presencia"): EstadoFoto {
    if (fotoEnProceso?.clave !== clave) return "inactivo";
    return fotoEnProceso.accion;
  }

  async function alternarTarea(t: VisitaTarea) {
    if (tareaOcupada !== null) return;
    setError(null);
    setTareaOcupada(t.id);
    try {
      setVisita(
        await apiFetch<Visita>(`/visitas/${visita.id}/tareas/${t.id}`, {
          method: "PATCH",
          body: JSON.stringify({ completada: !t.completada }),
        }),
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo actualizar la tarea",
      );
    } finally {
      setTareaOcupada(null);
    }
  }

  async function guardarComentario(t: VisitaTarea) {
    const borrador = borradores[t.id];
    if (borrador === undefined) return; // sin cambios
    const texto = borrador.trim();
    if (texto === (t.comentario ?? "")) return;
    try {
      setVisita(
        await apiFetch<Visita>(`/visitas/${visita.id}/tareas/${t.id}`, {
          method: "PATCH",
          body: JSON.stringify({ comentario: texto === "" ? null : texto }),
        }),
      );
      setBorradores((b) => {
        const resto = { ...b };
        delete resto[t.id];
        return resto;
      });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar el comentario",
      );
    }
  }

  async function subirFotoTarea(t: VisitaTarea, archivo: File) {
    if (fotoEnProceso) return;
    setError(null);
    setFotoEnProceso({ clave: t.id, accion: "subiendo" });
    try {
      setVisita(
        await apiSubirFoto<Visita>(
          `/visitas/${visita.id}/tareas/${t.id}/foto`,
          archivo,
        ),
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo subir la foto",
      );
    } finally {
      setFotoEnProceso(null);
    }
  }

  async function quitarFotoTarea(t: VisitaTarea) {
    if (fotoEnProceso) return;
    setError(null);
    setFotoEnProceso({ clave: t.id, accion: "quitando" });
    try {
      const actualizada = await apiFetch<Visita>(
        `/visitas/${visita.id}/tareas/${t.id}/foto`,
        { method: "DELETE" },
      );
      if (actualizada) setVisita(actualizada);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo quitar la foto",
      );
    } finally {
      setFotoEnProceso(null);
    }
  }

  async function subirFotoPresencia(archivo: File) {
    if (fotoEnProceso) return;
    setError(null);
    setFotoEnProceso({ clave: "presencia", accion: "subiendo" });
    try {
      setVisita(
        await apiSubirFoto<Visita>(
          `/visitas/${visita.id}/foto-presencia`,
          archivo,
        ),
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo subir la foto",
      );
    } finally {
      setFotoEnProceso(null);
    }
  }

  async function quitarFotoPresencia() {
    if (fotoEnProceso) return;
    setError(null);
    setFotoEnProceso({ clave: "presencia", accion: "quitando" });
    try {
      const actualizada = await apiFetch<Visita>(
        `/visitas/${visita.id}/foto-presencia`,
        { method: "DELETE" },
      );
      if (actualizada) setVisita(actualizada);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo quitar la foto",
      );
    } finally {
      setFotoEnProceso(null);
    }
  }

  async function finalizar() {
    if (finalizando) return;
    setError(null);
    setFinalizando(true);
    try {
      const ubicacion = await obtenerUbicacion();
      setVisita(
        await apiFetch<Visita>(`/visitas/${visita.id}/finalizar`, {
          method: "POST",
          body: JSON.stringify({
            latitud: ubicacion.latitud,
            longitud: ubicacion.longitud,
          }),
        }),
      );
      setExito(true);
    } catch (err) {
      // los errores de geolocalización ya vienen en español
      setError(
        err instanceof Error ? err.message : "No se pudo registrar la visita",
      );
    } finally {
      setFinalizando(false);
    }
  }

  return (
    <Modal
      titulo={`Visita: ${visita.localNombre}`}
      abierto
      onCerrar={exito ? onFinalizada : onCerrar}
      ancho="xl"
    >
      {exito ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-950">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-9 w-9 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="mt-2 text-xl font-bold tracking-tight">
            Visita registrada
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {formatoFechaHora(visita.completadaEn)}
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            a {Math.round(visita.distanciaMetros)} m del local
          </p>
          <button
            type="button"
            onClick={onFinalizada}
            className={`${btnPrimary} mt-4 h-11 w-full sm:w-auto sm:min-w-40`}
          >
            Listo
          </button>
        </div>
      ) : (
        <div>
          {/* Cabecera: datos del inicio y progreso del checklist */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-zinc-500 [font-variant-numeric:tabular-nums] dark:text-zinc-400">
              <span>Iniciada {formatoFechaHora(visita.iniciadaEn)}</span>
              <span>a {Math.round(visita.distanciaMetros)} m del local</span>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-300">
                <span>Checklist</span>
                <span className="[font-variant-numeric:tabular-nums]">
                  {completadas}/{tareas.length}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </div>
          </div>

          {/* Checklist de tareas */}
          {tareas.length > 0 && (
            <ul className="mt-4 flex flex-col gap-3">
              {tareas.map((t) => (
                <li
                  key={t.id}
                  className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
                >
                  <label className="flex min-h-11 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={t.completada}
                      disabled={tareaOcupada === t.id}
                      onChange={() => alternarTarea(t)}
                      className="h-5 w-5 shrink-0 cursor-pointer accent-brand-700 disabled:cursor-not-allowed"
                    />
                    <span
                      className={`text-sm ${
                        t.completada
                          ? "text-zinc-400 line-through dark:text-zinc-500"
                          : "text-zinc-800 dark:text-zinc-100"
                      }`}
                    >
                      {t.descripcion}
                    </span>
                  </label>

                  {comentariosAbiertos.has(t.id) ? (
                    <textarea
                      value={borradores[t.id] ?? t.comentario ?? ""}
                      onChange={(e) =>
                        setBorradores((b) => ({
                          ...b,
                          [t.id]: e.target.value,
                        }))
                      }
                      onBlur={() => guardarComentario(t)}
                      rows={2}
                      placeholder="Escribí un comentario…"
                      className={`${inputBase} mt-2 resize-y`}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setComentariosAbiertos((s) => new Set(s).add(t.id))
                      }
                      className="mt-1 rounded text-xs font-medium text-brand-700 transition hover:underline focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:text-brand-300"
                    >
                      + comentario
                    </button>
                  )}

                  {t.requiereFoto && (
                    <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <WidgetFoto
                        foto={t.foto}
                        estado={estadoFoto(t.id)}
                        faltaRequerida={!t.foto}
                        onSeleccion={(archivo) => subirFotoTarea(t, archivo)}
                        onQuitar={() => quitarFotoTarea(t)}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Foto de presencia: siempre visible (opcional si no es requerida) */}
          <div className="mt-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              Foto de presencia{" "}
              <span className="font-normal text-zinc-400 dark:text-zinc-500">
                {visita.requiereFotoPresencia ? "(requerida)" : "(opcional)"}
              </span>
            </h3>
            <div className="mt-3">
              <WidgetFoto
                foto={visita.fotoPresencia}
                estado={estadoFoto("presencia")}
                faltaRequerida={
                  visita.requiereFotoPresencia && !visita.fotoPresencia
                }
                onSeleccion={subirFotoPresencia}
                onQuitar={quitarFotoPresencia}
              />
            </div>
          </div>

          {pendientes.length > 0 && (
            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <p className="font-medium">Te falta:</p>
              <ul className="mt-1 list-inside list-disc">
                {pendientes.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className={`${errorBox} mt-4`}>{error}</p>}

          {/* Siempre habilitado: la validación final la hace el backend */}
          <button
            type="button"
            onClick={finalizar}
            disabled={finalizando}
            className={`${btnPrimary} mt-5 h-12 w-full gap-2 text-base`}
          >
            {finalizando ? (
              <>
                <Spinner />
                Verificando ubicación…
              </>
            ) : (
              "Registrar visita ✓"
            )}
          </button>
        </div>
      )}
    </Modal>
  );
}
