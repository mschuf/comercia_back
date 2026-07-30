"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import {
  apiReportarNovedad,
  apiSubirFoto,
  urlFotoNovedad,
  urlFotoVisita,
} from "@/lib/api-archivos";
import { obtenerUbicacion } from "@/lib/geolocalizacion";
import { Modal } from "@/components/modal";
import { PantallaCarga } from "@/components/pantalla-carga";
import { btnPrimary, errorBox, inputBase } from "@/components/ui";
import { formatoFechaHora } from "@/utils/fechas";
import { formatoDuracionMinutos } from "@/utils/duracion";
import type { NovedadVisitaTarea, Visita, VisitaTarea } from "@/types/visita";

function Spinner() {
  return (
    <div className="h-4 w-4 animate-spin">
      <svg
        className="h-full w-full"
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
    </div>
  );
}

type EstadoFoto = "inactivo" | "subiendo" | "quitando";
const FOTO_MAX_BYTES = 8 * 1024 * 1024;
const FOTO_MIMETYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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
        <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-control-line bg-surface-raised px-4 text-sm font-medium text-foreground transition hover:bg-surface-soft focus-within:ring-2 focus-within:ring-focus">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
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
        <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-lg border border-control-line bg-surface-raised px-3 text-sm font-medium text-foreground transition hover:bg-surface-soft focus-within:ring-2 focus-within:ring-focus">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="sr-only"
            onChange={alElegir}
          />
          Repetir
        </label>
        <button
          type="button"
          onClick={onQuitar}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-red-300 bg-surface-raised px-3 text-sm font-medium text-red-700 transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-600 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
        >
          Quitar
        </button>
      </div>
    </div>
  );
}

function FormularioNovedad({
  tareaId,
  enviando,
  onCancelar,
  onEnviar,
}: {
  tareaId: number;
  enviando: boolean;
  onCancelar: () => void;
  onEnviar: (comentario: string, foto: File) => Promise<string | null>;
}) {
  const [comentario, setComentario] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!archivo) return;
    if (archivo.size > FOTO_MAX_BYTES) {
      setFoto(null);
      setPreview(null);
      setError("La foto no puede superar los 8 MB.");
      return;
    }
    if (!FOTO_MIMETYPES.has(archivo.type)) {
      setFoto(null);
      setPreview(null);
      setError("Usá una foto JPG, PNG o WebP.");
      return;
    }
    setFoto(archivo);
    setPreview(URL.createObjectURL(archivo));
    setError(null);
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (enviando) return;

    const texto = comentario.trim();
    if (!texto) {
      setError("Contá qué pasó para que tu supervisor tenga el contexto.");
      return;
    }
    if (!foto) {
      setError("Adjuntá una foto como evidencia de la novedad.");
      return;
    }

    setError(null);
    const errorEnvio = await onEnviar(texto, foto);
    if (errorEnvio) setError(errorEnvio);
  }

  return (
    <form
      id={`novedad-tarea-${tareaId}`}
      onSubmit={enviar}
      noValidate
      className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/50"
    >
      <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
        Reportar una novedad
      </h4>
      <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
        Explicá qué impidió completar bien la tarea y adjuntá una foto.
      </p>

      <label
        htmlFor={`comentario-novedad-${tareaId}`}
        className="mt-3 block text-xs font-medium text-amber-950 dark:text-amber-100"
      >
        ¿Qué pasó? <span aria-hidden>*</span>
      </label>
      <textarea
        id={`comentario-novedad-${tareaId}`}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        rows={3}
        maxLength={500}
        required
        autoFocus
        disabled={enviando}
        placeholder="Ej.: el local estaba cerrado y no pude realizar la exhibición…"
        className={`${inputBase} mt-2 resize-y disabled:cursor-not-allowed disabled:opacity-60`}
      />
      <span className="mt-1 block text-right text-xs text-amber-700 dark:text-amber-300">
        {comentario.length}/500
      </span>

      <div className="mt-3">
        <span className="block text-xs font-medium text-amber-950 dark:text-amber-100">
          Foto de la novedad <span aria-hidden>*</span>
        </span>
        <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-amber-400 bg-white px-4 text-sm font-medium text-amber-900 transition hover:bg-amber-100 focus-within:ring-2 focus-within:ring-amber-600 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 dark:hover:bg-amber-900">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            required={!foto}
            disabled={enviando}
            className="sr-only"
            onChange={elegirFoto}
          />
          {foto ? "Cambiar foto" : "📷 Sacar foto"}
        </label>
      </div>

      {preview ? (
        <div className="mt-3">
          {/* Preview local; no sale del dispositivo hasta enviar el formulario. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Vista previa de la evidencia"
            className="h-32 w-full rounded-lg border border-amber-300 object-cover sm:w-48 dark:border-amber-800"
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className={`${errorBox} mt-3`}>
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancelar}
          disabled={enviando}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-control-line bg-surface-raised px-4 text-sm font-medium text-foreground transition hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={enviando}
          className={`${btnPrimary} min-h-11 disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {enviando ? "Enviando…" : "Enviar novedad"}
        </button>
      </div>
    </form>
  );
}

function NovedadReportada({ novedad }: { novedad: NovedadVisitaTarea }) {
  return (
    <div
      className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/50"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
          Novedad enviada
        </p>
        <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900 dark:text-amber-100">
          Gestionada
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-amber-950 dark:text-amber-100">
        {novedad.comentario}
      </p>
      {/* Foto autenticada por cookie: next/image no puede optimizarla */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={urlFotoNovedad(novedad.id)}
        crossOrigin="use-credentials"
        loading="lazy"
        alt="Evidencia de la novedad reportada"
        className="mt-3 h-32 w-full rounded-lg border border-amber-300 object-cover sm:w-48 dark:border-amber-800"
      />
      <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
        Reportada {formatoFechaHora(novedad.reportadaEn)}.{" "}
        {novedad.leidaEn
          ? `Tu supervisor la vio ${formatoFechaHora(novedad.leidaEn)}.`
          : "Tu supervisor ya fue notificado."}
      </p>
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
  const [descripcionesRealizadas, setDescripcionesRealizadas] = useState<
    Record<number, string>
  >({});
  const guardadosDescripcion = useRef(new Map<number, Promise<boolean>>());
  const [guardadosEnCurso, setGuardadosEnCurso] = useState(0);
  const [tareaOcupada, setTareaOcupada] = useState<number | null>(null);
  const [fotoEnProceso, setFotoEnProceso] = useState<{
    clave: number | "presencia";
    accion: "subiendo" | "quitando";
  } | null>(null);
  const [novedadAbierta, setNovedadAbierta] = useState<number | null>(null);
  const [novedadEnProceso, setNovedadEnProceso] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [exito, setExito] = useState(false);

  const tareas = visita.tareas
    .filter((tarea) => tarea.activa)
    .sort((a, b) => a.orden - b.orden);
  const gestionadas = tareas.filter(
    (tarea) => tarea.completada || tarea.novedad !== null,
  ).length;
  const progreso =
    tareas.length === 0 ? 100 : Math.round((gestionadas / tareas.length) * 100);

  const pendientes: string[] = [];
  for (const t of tareas) {
    if (t.novedad) continue;
    if (!t.completada) {
      pendientes.push(`Completar «${t.titulo}»`);
      continue;
    }
    if (t.requiereFoto && !t.foto) {
      pendientes.push(`Sacar la foto de «${t.titulo}»`);
    }
  }
  if (visita.requiereFotoPresencia && !visita.fotoPresencia) {
    pendientes.push("Sacar la foto de presencia");
  }

  function estadoFoto(clave: number | "presencia"): EstadoFoto {
    if (fotoEnProceso?.clave !== clave) return "inactivo";
    return fotoEnProceso.accion;
  }

  function aplicarCambiosTarea(tareaId: number, cambios: Partial<VisitaTarea>) {
    setVisita((actual) => ({
      ...actual,
      tareas: actual.tareas.map((tarea) =>
        tarea.id === tareaId ? { ...tarea, ...cambios } : tarea,
      ),
    }));
  }

  async function alternarTarea(t: VisitaTarea) {
    if (tareaOcupada !== null || t.novedad) return;
    setError(null);
    setTareaOcupada(t.id);
    try {
      const actualizada = await apiFetch<VisitaTarea>(
        `/visitas/${visita.id}/tareas/${t.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ completada: !t.completada }),
        },
      );
      aplicarCambiosTarea(t.id, {
        completada: actualizada.completada,
        completadaEn: actualizada.completadaEn,
      });
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

  function guardarDescripcionRealizada(t: VisitaTarea): Promise<boolean> {
    if (t.novedad) return Promise.resolve(true);
    const guardadoExistente = guardadosDescripcion.current.get(t.id);
    if (guardadoExistente) return guardadoExistente;

    const borrador = descripcionesRealizadas[t.id];
    if (borrador === undefined) return Promise.resolve(true); // sin cambios
    const texto = borrador.trim();
    if (texto === (t.comentario ?? "")) return Promise.resolve(true);
    setError(null);
    setGuardadosEnCurso((cantidad) => cantidad + 1);

    const guardado = apiFetch<VisitaTarea>(
      `/visitas/${visita.id}/tareas/${t.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ comentario: texto === "" ? null : texto }),
      },
    )
      .then((actualizada) => {
        aplicarCambiosTarea(t.id, { comentario: actualizada.comentario });
        setDescripcionesRealizadas((actuales) => {
          if (actuales[t.id] !== borrador) return actuales;
          const resto = { ...actuales };
          delete resto[t.id];
          return resto;
        });
        return true;
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudo guardar la descripción de lo realizado",
        );
        return false;
      })
      .finally(() => {
        setGuardadosEnCurso((cantidad) => Math.max(0, cantidad - 1));
        if (guardadosDescripcion.current.get(t.id) === guardado) {
          guardadosDescripcion.current.delete(t.id);
        }
      });

    guardadosDescripcion.current.set(t.id, guardado);
    return guardado;
  }

  async function subirFotoTarea(t: VisitaTarea, archivo: File) {
    if (fotoEnProceso || t.novedad) return;
    setError(null);
    setFotoEnProceso({ clave: t.id, accion: "subiendo" });
    try {
      const actualizada = await apiSubirFoto<VisitaTarea>(
        `/visitas/${visita.id}/tareas/${t.id}/foto`,
        archivo,
      );
      aplicarCambiosTarea(t.id, { foto: actualizada.foto });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "No se pudo subir la foto",
      );
    } finally {
      setFotoEnProceso(null);
    }
  }

  async function quitarFotoTarea(t: VisitaTarea) {
    if (fotoEnProceso || t.novedad) return;
    setError(null);
    setFotoEnProceso({ clave: t.id, accion: "quitando" });
    try {
      const actualizada = await apiFetch<VisitaTarea>(
        `/visitas/${visita.id}/tareas/${t.id}/foto`,
        { method: "DELETE" },
      );
      aplicarCambiosTarea(t.id, { foto: actualizada.foto });
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

  async function reportarNovedad(
    t: VisitaTarea,
    comentario: string,
    foto: File,
  ): Promise<string | null> {
    if (novedadEnProceso !== null || t.novedad) {
      return "La novedad ya se está procesando.";
    }
    setError(null);
    setNovedadEnProceso(t.id);
    try {
      const actualizada = await apiReportarNovedad<VisitaTarea>(
        `/visitas/${visita.id}/tareas/${t.id}/novedad`,
        comentario,
        foto,
      );
      aplicarCambiosTarea(t.id, actualizada);
      setDescripcionesRealizadas((actuales) => {
        const resto = { ...actuales };
        delete resto[t.id];
        return resto;
      });
      setNovedadAbierta(null);
      return null;
    } catch (err) {
      const mensaje =
        err instanceof ApiError
          ? err.message
          : "No se pudo enviar la novedad al supervisor";
      setError(mensaje);
      return mensaje;
    } finally {
      setNovedadEnProceso(null);
    }
  }

  async function finalizar() {
    if (finalizando) return;
    setError(null);
    setFinalizando(true);
    try {
      const descripcionesGuardadas = await Promise.all(
        tareas
          .filter((tarea) => tarea.novedad === null)
          .map(guardarDescripcionRealizada),
      );
      if (descripcionesGuardadas.some((guardada) => !guardada)) return;

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

  const cargaActiva = finalizando
    ? {
        mensaje: "Terminando visita",
        detalle: "Guardamos la hora final, la ubicación y el checklist.",
      }
    : novedadEnProceso !== null
      ? {
          mensaje: "Enviando novedad",
          detalle: "Notificamos a tu supervisor y guardamos la evidencia.",
        }
      : fotoEnProceso !== null
        ? {
            mensaje:
              fotoEnProceso.accion === "subiendo"
                ? "Subiendo foto"
                : "Quitando foto",
            detalle: "Actualizamos la evidencia de esta visita.",
          }
        : tareaOcupada !== null
          ? {
              mensaje: "Actualizando tarea",
              detalle: "Guardamos el nuevo estado del checklist.",
            }
          : guardadosEnCurso > 0
            ? {
                mensaje: "Guardando descripción",
                detalle: "Registramos el trabajo realizado en la tarea.",
              }
            : null;

  return (
    <>
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
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              Duración: {formatoDuracionMinutos(visita.duracionMinutos)}
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
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-zinc-500 [font-variant-numeric:tabular-nums] dark:text-zinc-400">
                <span>Iniciada {formatoFechaHora(visita.iniciadaEn)}</span>
                <span>a {Math.round(visita.distanciaMetros)} m del local</span>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  <span>Checklist</span>
                  <span className="[font-variant-numeric:tabular-nums]">
                    {gestionadas}/{tareas.length}
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
                    className={`rounded-xl border p-3 ${
                      t.novedad
                        ? "border-amber-300 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/20"
                        : "border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    <label
                      className={`flex min-h-11 items-center gap-3 ${
                        t.novedad ? "cursor-default" : "cursor-pointer"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={t.completada}
                        disabled={
                          tareaOcupada === t.id ||
                          t.novedad !== null ||
                          novedadAbierta === t.id
                        }
                        onChange={() => alternarTarea(t)}
                        className="h-5 w-5 shrink-0 cursor-pointer accent-brand-700 disabled:cursor-not-allowed"
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-sm font-semibold ${
                            t.novedad
                              ? "text-amber-900 dark:text-amber-100"
                              : t.completada
                                ? "text-zinc-400 line-through dark:text-zinc-500"
                                : "text-zinc-800 dark:text-zinc-100"
                          }`}
                        >
                          {t.titulo}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                          {t.descripcion}
                        </span>
                      </span>
                    </label>

                    {t.novedad ? (
                      <NovedadReportada novedad={t.novedad} />
                    ) : (
                      <>
                        <label
                          htmlFor={`descripcion-realizada-${t.id}`}
                          className="mt-3 block text-xs font-medium text-zinc-700 dark:text-zinc-300"
                        >
                          Descripción de lo realizado{" "}
                          <span className="font-normal text-zinc-400 dark:text-zinc-500">
                            (opcional)
                          </span>
                          <textarea
                            id={`descripcion-realizada-${t.id}`}
                            value={
                              descripcionesRealizadas[t.id] ??
                              t.comentario ??
                              ""
                            }
                            onChange={(e) =>
                              setDescripcionesRealizadas((actuales) => ({
                                ...actuales,
                                [t.id]: e.target.value,
                              }))
                            }
                            onBlur={() => {
                              void guardarDescripcionRealizada(t);
                            }}
                            rows={2}
                            maxLength={500}
                            disabled={novedadAbierta === t.id}
                            placeholder="Contá brevemente qué hiciste en esta tarea…"
                            className={`${inputBase} mt-2 resize-y disabled:cursor-not-allowed disabled:opacity-60`}
                          />
                          <span className="mt-1 block font-normal text-zinc-400 dark:text-zinc-500">
                            Se guarda al salir del campo.
                          </span>
                        </label>

                        {t.requiereFoto && novedadAbierta !== t.id ? (
                          <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                            <WidgetFoto
                              foto={t.foto}
                              estado={estadoFoto(t.id)}
                              faltaRequerida={!t.foto}
                              onSeleccion={(archivo) =>
                                subirFotoTarea(t, archivo)
                              }
                              onQuitar={() => quitarFotoTarea(t)}
                            />
                          </div>
                        ) : null}

                        {novedadAbierta === t.id ? (
                          <FormularioNovedad
                            tareaId={t.id}
                            enviando={novedadEnProceso === t.id}
                            onCancelar={() => setNovedadAbierta(null)}
                            onEnviar={(comentario, foto) =>
                              reportarNovedad(t, comentario, foto)
                            }
                          />
                        ) : !t.completada ? (
                          <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                            <button
                              type="button"
                              aria-expanded={false}
                              aria-controls={`novedad-tarea-${t.id}`}
                              onClick={() => {
                                setError(null);
                                setNovedadAbierta(t.id);
                              }}
                              disabled={
                                novedadAbierta !== null ||
                                novedadEnProceso !== null ||
                                fotoEnProceso !== null ||
                                tareaOcupada !== null
                              }
                              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200 dark:hover:bg-amber-900"
                            >
                              Reportar novedad
                            </button>
                          </div>
                        ) : null}
                      </>
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

            {pendientes.length === 0 ? (
              <button
                type="button"
                onClick={finalizar}
                disabled={
                  finalizando ||
                  fotoEnProceso !== null ||
                  novedadAbierta !== null ||
                  novedadEnProceso !== null
                }
                className={`${btnPrimary} mt-5 h-12 w-full gap-2 text-base`}
              >
                {finalizando ? (
                  <>
                    <Spinner />
                    Guardando hora de finalización…
                  </>
                ) : (
                  "Terminar visita"
                )}
              </button>
            ) : null}
          </div>
        )}
      </Modal>
      <PantallaCarga
        visible={cargaActiva !== null}
        mensaje={cargaActiva?.mensaje ?? "Procesando visita"}
        detalle={cargaActiva?.detalle}
      />
    </>
  );
}
