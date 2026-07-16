"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "motion/react";
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
import { trasladarPoligono } from "@/utils/poligono";
import { normalizarBusqueda } from "@/utils/texto";
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

function IconoCentrar() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      className="h-4 w-4"
      aria-hidden
    >
      <circle cx="10" cy="10" r="4" />
      <path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3" />
    </svg>
  );
}

function IconoMover() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M10 2v16M2 10h16M10 2L8 4M10 2l2 2M18 10l-2-2M18 10l-2 2M10 18l-2-2M10 18l2-2M2 10l2-2M2 10l2 2" />
    </svg>
  );
}

function BotonHerramienta({
  children,
  onClick,
  etiqueta,
  peligro,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  etiqueta: string;
  peligro?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-brand-600/40 disabled:cursor-not-allowed disabled:opacity-40 ${
        peligro
          ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-brand-800 dark:hover:bg-brand-950 dark:hover:text-brand-200"
      }`}
    >
      {children}
      {etiqueta}
    </button>
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
  const [busquedaPanel, setBusquedaPanel] = useState("");
  const [centrarSeleccionTrigger, setCentrarSeleccionTrigger] = useState(0);

  const [modoDibujo, setModoDibujo] = useState(false);
  const [verticesDibujo, setVerticesDibujo] = useState<[number, number][]>([]);
  const [teniaPoligono, setTeniaPoligono] = useState(false);
  const [modoMover, setModoMover] = useState(false);
  const [poligonoBaseMover, setPoligonoBaseMover] = useState<
    [number, number][]
  >([]);
  const [verticesMover, setVerticesMover] = useState<[number, number][]>([]);
  const [destinoMover, setDestinoMover] = useState<[number, number] | null>(
    null,
  );
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

  const [localAbierto, setLocalAbierto] = useState<LocalMapa | null>(null);
  const [detalleLocal, setDetalleLocal] = useState<LocalDetalle | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setErrorCarga(null);
    return apiFetch<MapaDatos>("/operaciones-campo/mapa")
      .then(setDatos)
      .catch((err) =>
        setErrorCarga(
          err instanceof ApiError ? err.message : "No se pudo cargar el mapa",
        ),
      );
  }, []);

  useEffect(() => {
    let vigente = true;
    apiFetch<MapaDatos>("/operaciones-campo/mapa")
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
      apiFetch<UsuarioAsignable[]>(
        "/operaciones-campo/responsables-territorio",
      ),
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

  const territorioSeleccionado =
    seleccion?.tipo === "territorio"
      ? (datos?.territorios.find((t) => t.id === seleccion.id) ?? null)
      : null;
  const zonaSeleccionada =
    seleccion?.tipo === "zona"
      ? (datos?.zonas.find((z) => z.id === seleccion.id) ?? null)
      : null;
  const elementoSeleccionado = territorioSeleccionado ?? zonaSeleccionada;
  const modoHerramientaActivo = modoDibujo || modoMover;

  const gruposPanel = useMemo(() => {
    if (!datos) return [];
    const consulta = normalizarBusqueda(busquedaPanel.trim());

    return datos.territorios
      .map((territorio) => {
        const zonas = datos.zonas.filter(
          (zona) => zona.territorioId === territorio.id,
        );
        if (!consulta) return { territorio, zonas };

        const coincideTerritorio = normalizarBusqueda(
          `${territorio.nombre} ${territorio.responsable?.nombre ?? ""}`,
        ).includes(consulta);
        const zonasCoincidentes = zonas.filter((zona) =>
          normalizarBusqueda(
            `${zona.nombre} ${zona.repositores.map((r) => r.nombre).join(" ")}`,
          ).includes(consulta),
        );

        return {
          territorio,
          zonas: coincideTerritorio ? zonas : zonasCoincidentes,
          coincide: coincideTerritorio || zonasCoincidentes.length > 0,
        };
      })
      .filter((grupo) => !("coincide" in grupo) || grupo.coincide);
  }, [busquedaPanel, datos]);

  function alternarSeleccion(tipo: "territorio" | "zona", id: number) {
    // La selección queda fija mientras se dibuja: es el destino del polígono
    if (modoHerramientaActivo) return;
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

  function iniciarMover(tipo: "territorio" | "zona", id: number) {
    const elemento =
      tipo === "territorio"
        ? datos?.territorios.find((territorio) => territorio.id === id)
        : datos?.zonas.find((zona) => zona.id === id);
    if (!elemento?.poligono) return;

    setSeleccion({ tipo, id });
    setPoligonoBaseMover([...elemento.poligono]);
    setVerticesMover([...elemento.poligono]);
    setDestinoMover(null);
    setErrorArea(null);
    setModoMover(true);
    setPanelAbierto(false);
  }

  function salirMover() {
    setModoMover(false);
    setPoligonoBaseMover([]);
    setVerticesMover([]);
    setDestinoMover(null);
    setErrorArea(null);
  }

  const posicionarMovimiento = useCallback(
    (lat: number, lng: number) => {
      const poligonoTrasladado = trasladarPoligono(poligonoBaseMover, [
        lat,
        lng,
      ]);
      if (!poligonoTrasladado) {
        setErrorArea(
          "No se puede mover el área fuera de los límites del mapa.",
        );
        return;
      }

      setVerticesMover(poligonoTrasladado);
      setDestinoMover([lat, lng]);
      setErrorArea(null);
    },
    [poligonoBaseMover],
  );

  async function guardarMovimiento() {
    if (!seleccion || !destinoMover || guardandoArea) return;
    setGuardandoArea(true);
    setErrorArea(null);
    try {
      await apiFetch(rutaElemento(seleccion.tipo, seleccion.id), {
        method: "PATCH",
        body: JSON.stringify({ poligono: verticesMover }),
      });
      salirMover();
      await cargar();
    } catch (err) {
      setErrorArea(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar la nueva posición",
      );
    } finally {
      setGuardandoArea(false);
    }
  }

  function centrarSeleccionado() {
    if (!elementoSeleccionado?.poligono) return;
    setCentrarSeleccionTrigger((trigger) => trigger + 1);
    setPanelAbierto(false);
  }

  function editarSeleccionado() {
    if (territorioSeleccionado) {
      abrirRenombrarTerritorio(territorioSeleccionado);
    } else if (zonaSeleccionada) {
      abrirRenombrarZona(zonaSeleccionada);
    }
  }

  function eliminarSeleccionado() {
    if (!seleccion || !elementoSeleccionado) return;
    setErrorEliminar(null);
    setEliminando({
      tipo: seleccion.tipo,
      id: elementoSeleccionado.id,
      nombre: elementoSeleccionado.nombre,
      zonasCount: territorioSeleccionado?.zonasCount ?? 0,
    });
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
        if (modoMover) salirMover();
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

  // El detalle se pide recién al abrir el modal del local.
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
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Organización del mapa
        </h2>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            [datos.territorios.length, "Territorios"],
            [datos.zonas.length, "Zonas"],
            [datos.locales.length, "Locales"],
          ].map(([cantidad, etiqueta]) => (
            <div
              key={etiqueta}
              className="rounded-lg bg-zinc-50 px-2 py-2 text-center dark:bg-zinc-800/70"
            >
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {cantidad}
              </p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {etiqueta}
              </p>
            </div>
          ))}
        </div>
      </div>

      <label className="sr-only" htmlFor="buscar-elemento-mapa">
        Buscar territorio, zona o usuario
      </label>
      <input
        id="buscar-elemento-mapa"
        type="search"
        value={busquedaPanel}
        onChange={(event) => setBusquedaPanel(event.target.value)}
        placeholder="Buscar territorio, zona o usuario…"
        className={inputBase}
      />

      {esGestor && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={abrirNuevoTerritorio}
            disabled={modoHerramientaActivo}
            className={`${btnPrimary} min-h-11 gap-2`}
          >
            <IconoMas className="h-5 w-5" /> Territorio
          </button>
          <button
            type="button"
            onClick={abrirNuevaZona}
            disabled={modoHerramientaActivo || datos.territorios.length === 0}
            className={`${btnPrimary} min-h-11 gap-2`}
          >
            <IconoMas className="h-5 w-5" /> Zona
          </button>
        </div>
      )}

      {elementoSeleccionado && seleccion && (
        <section className="rounded-xl border border-brand-200 bg-brand-50/70 p-3 dark:border-brand-900 dark:bg-brand-950/40">
          <div className="flex items-start gap-2">
            <PuntoColor color={elementoSeleccionado.color} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                {seleccion.tipo === "territorio" ? "Territorio" : "Zona"}
              </p>
              <h3 className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {elementoSeleccionado.nombre}
              </h3>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                {territorioSeleccionado
                  ? (territorioSeleccionado.responsable?.nombre ??
                    "Sin responsable")
                  : `${zonaSeleccionada?.localesCount ?? 0} locales · ${zonaSeleccionada?.repositores.length ?? 0} repositores`}
              </p>
            </div>
            {elementoSeleccionado.poligono === null && <BadgeSinDelimitar />}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <BotonHerramienta
              etiqueta="Centrar"
              onClick={centrarSeleccionado}
              disabled={
                modoHerramientaActivo || elementoSeleccionado.poligono === null
              }
            >
              <IconoCentrar />
            </BotonHerramienta>
            {esGestor && (
              <BotonHerramienta
                etiqueta="Mover"
                onClick={() => iniciarMover(seleccion.tipo, seleccion.id)}
                disabled={
                  modoHerramientaActivo ||
                  elementoSeleccionado.poligono === null
                }
              >
                <IconoMover />
              </BotonHerramienta>
            )}
            {esGestor && (
              <BotonHerramienta
                etiqueta="Editar límite"
                onClick={() => iniciarDibujo(seleccion.tipo, seleccion.id)}
                disabled={modoHerramientaActivo}
              >
                <IconoPoligono />
              </BotonHerramienta>
            )}
            {esGestor && (
              <BotonHerramienta
                etiqueta="Editar datos"
                onClick={editarSeleccionado}
                disabled={modoHerramientaActivo}
              >
                <IconoLapiz />
              </BotonHerramienta>
            )}
            {esGestor && (
              <BotonHerramienta
                etiqueta="Eliminar"
                onClick={eliminarSeleccionado}
                peligro
                disabled={modoHerramientaActivo}
              >
                <IconoTacho />
              </BotonHerramienta>
            )}
          </div>
          {elementoSeleccionado.poligono === null && esGestor && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
              Dibujá su límite para habilitar las herramientas de centrar y
              mover.
            </p>
          )}
        </section>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Capas visibles
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["territorios", "Territorios"],
              ["zonas", "Zonas"],
              ["locales", "Locales"],
            ] as const
          ).map(([capa, etiqueta]) => (
            <label
              key={capa}
              className={`flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 text-[11px] font-medium transition focus-within:ring-2 focus-within:ring-brand-600/40 ${
                visibilidad[capa]
                  ? "border-brand-600 bg-brand-50 text-brand-800 dark:border-brand-600 dark:bg-brand-950 dark:text-brand-200"
                  : "border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
              }`}
            >
              <input
                type="checkbox"
                checked={visibilidad[capa]}
                onChange={() =>
                  setVisibilidad((visible) => ({
                    ...visible,
                    [capa]: !visible[capa],
                  }))
                }
                className="h-4 w-4 cursor-pointer accent-brand-700"
              />
              {etiqueta}
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Territorios y zonas
        </p>
        {datos.territorios.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-5 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {esGestor
                ? "Todavía no hay territorios. Creá el primero para organizar el mapa."
                : "Todavía no hay territorios en tu empresa."}
            </p>
          </div>
        ) : gruposPanel.length === 0 ? (
          <p className="rounded-lg bg-zinc-50 p-4 text-center text-sm text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
            No hay resultados para “{busquedaPanel}”.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {gruposPanel.map(({ territorio, zonas: zonasDelTerritorio }) => {
              const estaSeleccionado =
                seleccion?.tipo === "territorio" &&
                seleccion.id === territorio.id;
              return (
                <div key={territorio.id}>
                  <button
                    type="button"
                    onClick={() =>
                      alternarSeleccion("territorio", territorio.id)
                    }
                    disabled={modoHerramientaActivo}
                    className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left transition focus-visible:ring-2 focus-visible:ring-brand-600/40 disabled:cursor-not-allowed disabled:opacity-60 ${
                      estaSeleccionado
                        ? "bg-brand-100 text-brand-900 dark:bg-brand-950 dark:text-brand-100"
                        : "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <PuntoColor color={territorio.color} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        {territorio.nombre}
                      </span>
                      <span className="block truncate text-xs font-normal text-zinc-500 dark:text-zinc-400">
                        {territorio.zonasCount}{" "}
                        {territorio.zonasCount === 1 ? "zona" : "zonas"}
                        {territorio.responsable
                          ? ` · ${territorio.responsable.nombre}`
                          : " · Sin responsable"}
                      </span>
                    </span>
                    {territorio.poligono === null && <BadgeSinDelimitar />}
                  </button>

                  {zonasDelTerritorio.length > 0 && (
                    <div className="ml-3 border-l border-zinc-200 pl-2 dark:border-zinc-800">
                      {zonasDelTerritorio.map((zona) => {
                        const zonaEstaSeleccionada =
                          seleccion?.tipo === "zona" &&
                          seleccion.id === zona.id;
                        return (
                          <button
                            key={zona.id}
                            type="button"
                            onClick={() => alternarSeleccion("zona", zona.id)}
                            disabled={modoHerramientaActivo}
                            className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left transition focus-visible:ring-2 focus-visible:ring-brand-600/40 disabled:cursor-not-allowed disabled:opacity-60 ${
                              zonaEstaSeleccionada
                                ? "bg-brand-100 text-brand-900 dark:bg-brand-950 dark:text-brand-100"
                                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <PuntoColor color={zona.color} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">
                                {zona.nombre}
                              </span>
                              <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                                {zona.localesCount}{" "}
                                {zona.localesCount === 1 ? "local" : "locales"}
                                {" · "}
                                {zona.repositores.length}{" "}
                                {zona.repositores.length === 1
                                  ? "repositor"
                                  : "repositores"}
                              </span>
                            </span>
                            {zona.poligono === null && <BadgeSinDelimitar />}
                          </button>
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
    </div>
  );

  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950 to-brand-700 p-5 text-white shadow-xl shadow-emerald-950/15 sm:p-6">
        <div className="mapa-radar absolute -right-12 -top-20 h-60 w-60 rounded-full border border-emerald-200/15" />
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
            Centro de operaciones
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Cobertura del equipo en un solo mapa
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-emerald-50/80">
            {esGestor
              ? "Organizá territorios y zonas, ubicá responsables y ajustá visualmente la cobertura de cada repositor."
              : "Consultá los territorios, las zonas y los locales habilitados para tu empresa."}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2 sm:max-w-lg sm:gap-3">
            {[
              [datos.territorios.length, "Territorios"],
              [datos.zonas.length, "Zonas"],
              [datos.locales.length, "Locales"],
            ].map(([cantidad, etiqueta], indice) => (
              <motion.div
                key={etiqueta}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + indice * 0.07 }}
                className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 backdrop-blur"
              >
                <span className="block text-xl font-black sm:text-2xl">
                  {cantidad}
                </span>
                <span className="block truncate text-[11px] text-emerald-100/80 sm:text-xs">
                  {etiqueta}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {errorCarga && <p className={`${errorBox} mt-4`}>{errorCarga}</p>}

      <div className="mt-5 flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-emerald-50/60 via-transparent to-sky-50/60 p-1 lg:flex-row lg:items-start dark:from-emerald-950/15 dark:to-sky-950/15">
        {/* Panel lateral (acordeón en mobile) */}
        <div className="lg:w-[23rem] lg:shrink-0">
          <button
            type="button"
            onClick={() => setPanelAbierto((a) => !a)}
            aria-expanded={panelAbierto}
            className="flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
          >
            <span>
              Territorios y zonas
              <span className="ml-1 font-normal text-zinc-500 dark:text-zinc-400">
                · {datos.territorios.length + datos.zonas.length}
              </span>
            </span>
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
                  className={`${btnGhost} min-h-11 disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  Deshacer punto
                </button>
                <button
                  type="button"
                  onClick={salirDibujo}
                  className={`${btnGhost} min-h-11`}
                >
                  Cancelar
                </button>
                {teniaPoligono && (
                  <button
                    type="button"
                    onClick={() => setConfirmandoQuitar(true)}
                    disabled={guardandoArea}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-600/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    Quitar delimitación
                  </button>
                )}
                <button
                  type="button"
                  onClick={guardarArea}
                  disabled={verticesDibujo.length < 3 || guardandoArea}
                  className={`${btnPrimary} min-h-11`}
                >
                  {guardandoArea ? "Guardando..." : "Guardar área"}
                </button>
              </div>
            </div>
          )}

          {modoMover && (
            <div className="sticky top-2 z-20 mb-3 flex flex-col gap-2 rounded-xl border border-violet-200 bg-violet-50/95 p-3 shadow-sm backdrop-blur dark:border-violet-900 dark:bg-violet-950/90">
              <div>
                <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">
                  Moviendo: {elementoSeleccionado?.nombre ?? "—"}
                </p>
                <p className="mt-1 text-xs text-violet-800 dark:text-violet-200">
                  Hacé clic en el mapa para ubicar el nuevo centro. Se mueve el
                  polígono completo sin cambiar su forma.
                </p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  Los locales, sus coordenadas GPS y las demás áreas no se
                  modifican.
                </p>
              </div>
              {errorArea && <p className={errorBox}>{errorArea}</p>}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={salirMover}
                  className={`${btnGhost} min-h-11`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={guardarMovimiento}
                  disabled={!destinoMover || guardandoArea}
                  className={`${btnPrimary} min-h-11`}
                >
                  {guardandoArea ? "Guardando..." : "Guardar posición"}
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
            modoMover={modoMover}
            vertices={verticesDibujo}
            verticesMover={verticesMover}
            destinoMover={destinoMover}
            centrarSeleccionTrigger={centrarSeleccionTrigger}
            onAgregarVertice={agregarVertice}
            onMoverVertice={moverVertice}
            onPosicionarMovimiento={posicionarMovimiento}
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
                href="/panel/team-leader/tareas"
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
