"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { PantallaCarga } from "@/components/pantalla-carga";
import { Paginacion } from "@/components/paginacion";
import { useRutaDiaria } from "@/components/repositor/ruta-diaria-contexto";
import { useToast } from "@/components/toast/toast-provider";
import { ApiError, apiFetch } from "@/lib/api";
import { obtenerUbicacion } from "@/lib/geolocalizacion";
import type { RespuestaPaginada } from "@/types/paginacion";
import type { TareasLocalRepositor } from "@/types/repositor";
import type { Visita } from "@/types/visita";

const VisitaActiva = dynamic(
  () =>
    import("@/components/impulsador/visita-activa").then(
      (modulo) => modulo.VisitaActiva,
    ),
  { ssr: false },
);

export function RepositorTareasView() {
  const { invalidarRuta } = useRutaDiaria();
  const { cerrarToastPorClave, mostrarToast } = useToast();
  const [respuesta, setRespuesta] =
    useState<RespuestaPaginada<TareasLocalRepositor> | null>(null);
  const [pagina, setPagina] = useState(1);
  const [limite, setLimite] = useState(7);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refresco, setRefresco] = useState(0);
  const [iniciandoLocalId, setIniciandoLocalId] = useState<number | null>(null);
  const [visita, setVisita] = useState<Visita | null>(null);

  useEffect(() => {
    let vigente = true;
    apiFetch<RespuestaPaginada<TareasLocalRepositor>>(
      `/repositor/tareas?page=${pagina}&limit=${limite}`,
    )
      .then((datos) => {
        if (vigente) {
          setRespuesta(datos);
          setError(null);
        }
      })
      .catch((problema) => {
        if (vigente)
          setError(
            problema instanceof ApiError
              ? problema.message
              : "No pudimos cargar tus tareas",
          );
      });
    return () => {
      vigente = false;
    };
  }, [limite, pagina, refresco]);

  async function abrirVisita(grupo: TareasLocalRepositor) {
    if (iniciandoLocalId !== null || grupo.visitaCompletadaHoy) return;
    cerrarToastPorClave("inicio-visita");
    setIniciandoLocalId(grupo.local.id);
    try {
      if (grupo.visitaAbiertaId !== null) {
        setVisita(await apiFetch<Visita>(`/visitas/${grupo.visitaAbiertaId}`));
      } else {
        const posicion = await obtenerUbicacion({ maximumAge: 0 });
        setVisita(
          await apiFetch<Visita>("/visitas", {
            method: "POST",
            body: JSON.stringify({
              localId: grupo.local.id,
              latitud: posicion.latitud,
              longitud: posicion.longitud,
              precisionMetros: posicion.precision,
            }),
          }),
        );
        mostrarToast({
          tipo: "exito",
          clave: "inicio-visita",
          titulo: "Visita iniciada",
          mensaje: `Ya podés completar las tareas de ${grupo.local.nombre}.`,
        });
      }
      invalidarRuta();
    } catch (problema) {
      mostrarToast({
        tipo: "error",
        clave: "inicio-visita",
        titulo: "No se pudo iniciar la visita",
        mensaje:
          problema instanceof Error
            ? problema.message
            : "No pudimos iniciar la visita",
      });
    } finally {
      setIniciandoLocalId(null);
    }
  }

  function refrescarTareas() {
    setVisita(null);
    setAbierto(null);
    setRespuesta(null);
    setRefresco((actual) => actual + 1);
  }

  function visitaFinalizada() {
    invalidarRuta();
    refrescarTareas();
  }

  return (
    <div
      className="space-y-4 sm:space-y-5"
      aria-busy={iniciandoLocalId !== null}
    >
      <section className="relative overflow-hidden rounded-2xl border border-brand-800 bg-commercial-ink p-4 text-white shadow-[0_16px_40px_rgba(var(--warm-shadow),0.18)] sm:p-5">
        <div className="absolute right-5 top-4 h-20 w-20 rounded-full border-[14px] border-accent/20" />
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-on-ink sm:text-[11px]">
            Checklist operativo
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
            Mis tareas
          </h1>
          <p className="mt-1 max-w-xl text-xs text-white/80 sm:text-sm">
            Iniciá la visita del local, resolvé sus tareas y registrá la
            evidencia desde un solo lugar.
          </p>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : respuesta === null ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800"
            />
          ))}
        </div>
      ) : respuesta.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface-raised p-10 text-center text-sm text-muted">
          No hay tareas porque todavía no tenés locales asignados.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {respuesta.items.map((grupo) => {
              const expandido = abierto === grupo.local.id;
              const total = grupo.tareas.length;
              const progreso = grupo.visitaCompletadaHoy
                ? 100
                : total === 0
                  ? 0
                  : Math.round((grupo.completadasEnVisita / total) * 100);
              const visitaEnCurso = grupo.visitaAbiertaId !== null;
              const deshabilitado = grupo.visitaCompletadaHoy;
              return (
                <article
                  key={grupo.local.id}
                  className={`overflow-hidden rounded-2xl border bg-surface-raised shadow-[0_10px_30px_rgba(var(--warm-shadow),0.05)] ${
                    deshabilitado
                      ? "border-brand-200 opacity-70 dark:border-brand-900"
                      : visitaEnCurso
                        ? "border-accent"
                        : "border-line"
                  }`}
                >
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
                    <button
                      type="button"
                      onClick={() =>
                        setAbierto(expandido ? null : grupo.local.id)
                      }
                      aria-expanded={expandido}
                      aria-controls={`tareas-local-${grupo.local.id}`}
                      disabled={deshabilitado}
                      className="flex min-h-20 min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition hover:bg-surface-soft active:bg-[var(--accent-soft)] focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-70 sm:pr-3"
                    >
                      <div
                        className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl font-black ${
                          deshabilitado
                            ? "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200"
                            : "bg-[var(--accent-soft)] text-accent-ink"
                        }`}
                      >
                        {deshabilitado ? "✓" : total}
                        {visitaEnCurso ? (
                          <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-brand-600 ring-4 ring-surface-raised" />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold uppercase tracking-wide text-accent-ink">
                          {grupo.local.cliente.nombre}
                        </p>
                        <h2 className="truncate font-extrabold text-foreground">
                          {grupo.local.nombre}
                        </h2>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-soft">
                          <div
                            style={{ width: `${progreso}%` }}
                            className={`h-full rounded-full ${
                              deshabilitado ? "bg-brand-600" : "bg-accent"
                            }`}
                          />
                        </div>
                        <p className="mt-1 text-[11px] font-semibold text-muted">
                          {deshabilitado
                            ? "Visita completada hoy"
                            : visitaEnCurso
                              ? `${grupo.completadasEnVisita}/${total} tareas completadas`
                              : `${total} ${total === 1 ? "tarea pendiente" : "tareas pendientes"}`}
                        </p>
                      </div>
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className={`h-5 w-5 shrink-0 text-muted transition-transform ${
                          expandido ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => void abrirVisita(grupo)}
                      disabled={deshabilitado || iniciandoLocalId !== null}
                      className={`inline-flex min-h-11 items-center justify-center whitespace-nowrap rounded-xl px-4 text-sm font-extrabold transition active:translate-y-px focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0 ${
                        deshabilitado
                          ? "border border-line bg-surface-soft text-muted"
                          : visitaEnCurso
                            ? "bg-accent text-brand-950 hover:brightness-105"
                            : "bg-brand-700 text-white hover:bg-brand-800"
                      }`}
                    >
                      {deshabilitado
                        ? "Completada"
                        : iniciandoLocalId === grupo.local.id
                          ? "Verificando GPS…"
                          : visitaEnCurso
                            ? "Continuar visita"
                            : "Iniciar visita"}
                    </button>
                  </div>

                  {expandido && !deshabilitado ? (
                    <div
                      id={`tareas-local-${grupo.local.id}`}
                      className="border-t border-line"
                    >
                      <ul className="divide-y divide-line px-4 sm:px-5">
                        {grupo.tareas.length === 0 ? (
                          <li className="text-sm text-muted">
                            Este cliente no tiene tareas activas.
                          </li>
                        ) : (
                          grupo.tareas.map((tarea, posicion) => (
                            <li key={tarea.id} className="flex gap-3 py-3.5">
                              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 border-accent text-xs font-black text-accent-ink">
                                {posicion + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-bold">
                                  {tarea.titulo}
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted">
                                  {tarea.descripcion ||
                                    "Sin instrucciones adicionales"}
                                  {tarea.requiereFoto ? " · Requiere foto" : ""}
                                </p>
                              </div>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
          <Paginacion
            page={respuesta.page}
            totalPages={respuesta.totalPages}
            total={respuesta.total}
            limit={respuesta.limit}
            onPageChange={setPagina}
            onLimitChange={(valor) => {
              setLimite(valor);
              setPagina(1);
            }}
          />
        </>
      )}

      {visita ? (
        <VisitaActiva
          visita={visita}
          onCerrar={refrescarTareas}
          onFinalizada={visitaFinalizada}
        />
      ) : null}

      <PantallaCarga
        visible={iniciandoLocalId !== null}
        mensaje="Preparando la visita"
        detalle="Verificamos tu ubicación y cargamos las tareas del local."
      />
    </div>
  );
}
