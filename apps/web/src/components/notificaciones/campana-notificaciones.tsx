"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { EVENTO_NOTIFICACIONES_ACTUALIZADAS } from "@/lib/eventos-notificaciones";
import type { NotificacionNovedad } from "@/types/notificacion";
import type { RespuestaPaginada } from "@/types/paginacion";

interface CampanaNotificacionesProps {
  habilitada: boolean;
}

const INTERVALO_ACTUALIZACION_MS = 30_000;
const LIMITE_RECIENTES = 7;
const MAXIMO_PAGINAS_PRESERVADAS = Math.floor(50 / LIMITE_RECIENTES);

export function CampanaNotificaciones({
  habilitada,
}: CampanaNotificacionesProps) {
  const router = useRouter();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const actualizandoRef = useRef(false);
  const [abierta, setAbierta] = useState(false);
  const [notificaciones, setNotificaciones] = useState<NotificacionNovedad[]>(
    [],
  );
  const [noLeidas, setNoLeidas] = useState(0);
  const [total, setTotal] = useState(0);
  const [paginaCargada, setPaginaCargada] = useState(1);
  const [cargandoRecientes, setCargandoRecientes] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorRecientes, setErrorRecientes] = useState(false);

  const actualizar = useCallback(async () => {
    if (
      !habilitada ||
      document.visibilityState !== "visible" ||
      actualizandoRef.current
    ) {
      return;
    }

    actualizandoRef.current = true;
    setCargandoRecientes(true);
    const paginasPreservadas = Math.min(
      paginaCargada,
      MAXIMO_PAGINAS_PRESERVADAS,
    );
    const limite = paginasPreservadas * LIMITE_RECIENTES;

    const recientes = apiFetch<RespuestaPaginada<NotificacionNovedad>>(
      `/notificaciones?page=1&limit=${limite}`,
    )
      .then((respuesta) => {
        setNotificaciones(respuesta.items);
        setTotal(respuesta.total);
        setPaginaCargada(paginasPreservadas);
        setErrorRecientes(false);
      })
      .catch(() => {
        setErrorRecientes(true);
      })
      .finally(() => {
        setCargandoRecientes(false);
      });

    const resumen = apiFetch<{ noLeidas: number }>("/notificaciones/no-leidas")
      .then((respuesta) => {
        setNoLeidas(Math.max(0, respuesta.noLeidas));
      })
      .catch(() => undefined);

    await Promise.allSettled([recientes, resumen]);
    actualizandoRef.current = false;
  }, [habilitada, paginaCargada]);

  useEffect(() => {
    if (!habilitada) {
      return;
    }

    void actualizar();

    const intervalo = window.setInterval(() => {
      void actualizar();
    }, INTERVALO_ACTUALIZACION_MS);

    const alVolverAEstarVisible = () => {
      if (document.visibilityState === "visible") {
        void actualizar();
      }
    };
    const alRecuperarFoco = () => {
      void actualizar();
    };
    const alActualizarNotificaciones = () => {
      void actualizar();
    };

    document.addEventListener("visibilitychange", alVolverAEstarVisible);
    window.addEventListener("focus", alRecuperarFoco);
    window.addEventListener(
      EVENTO_NOTIFICACIONES_ACTUALIZADAS,
      alActualizarNotificaciones,
    );

    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolverAEstarVisible);
      window.removeEventListener("focus", alRecuperarFoco);
      window.removeEventListener(
        EVENTO_NOTIFICACIONES_ACTUALIZADAS,
        alActualizarNotificaciones,
      );
    };
  }, [actualizar, habilitada]);

  useEffect(() => {
    if (!abierta) {
      return;
    }

    const cerrarAlClickearFuera = (evento: MouseEvent | TouchEvent) => {
      if (!contenedorRef.current?.contains(evento.target as Node)) {
        setAbierta(false);
      }
    };
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setAbierta(false);
        botonRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", cerrarAlClickearFuera);
    document.addEventListener("touchstart", cerrarAlClickearFuera);
    document.addEventListener("keydown", cerrarConEscape);
    const fotograma = window.requestAnimationFrame(() => {
      const primeraNotificacion = panelRef.current?.querySelector<HTMLElement>(
        "[data-notificacion]",
      );
      (primeraNotificacion ?? panelRef.current)?.focus();
    });

    return () => {
      window.cancelAnimationFrame(fotograma);
      document.removeEventListener("mousedown", cerrarAlClickearFuera);
      document.removeEventListener("touchstart", cerrarAlClickearFuera);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [abierta]);

  if (!habilitada) {
    return null;
  }

  function alternarMenu() {
    setAbierta((valor) => !valor);
    if (!abierta) {
      void actualizar();
    }
  }

  function abrirNovedad(notificacion: NotificacionNovedad) {
    const parametros = new URLSearchParams({
      novedadId: String(notificacion.id),
      local: notificacion.local.nombre,
      repositor: notificacion.repositor.nombre,
    });
    setAbierta(false);
    router.push(`/panel/supervisor/tareas?${parametros.toString()}`);
  }

  async function cargarMasNotificaciones() {
    if (
      cargandoMas ||
      actualizandoRef.current ||
      notificaciones.length >= total
    ) {
      return;
    }
    actualizandoRef.current = true;
    setCargandoMas(true);
    setErrorRecientes(false);
    const pagina = paginaCargada + 1;
    try {
      const respuesta = await apiFetch<RespuestaPaginada<NotificacionNovedad>>(
        `/notificaciones?page=${pagina}&limit=${LIMITE_RECIENTES}`,
      );
      setNotificaciones((actuales) => {
        const ids = new Set(actuales.map((item) => item.id));
        return [
          ...actuales,
          ...respuesta.items.filter((item) => !ids.has(item.id)),
        ];
      });
      setTotal(respuesta.total);
      setPaginaCargada(pagina);
    } catch {
      setErrorRecientes(true);
    } finally {
      actualizandoRef.current = false;
      setCargandoMas(false);
    }
  }

  const etiquetaCantidad =
    noLeidas === 1 ? "1 sin leer" : `${noLeidas} sin leer`;

  return (
    <div ref={contenedorRef} className="relative">
      <button
        ref={botonRef}
        type="button"
        onClick={alternarMenu}
        aria-label={`Notificaciones, ${etiquetaCantidad}`}
        aria-haspopup="dialog"
        aria-expanded={abierta}
        aria-controls="menu-notificaciones"
        className="relative grid h-11 w-11 place-items-center rounded-xl border border-transparent text-muted transition hover:border-line hover:bg-surface-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.85 23.85 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022 23.85 23.85 0 005.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {noLeidas > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full border-2 border-surface-raised bg-red-600 px-1 text-center text-[10px] font-bold leading-4 text-white dark:bg-red-500">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        ) : null}
      </button>

      {abierta ? (
        <div
          ref={panelRef}
          id="menu-notificaciones"
          role="dialog"
          tabIndex={-1}
          aria-labelledby="titulo-notificaciones"
          className="fixed inset-x-3 top-[4.25rem] z-50 overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-[0_20px_55px_rgba(var(--warm-shadow),0.2)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[22rem]"
        >
          <div className="flex min-h-12 items-center justify-between gap-3 border-b border-line px-4 py-2.5">
            <div className="min-w-0">
              <p
                id="titulo-notificaciones"
                className="font-bold text-foreground"
              >
                Notificaciones
              </p>
              <p className="text-xs text-muted">Novedades de tu equipo</p>
            </div>
            {noLeidas > 0 ? (
              <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                {etiquetaCantidad}
              </span>
            ) : null}
          </div>

          <div className="max-h-[min(26rem,65vh)] overflow-y-auto py-1">
            {notificaciones.map((notificacion) => (
              <button
                key={notificacion.id}
                type="button"
                data-notificacion
                onClick={() => abrirNovedad(notificacion)}
                className={`flex min-h-20 w-full items-start gap-3 border-b border-line/70 px-4 py-3 text-left transition last:border-b-0 hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600/50 ${
                  notificacion.leidaEn
                    ? "bg-surface-raised"
                    : "bg-amber-50/70 dark:bg-amber-950/35"
                }`}
              >
                <span
                  aria-hidden
                  className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                    notificacion.leidaEn
                      ? "bg-zinc-300 dark:bg-zinc-700"
                      : "bg-amber-500 dark:bg-amber-400"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-foreground">
                    <span className="sr-only">
                      {notificacion.leidaEn ? "Leída. " : "No leída. "}
                    </span>
                    {notificacion.tarea.titulo}
                  </span>
                  <span className="mt-0.5 block text-xs font-medium text-muted">
                    {notificacion.repositor.nombre} ·{" "}
                    {notificacion.local.nombre}
                  </span>
                  <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-foreground/80">
                    {notificacion.comentario}
                  </span>
                  <time
                    dateTime={notificacion.reportadaEn}
                    className="mt-1.5 block text-[11px] text-muted"
                  >
                    {new Date(notificacion.reportadaEn).toLocaleString(
                      "es-PY",
                      {
                        dateStyle: "short",
                        timeStyle: "short",
                      },
                    )}
                  </time>
                </span>
              </button>
            ))}

            {notificaciones.length < total ? (
              <button
                type="button"
                onClick={() => void cargarMasNotificaciones()}
                disabled={cargandoMas || cargandoRecientes}
                className="flex min-h-11 w-full items-center justify-center border-t border-line px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600/50 disabled:cursor-wait disabled:opacity-60 dark:text-brand-300"
              >
                {cargandoMas ? "Cargando…" : "Cargar más"}
              </button>
            ) : null}

            {cargandoRecientes && notificaciones.length === 0 ? (
              <p
                className="px-4 py-8 text-center text-sm text-muted"
                role="status"
              >
                Cargando notificaciones…
              </p>
            ) : null}

            {!cargandoRecientes &&
            notificaciones.length === 0 &&
            !errorRecientes ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-semibold text-foreground">
                  No hay novedades
                </p>
                <p className="mt-1 text-xs text-muted">
                  Las novedades reportadas por tu equipo aparecerán acá.
                </p>
              </div>
            ) : null}

            {errorRecientes && notificaciones.length === 0 ? (
              <div className="px-4 py-7 text-center" role="status">
                <p className="text-sm font-semibold text-foreground">
                  No pudimos actualizar las notificaciones
                </p>
                <button
                  type="button"
                  onClick={() => void actualizar()}
                  className="mt-2 min-h-11 rounded-lg px-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:text-brand-300 dark:hover:bg-brand-950"
                >
                  Reintentar
                </button>
              </div>
            ) : null}

            {errorRecientes && notificaciones.length > 0 ? (
              <p className="border-t border-line px-4 py-2 text-center text-xs text-amber-700 dark:text-amber-300">
                Mostrando la última información disponible.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
