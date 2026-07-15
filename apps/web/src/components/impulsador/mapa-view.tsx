"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { Modal } from "@/components/modal";
import { IconoMas } from "@/components/icono-mas";
import { SelectorUsuario } from "@/components/selector-usuario";
import {
  btnGhost,
  btnPrimary,
  errorBox,
  inputBase,
  labelBase,
} from "@/components/ui";
import { formatoFecha } from "@/utils/fechas";
import type { Territorio, Zona } from "@/types/territorio";
import type { LocalMapa, MapaDatos } from "@/types/mapa";
import type { LocalDetalle, UsuarioAsignable } from "@/types/local";
import type {
  SeleccionMapa,
  VisibilidadCapas,
} from "@/components/impulsador/mapa-base";

// Leaflet solo existe en el navegador: import dinámico sin SSR
const MapaEditor = dynamic(
  () => import("@/components/impulsador/mapa-editor").then((m) => m.MapaEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-[52dvh] min-h-[320px] w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800 lg:h-[70dvh] lg:min-h-[420px]" />
    ),
  },
);

const COLOR_TERRITORIO_DEFECTO = "#047857";
const COLOR_ZONA_DEFECTO = "#0284c7";

interface FormTerritorio {
  nombre: string;
  color: string;
  responsableId: number | "";
}

interface FormZona {
  territorioId: number | "";
  nombre: string;
  color: string;
  usuarioId: number | "";
}

interface Eliminando {
  tipo: "territorio" | "zona";
  id: number;
  nombre: string;
  zonasCount: number;
}

function rutaElemento(tipo: "territorio" | "zona", id: number): string {
  return tipo === "territorio" ? `/territorios/${id}` : `/zonas/${id}`;
}

function IconoLapiz() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
    </svg>
  );
}

function IconoPoligono() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M10 2.5l7.2 5.2-2.7 8.4H5.5L2.8 7.7 10 2.5z" />
    </svg>
  );
}

function IconoTacho() {
  return (
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
  );
}

function BotonIcono({
  children,
  onClick,
  titulo,
  peligro,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  titulo: string;
  peligro?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={titulo}
      aria-label={titulo}
      disabled={disabled}
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition focus-visible:ring-2 focus-visible:ring-brand-600/40 disabled:cursor-not-allowed disabled:opacity-40 ${
        peligro
          ? "text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

// Swatch clickeable con <input type="color"> nativo encima (invisible).
// key={color} re-sincroniza el input no controlado cuando el color cambia
// desde afuera (refetch); el PATCH se dispara recién al blur para no
// bombardear la API con cada movimiento del selector.
function ColorSwatch({
  color,
  etiqueta,
  onCambiar,
}: {
  color: string;
  etiqueta: string;
  onCambiar: (color: string) => void;
}) {
  return (
    <span className="relative inline-block h-6 w-6 shrink-0 rounded-md focus-within:ring-2 focus-within:ring-brand-600/40">
      <span
        aria-hidden
        className="absolute inset-0 rounded-md border border-black/10 dark:border-white/20"
        style={{ backgroundColor: color }}
      />
      <input
        key={color}
        type="color"
        defaultValue={color}
        aria-label={etiqueta}
        onBlur={(e) => {
          if (e.target.value !== color) onCambiar(e.target.value);
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </span>
  );
}

function PuntoColor({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-3 w-3 shrink-0 rounded-full border border-black/10 dark:border-white/20"
      style={{ backgroundColor: color }}
    />
  );
}

function BadgeSinDelimitar() {
  return (
    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
      Sin delimitar
    </span>
  );
}

export function MapaView() {
  const [datos, setDatos] = useState<MapaDatos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [seleccion, setSeleccion] = useState<SeleccionMapa | null>(null);
  const [visibilidad, setVisibilidad] = useState<VisibilidadCapas>({
    territorios: true,
    zonas: true,
    locales: true,
  });
  // Acordeón del panel en mobile (en lg el panel está siempre visible)
  const [panelAbierto, setPanelAbierto] = useState(false);

  const [modoDibujo, setModoDibujo] = useState(false);
  const [verticesDibujo, setVerticesDibujo] = useState<[number, number][]>([]);
  const [teniaPoligono, setTeniaPoligono] = useState(false);
  const [guardandoArea, setGuardandoArea] = useState(false);
  const [errorArea, setErrorArea] = useState<string | null>(null);
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false);

  // null = cerrado; "nuevo" = alta; entidad = renombrar
  const [editTerritorio, setEditTerritorio] = useState<
    Territorio | "nuevo" | null
  >(null);
  const [formTerritorio, setFormTerritorio] = useState<FormTerritorio>({
    nombre: "",
    color: COLOR_TERRITORIO_DEFECTO,
    responsableId: "",
  });
  const [editZona, setEditZona] = useState<Zona | "nuevo" | null>(null);
  const [formZona, setFormZona] = useState<FormZona>({
    territorioId: "",
    nombre: "",
    color: COLOR_ZONA_DEFECTO,
    usuarioId: "",
  });
  const [responsables, setResponsables] = useState<UsuarioAsignable[]>([]);
  const [repositores, setRepositores] = useState<UsuarioAsignable[]>([]);
  const [guardandoForm, setGuardandoForm] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const [eliminando, setEliminando] = useState<Eliminando | null>(null);
  const [borrando, setBorrando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  // Errores de acciones rápidas del panel (ej. PATCH de color)
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const [localAbierto, setLocalAbierto] = useState<LocalMapa | null>(null);
  const [detalleLocal, setDetalleLocal] = useState<LocalDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setErrorCarga(null);
    return apiFetch<MapaDatos>("/impulsador/mapa")
      .then(setDatos)
      .catch((err) =>
        setErrorCarga(
          err instanceof ApiError ? err.message : "No se pudo cargar el mapa",
        ),
      );
  }, []);

  useEffect(() => {
    let vigente = true;
    apiFetch<MapaDatos>("/impulsador/mapa")
      .then((d) => {
        if (vigente) {
          setDatos(d);
          setErrorCarga(null);
        }
      })
      .catch((err) => {
        if (vigente) {
          setErrorCarga(
            err instanceof ApiError ? err.message : "No se pudo cargar el mapa",
          );
        }
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, []);

  const esGestor = datos?.esGestor ?? false;

  useEffect(() => {
    if (!esGestor) return;
    let vigente = true;
    Promise.all([
      apiFetch<UsuarioAsignable[]>("/impulsador/responsables-territorio"),
      apiFetch<UsuarioAsignable[]>("/locales/usuarios-asignables"),
    ])
      .then(([lideres, operativos]) => {
        if (!vigente) return;
        setResponsables(lideres);
        setRepositores(operativos);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [esGestor]);

  const elementoSeleccionado =
    seleccion === null || datos === null
      ? null
      : seleccion.tipo === "territorio"
        ? (datos.territorios.find((t) => t.id === seleccion.id) ?? null)
        : (datos.zonas.find((z) => z.id === seleccion.id) ?? null);

  function alternarSeleccion(tipo: "territorio" | "zona", id: number) {
    // La selección queda fija mientras se dibuja: es el destino del polígono
    if (modoDibujo) return;
    setSeleccion((s) =>
      s !== null && s.tipo === tipo && s.id === id ? null : { tipo, id },
    );
  }

  function iniciarDibujo(tipo: "territorio" | "zona", id: number) {
    const elemento =
      tipo === "territorio"
        ? datos?.territorios.find((t) => t.id === id)
        : datos?.zonas.find((z) => z.id === id);
    if (!elemento) return;
    setSeleccion({ tipo, id });
    setVerticesDibujo(elemento.poligono ? [...elemento.poligono] : []);
    setTeniaPoligono(elemento.poligono !== null);
    setErrorArea(null);
    setModoDibujo(true);
    // En mobile cerramos el acordeón para que el mapa quede a la vista
    setPanelAbierto(false);
  }

  function salirDibujo() {
    setModoDibujo(false);
    setVerticesDibujo([]);
    setTeniaPoligono(false);
    setErrorArea(null);
  }

  const agregarVertice = useCallback((lat: number, lng: number) => {
    setVerticesDibujo((v) => [...v, [lat, lng]]);
  }, []);

  const moverVertice = useCallback((i: number, lat: number, lng: number) => {
    setVerticesDibujo((v) =>
      v.map((p, idx) => (idx === i ? ([lat, lng] as [number, number]) : p)),
    );
  }, []);

  async function guardarArea() {
    if (!seleccion || verticesDibujo.length < 3 || guardandoArea) return;
    setGuardandoArea(true);
    setErrorArea(null);
    try {
      await apiFetch(rutaElemento(seleccion.tipo, seleccion.id), {
        method: "PATCH",
        body: JSON.stringify({ poligono: verticesDibujo }),
      });
      salirDibujo();
      await cargar();
    } catch (err) {
      setErrorArea(
        err instanceof ApiError ? err.message : "No se pudo guardar el área",
      );
    } finally {
      setGuardandoArea(false);
    }
  }

  async function quitarDelimitacion() {
    if (!seleccion || guardandoArea) return;
    setGuardandoArea(true);
    setErrorArea(null);
    try {
      await apiFetch(rutaElemento(seleccion.tipo, seleccion.id), {
        method: "PATCH",
        body: JSON.stringify({ poligono: null }),
      });
      setConfirmandoQuitar(false);
      salirDibujo();
      await cargar();
    } catch (err) {
      setConfirmandoQuitar(false);
      setErrorArea(
        err instanceof ApiError
          ? err.message
          : "No se pudo quitar la delimitación",
      );
    } finally {
      setGuardandoArea(false);
    }
  }

  async function cambiarColor(
    tipo: "territorio" | "zona",
    id: number,
    color: string,
  ) {
    setErrorAccion(null);
    try {
      await apiFetch(rutaElemento(tipo, id), {
        method: "PATCH",
        body: JSON.stringify({ color }),
      });
      await cargar();
    } catch (err) {
      setErrorAccion(
        err instanceof ApiError ? err.message : "No se pudo cambiar el color",
      );
    }
  }

  function abrirNuevoTerritorio() {
    setFormTerritorio({
      nombre: "",
      color: COLOR_TERRITORIO_DEFECTO,
      responsableId: "",
    });
    setErrorForm(null);
    setEditTerritorio("nuevo");
  }

  function abrirRenombrarTerritorio(t: Territorio) {
    setFormTerritorio({
      nombre: t.nombre,
      color: t.color,
      responsableId: t.responsable?.id ?? "",
    });
    setErrorForm(null);
    setEditTerritorio(t);
  }

  async function guardarTerritorio(e: React.FormEvent) {
    e.preventDefault();
    if (guardandoForm || editTerritorio === null) return;
    const nombre = formTerritorio.nombre.trim();
    if (nombre.length < 2) {
      setErrorForm("El nombre debe tener al menos 2 caracteres");
      return;
    }
    setGuardandoForm(true);
    setErrorForm(null);
    try {
      const body = JSON.stringify({
        nombre,
        color: formTerritorio.color,
        responsableId:
          formTerritorio.responsableId === ""
            ? null
            : formTerritorio.responsableId,
      });
      if (editTerritorio === "nuevo") {
        await apiFetch("/territorios", { method: "POST", body });
      } else {
        await apiFetch(`/territorios/${editTerritorio.id}`, {
          method: "PATCH",
          body,
        });
      }
      setEditTerritorio(null);
      await cargar();
    } catch (err) {
      setErrorForm(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar el territorio",
      );
    } finally {
      setGuardandoForm(false);
    }
  }

  function abrirNuevaZona() {
    setFormZona({
      territorioId: datos?.territorios[0]?.id ?? "",
      nombre: "",
      color: COLOR_ZONA_DEFECTO,
      usuarioId: "",
    });
    setErrorForm(null);
    setEditZona("nuevo");
  }

  function abrirRenombrarZona(z: Zona) {
    setFormZona({
      territorioId: z.territorioId,
      nombre: z.nombre,
      color: z.color,
      usuarioId: z.repositores[0]?.id ?? "",
    });
    setErrorForm(null);
    setEditZona(z);
  }

  async function guardarZona(e: React.FormEvent) {
    e.preventDefault();
    if (guardandoForm || editZona === null) return;
    const nombre = formZona.nombre.trim();
    if (nombre.length < 2) {
      setErrorForm("El nombre debe tener al menos 2 caracteres");
      return;
    }
    if (editZona === "nuevo" && formZona.territorioId === "") {
      setErrorForm("Elegí el territorio al que pertenece la zona");
      return;
    }
    setGuardandoForm(true);
    setErrorForm(null);
    try {
      if (editZona === "nuevo") {
        await apiFetch("/zonas", {
          method: "POST",
          body: JSON.stringify({
            territorioId: formZona.territorioId,
            nombre,
            color: formZona.color,
            usuarioIds: formZona.usuarioId === "" ? [] : [formZona.usuarioId],
          }),
        });
      } else {
        await apiFetch(`/zonas/${editZona.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            nombre,
            color: formZona.color,
            usuarioIds: formZona.usuarioId === "" ? [] : [formZona.usuarioId],
          }),
        });
      }
      setEditZona(null);
      await cargar();
    } catch (err) {
      setErrorForm(
        err instanceof ApiError ? err.message : "No se pudo guardar la zona",
      );
    } finally {
      setGuardandoForm(false);
    }
  }

  async function confirmarEliminar() {
    if (!eliminando || borrando) return;
    setBorrando(true);
    setErrorEliminar(null);
    try {
      await apiFetch(rutaElemento(eliminando.tipo, eliminando.id), {
        method: "DELETE",
      });
      if (
        seleccion !== null &&
        seleccion.tipo === eliminando.tipo &&
        seleccion.id === eliminando.id
      ) {
        setSeleccion(null);
        if (modoDibujo) salirDibujo();
      }
      setEliminando(null);
      await cargar();
    } catch (err) {
      setErrorEliminar(
        err instanceof ApiError
          ? err.message
          : `No se pudo eliminar ${eliminando.tipo === "territorio" ? "el territorio" : "la zona"}`,
      );
    } finally {
      setBorrando(false);
    }
  }

  // El detalle (con checklist) se pide recién al abrir el modal del local.
  // El token descarta respuestas viejas si se abre otro local enseguida.
  const pedidoDetalleRef = useRef(0);

  function abrirLocal(id: number) {
    const local = datos?.locales.find((l) => l.id === id);
    if (!local) return;
    setLocalAbierto(local);
    const pedido = ++pedidoDetalleRef.current;
    setCargandoDetalle(true);
    setDetalleLocal(null);
    setErrorDetalle(null);
    apiFetch<LocalDetalle>(`/locales/${local.id}`)
      .then((d) => {
        if (pedido === pedidoDetalleRef.current) setDetalleLocal(d);
      })
      .catch((err) => {
        if (pedido === pedidoDetalleRef.current) {
          setErrorDetalle(
            err instanceof ApiError
              ? err.message
              : "No se pudo cargar el detalle del local",
          );
        }
      })
      .finally(() => {
        if (pedido === pedidoDetalleRef.current) setCargandoDetalle(false);
      });
  }

  if (cargando && !datos) {
    return (
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="h-32 w-full animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800 lg:h-[70dvh] lg:w-80 lg:shrink-0" />
        <div className="h-[52dvh] min-h-[320px] w-full flex-1 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800 lg:h-[70dvh] lg:min-h-[420px]" />
      </div>
    );
  }

  if (errorCarga && !datos) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className={errorBox}>{errorCarga}</p>
        <button
          type="button"
          onClick={() => {
            setCargando(true);
            void cargar().finally(() => setCargando(false));
          }}
          className={btnGhost}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!datos) return null;

  const zonaDelDetalle =
    detalleLocal?.zona != null
      ? (datos.zonas.find((z) => z.id === detalleLocal.zona?.id) ?? null)
      : null;

  const panel = (
    <div className="flex flex-col gap-3">
      {/* Capas visibles */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["territorios", "Territorios"],
            ["zonas", "Zonas"],
            ["locales", "Locales"],
          ] as const
        ).map(([capa, etiqueta]) => (
          <label
            key={capa}
            className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition focus-within:ring-2 focus-within:ring-brand-600/40 ${
              visibilidad[capa]
                ? "border-brand-600 bg-brand-50 text-brand-800 dark:border-brand-600 dark:bg-brand-950 dark:text-brand-200"
                : "border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            <input
              type="checkbox"
              checked={visibilidad[capa]}
              onChange={() =>
                setVisibilidad((v) => ({ ...v, [capa]: !v[capa] }))
              }
              className="h-3.5 w-3.5 cursor-pointer accent-brand-700"
            />
            {etiqueta}
          </label>
        ))}
      </div>

      {errorAccion && <p className={errorBox}>{errorAccion}</p>}

      {esGestor && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={abrirNuevoTerritorio}
            disabled={modoDibujo}
            aria-label="Crear territorio"
            title="Crear territorio"
            className={`${btnPrimary} min-h-11 gap-2`}
          >
            <IconoMas className="h-5 w-5" /> Territorio
          </button>
          <button
            type="button"
            onClick={abrirNuevaZona}
            disabled={modoDibujo || datos.territorios.length === 0}
            aria-label="Crear zona"
            title="Crear zona"
            className={`${btnPrimary} min-h-11 gap-2`}
          >
            <IconoMas className="h-5 w-5" /> Zona
          </button>
        </div>
      )}

      {datos.territorios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {esGestor
              ? "Todavía no hay territorios. Creá el primero con «+ Territorio» y delimitalo en el mapa."
              : "Todavía no hay territorios delimitados en tu empresa."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {datos.territorios.map((t) => {
            const zonasDelTerritorio = datos.zonas.filter(
              (z) => z.territorioId === t.id,
            );
            const territorioSeleccionado =
              seleccion?.tipo === "territorio" && seleccion.id === t.id;
            return (
              <div key={t.id}>
                <div
                  className={`flex items-center gap-2 rounded-lg px-1.5 py-1 ${
                    territorioSeleccionado
                      ? "bg-brand-50 dark:bg-brand-950/60"
                      : ""
                  }`}
                >
                  {esGestor ? (
                    <ColorSwatch
                      color={t.color}
                      etiqueta={`Cambiar color de ${t.nombre}`}
                      onCambiar={(c) => cambiarColor("territorio", t.id, c)}
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="h-5 w-5 shrink-0 rounded-md border border-black/10 dark:border-white/20"
                      style={{ backgroundColor: t.color }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => alternarSeleccion("territorio", t.id)}
                    className="flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded text-left text-sm font-medium text-zinc-800 transition hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:text-zinc-100 dark:hover:text-brand-200"
                  >
                    <span className="truncate">{t.nombre}</span>
                    <span className="shrink-0 text-xs font-normal text-zinc-400 dark:text-zinc-500">
                      {t.zonasCount} {t.zonasCount === 1 ? "zona" : "zonas"}
                    </span>
                    {t.responsable && (
                      <span className="hidden truncate text-xs font-normal text-zinc-500 sm:inline dark:text-zinc-400">
                        · {t.responsable.nombre}
                      </span>
                    )}
                  </button>
                  {t.poligono === null && <BadgeSinDelimitar />}
                  {esGestor && (
                    <span className="flex shrink-0">
                      <BotonIcono
                        titulo={`Renombrar ${t.nombre}`}
                        onClick={() => abrirRenombrarTerritorio(t)}
                        disabled={modoDibujo}
                      >
                        <IconoLapiz />
                      </BotonIcono>
                      <BotonIcono
                        titulo={`Delimitar ${t.nombre} en el mapa`}
                        onClick={() => iniciarDibujo("territorio", t.id)}
                        disabled={modoDibujo}
                      >
                        <IconoPoligono />
                      </BotonIcono>
                      <BotonIcono
                        titulo={`Eliminar ${t.nombre}`}
                        peligro
                        onClick={() => {
                          setErrorEliminar(null);
                          setEliminando({
                            tipo: "territorio",
                            id: t.id,
                            nombre: t.nombre,
                            zonasCount: t.zonasCount,
                          });
                        }}
                        disabled={modoDibujo}
                      >
                        <IconoTacho />
                      </BotonIcono>
                    </span>
                  )}
                </div>

                {zonasDelTerritorio.length > 0 && (
                  <div className="ml-4 flex flex-col border-l border-zinc-200 pl-2 dark:border-zinc-800">
                    {zonasDelTerritorio.map((z) => {
                      const zonaSeleccionada =
                        seleccion?.tipo === "zona" && seleccion.id === z.id;
                      return (
                        <div
                          key={z.id}
                          className={`flex items-center gap-2 rounded-lg px-1.5 py-0.5 ${
                            zonaSeleccionada
                              ? "bg-brand-50 dark:bg-brand-950/60"
                              : ""
                          }`}
                        >
                          {esGestor ? (
                            <ColorSwatch
                              color={z.color}
                              etiqueta={`Cambiar color de ${z.nombre}`}
                              onCambiar={(c) => cambiarColor("zona", z.id, c)}
                            />
                          ) : (
                            <span
                              aria-hidden
                              className="h-5 w-5 shrink-0 rounded-md border border-black/10 dark:border-white/20"
                              style={{ backgroundColor: z.color }}
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => alternarSeleccion("zona", z.id)}
                            className="flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded text-left text-sm text-zinc-700 transition hover:text-brand-700 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:text-zinc-200 dark:hover:text-brand-200"
                          >
                            <span className="truncate">{z.nombre}</span>
                            <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                              {z.localesCount}{" "}
                              {z.localesCount === 1 ? "local" : "locales"}
                            </span>
                            <span className="hidden text-xs text-zinc-500 sm:inline dark:text-zinc-400">
                              · {z.repositores.length}{" "}
                              {z.repositores.length === 1
                                ? "repositor"
                                : "repositores"}
                            </span>
                          </button>
                          {z.poligono === null && <BadgeSinDelimitar />}
                          {esGestor && (
                            <span className="flex shrink-0">
                              <BotonIcono
                                titulo={`Renombrar ${z.nombre}`}
                                onClick={() => abrirRenombrarZona(z)}
                                disabled={modoDibujo}
                              >
                                <IconoLapiz />
                              </BotonIcono>
                              <BotonIcono
                                titulo={`Delimitar ${z.nombre} en el mapa`}
                                onClick={() => iniciarDibujo("zona", z.id)}
                                disabled={modoDibujo}
                              >
                                <IconoPoligono />
                              </BotonIcono>
                              <BotonIcono
                                titulo={`Eliminar ${z.nombre}`}
                                peligro
                                onClick={() => {
                                  setErrorEliminar(null);
                                  setEliminando({
                                    tipo: "zona",
                                    id: z.id,
                                    nombre: z.nombre,
                                    zonasCount: 0,
                                  });
                                }}
                                disabled={modoDibujo}
                              >
                                <IconoTacho />
                              </BotonIcono>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {esGestor
          ? "Delimitá territorios y zonas con polígonos y mirá los locales de tu empresa sobre el mapa."
          : "Consultá los territorios, las zonas y los locales de tu empresa sobre el mapa."}
      </p>

      {errorCarga && <p className={`${errorBox} mt-4`}>{errorCarga}</p>}

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Panel lateral (acordeón en mobile) */}
        <div className="lg:w-80 lg:shrink-0">
          <button
            type="button"
            onClick={() => setPanelAbierto((a) => !a)}
            aria-expanded={panelAbierto}
            className="flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
          >
            Territorios y zonas
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 transition-transform ${panelAbierto ? "rotate-180" : ""}`}
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <aside
            className={`${panelAbierto ? "block" : "hidden"} mt-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 lg:mt-0 lg:block lg:max-h-[70dvh] lg:overflow-y-auto`}
          >
            {panel}
          </aside>
        </div>

        {/* Mapa + toolbar de dibujo */}
        <div className="min-w-0 flex-1">
          {modoDibujo && (
            <div className="sticky top-2 z-20 mb-3 flex flex-col gap-2 rounded-xl border border-brand-200 bg-brand-50/95 p-3 shadow-sm backdrop-blur dark:border-brand-800 dark:bg-brand-950/90">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-sm font-semibold text-brand-900 dark:text-brand-100">
                  Delimitando: {elementoSeleccionado?.nombre ?? "—"}
                </p>
                <p className="text-xs text-brand-800 dark:text-brand-200">
                  {verticesDibujo.length}{" "}
                  {verticesDibujo.length === 1 ? "punto" : "puntos"} — hacé clic
                  en el mapa para agregar puntos y arrastrá los vértices para
                  ajustarlos
                </p>
              </div>
              {errorArea && <p className={errorBox}>{errorArea}</p>}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setVerticesDibujo((v) => v.slice(0, -1))}
                  disabled={verticesDibujo.length === 0}
                  className={`${btnGhost} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Deshacer punto
                </button>
                <button
                  type="button"
                  onClick={salirDibujo}
                  className={btnGhost}
                >
                  Cancelar
                </button>
                {teniaPoligono && (
                  <button
                    type="button"
                    onClick={() => setConfirmandoQuitar(true)}
                    disabled={guardandoArea}
                    className="inline-flex items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-600/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    Quitar delimitación
                  </button>
                )}
                <button
                  type="button"
                  onClick={guardarArea}
                  disabled={verticesDibujo.length < 3 || guardandoArea}
                  className={btnPrimary}
                >
                  {guardandoArea ? "Guardando..." : "Guardar área"}
                </button>
              </div>
            </div>
          )}

          <MapaEditor
            territorios={datos.territorios}
            zonas={datos.zonas}
            locales={datos.locales}
            visibilidad={visibilidad}
            seleccion={seleccion}
            modoDibujo={modoDibujo}
            vertices={verticesDibujo}
            onAgregarVertice={agregarVertice}
            onMoverVertice={moverVertice}
            onClickLocal={abrirLocal}
            onClickElemento={alternarSeleccion}
          />
        </div>
      </div>

      {/* Modal alta/renombrar territorio */}
      <Modal
        titulo={
          editTerritorio === "nuevo"
            ? "Nuevo territorio"
            : "Renombrar territorio"
        }
        abierto={editTerritorio !== null}
        onCerrar={() => setEditTerritorio(null)}
      >
        <form onSubmit={guardarTerritorio} className="flex flex-col gap-4">
          <label className={labelBase}>
            Nombre del territorio
            <input
              type="text"
              value={formTerritorio.nombre}
              onChange={(e) =>
                setFormTerritorio((f) => ({ ...f, nombre: e.target.value }))
              }
              placeholder="Ej. Gran Asunción"
              maxLength={120}
              required
              className={inputBase}
            />
          </label>
          <label className={labelBase}>
            Color en el mapa
            <input
              type="color"
              value={formTerritorio.color}
              onChange={(e) =>
                setFormTerritorio((f) => ({ ...f, color: e.target.value }))
              }
              className="h-11 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <label className={labelBase}>
            Responsable del territorio
            <select
              value={formTerritorio.responsableId}
              onChange={(e) =>
                setFormTerritorio((f) => ({
                  ...f,
                  responsableId:
                    e.target.value === "" ? "" : Number(e.target.value),
                }))
              }
              className={inputBase}
            >
              <option value="">Sin responsable</option>
              {responsables.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.nombre}
                  {usuario.rol ? ` — ${usuario.rol}` : ""}
                </option>
              ))}
            </select>
          </label>
          {errorForm && <p className={errorBox}>{errorForm}</p>}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setEditTerritorio(null)}
              className={btnGhost}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardandoForm}
              className={btnPrimary}
            >
              {guardandoForm
                ? "Guardando..."
                : editTerritorio === "nuevo"
                  ? "Crear territorio"
                  : "Guardar cambios"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal alta/renombrar zona */}
      <Modal
        titulo={editZona === "nuevo" ? "Nueva zona" : "Renombrar zona"}
        abierto={editZona !== null}
        onCerrar={() => setEditZona(null)}
      >
        <form onSubmit={guardarZona} className="flex flex-col gap-4">
          {editZona === "nuevo" ? (
            <label className={labelBase}>
              Territorio
              <select
                value={formZona.territorioId}
                onChange={(e) =>
                  setFormZona((f) => ({
                    ...f,
                    territorioId:
                      e.target.value === "" ? "" : Number(e.target.value),
                  }))
                }
                required
                className={inputBase}
              >
                <option value="">Elegí un territorio</option>
                {datos.territorios.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            editZona !== null && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Territorio:{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  {editZona.territorioNombre}
                </span>
              </p>
            )
          )}
          <label className={labelBase}>
            Nombre de la zona
            <input
              type="text"
              value={formZona.nombre}
              onChange={(e) =>
                setFormZona((f) => ({ ...f, nombre: e.target.value }))
              }
              placeholder="Ej. Centro"
              maxLength={120}
              required
              className={inputBase}
            />
          </label>
          <label className={labelBase}>
            Color en el mapa
            <input
              type="color"
              value={formZona.color}
              onChange={(e) =>
                setFormZona((f) => ({ ...f, color: e.target.value }))
              }
              className="h-11 w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-1 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <div>
            <p className="text-[13px] font-medium text-zinc-700 dark:text-zinc-300">
              Repositor de la zona
            </p>
            <SelectorUsuario
              usuarios={repositores}
              value={formZona.usuarioId}
              onChange={(usuarioId) =>
                setFormZona((formulario) => ({
                  ...formulario,
                  usuarioId,
                }))
              }
            />
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              Podés buscar y seleccionar un solo repositor.
            </p>
          </div>
          {errorForm && <p className={errorBox}>{errorForm}</p>}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setEditZona(null)}
              className={btnGhost}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardandoForm}
              className={btnPrimary}
            >
              {guardandoForm
                ? "Guardando..."
                : editZona === "nuevo"
                  ? "Crear zona"
                  : "Guardar cambios"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmación de borrado */}
      <Modal
        titulo={
          eliminando?.tipo === "territorio"
            ? "Eliminar territorio"
            : "Eliminar zona"
        }
        abierto={eliminando !== null}
        onCerrar={() => setEliminando(null)}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          ¿Seguro que querés eliminar{" "}
          <span className="font-semibold">{eliminando?.nombre}</span>?{" "}
          {eliminando?.tipo === "territorio"
            ? `Se borran también sus ${eliminando.zonasCount} ${
                eliminando.zonasCount === 1 ? "zona" : "zonas"
              }; los locales quedan sin zona.`
            : "Sus locales quedan sin zona."}
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

      {/* Modal de confirmación para quitar la delimitación */}
      <Modal
        titulo="Quitar delimitación"
        abierto={confirmandoQuitar}
        onCerrar={() => setConfirmandoQuitar(false)}
      >
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          ¿Querés quitar la delimitación de{" "}
          <span className="font-semibold">
            {elementoSeleccionado?.nombre ?? "este elemento"}
          </span>
          ? Va a quedar sin área dibujada en el mapa.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setConfirmandoQuitar(false)}
            className={btnGhost}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={quitarDelimitacion}
            disabled={guardandoArea}
            className="inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardandoArea ? "Quitando..." : "Quitar delimitación"}
          </button>
        </div>
      </Modal>

      {/* Modal de detalle de local (solo consulta) */}
      <Modal
        titulo={localAbierto?.nombre ?? "Local"}
        abierto={localAbierto !== null}
        onCerrar={() => setLocalAbierto(null)}
        ancho="lg"
      >
        {cargandoDetalle ? (
          <div className="flex flex-col gap-3" aria-busy>
            <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-24 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          </div>
        ) : errorDetalle ? (
          <p className={errorBox}>{errorDetalle}</p>
        ) : detalleLocal ? (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Zona
                </dt>
                <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-200">
                  {detalleLocal.zona ? (
                    <>
                      <PuntoColor color={zonaDelDetalle?.color ?? "#b91c1c"} />
                      {detalleLocal.zona.nombre}
                    </>
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500">
                      Sin zona
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Asignado a
                </dt>
                <dd className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-200">
                  {detalleLocal.asignadoA ? (
                    detalleLocal.asignadoA.nombre
                  ) : (
                    <span className="text-zinc-400 dark:text-zinc-500">
                      Sin asignar
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Próxima visita
                </dt>
                <dd className="mt-0.5 text-sm text-zinc-700 [font-variant-numeric:tabular-nums] dark:text-zinc-200">
                  {formatoFecha(detalleLocal.fechaVisita)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  Radio de control
                </dt>
                <dd className="mt-0.5 text-sm text-zinc-700 [font-variant-numeric:tabular-nums] dark:text-zinc-200">
                  {detalleLocal.radioMetros !== null
                    ? `${detalleLocal.radioMetros} m`
                    : `Por defecto (${detalleLocal.radioMetrosEfectivo} m)`}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setLocalAbierto(null)}
                className={`${btnGhost} min-h-11`}
              >
                Cerrar
              </button>
              <Link
                href="/panel/impulsador/tareas"
                onClick={() => setLocalAbierto(null)}
                className={`${btnPrimary} min-h-11`}
              >
                Tareas ({detalleLocal.tareas.length})
              </Link>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
