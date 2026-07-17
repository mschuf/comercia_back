"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { PantallaCarga } from "@/components/pantalla-carga";
import { Paginacion } from "@/components/paginacion";
import { btnGhost, errorBox, inputBase, labelBase } from "@/components/ui";
import { formatoFechaHora } from "@/utils/fechas";
import type { RepositorEquipo } from "@/types/equipo";
import type { RespuestaPaginada } from "@/types/paginacion";

const ESPERA_BUSQUEDA_MS = 350;

export function EquipoView() {
  const router = useRouter();
  const [datos, setDatos] =
    useState<RespuestaPaginada<RepositorEquipo> | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(7);
  const [buscar, setBuscar] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navegando, setNavegando] = useState<string | null>(null);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setBusquedaAplicada(buscar.trim());
      setPage(1);
    }, ESPERA_BUSQUEDA_MS);
    return () => window.clearTimeout(temporizador);
  }, [buscar]);

  useEffect(() => {
    let vigente = true;
    const parametros = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (busquedaAplicada) parametros.set("buscar", busquedaAplicada);

    apiFetch<RespuestaPaginada<RepositorEquipo>>(
      `/equipo/repositores?${parametros.toString()}`,
    )
      .then((respuesta) => {
        if (!vigente) return;
        setDatos(respuesta);
        setError(null);
      })
      .catch((err) => {
        if (!vigente) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "No se pudo cargar el equipo",
        );
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [busquedaAplicada, limit, page]);

  function verLocales(repositor: RepositorEquipo) {
    if (repositor.localesCount === 0 || navegando !== null) return;
    setNavegando(`Abriendo los locales de ${repositor.nombreCompleto}`);
    const parametros = new URLSearchParams({
      vista: "locales",
      usuarioId: String(repositor.id),
      repositor: repositor.nombreCompleto,
    });
    router.push(`/panel/team-leader/clientes?${parametros.toString()}`);
  }

  const filas = datos?.items ?? [];

  return (
    <div className="min-w-0 w-full">
      <div>
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">Equipo</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Consultá los repositores a tu cargo y entrá directamente a sus
          locales asignados.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface-raised p-3 sm:max-w-xl">
        <label className={labelBase}>
          Buscar repositor
          <div className="relative">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M9 3a6 6 0 104.472 10.002l3.263 3.263a.75.75 0 101.06-1.06l-3.262-3.263A6 6 0 009 3zm-4.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="search"
              value={buscar}
              onChange={(event) => setBuscar(event.target.value)}
              placeholder="Nombre, apellido o usuario"
              className={`${inputBase} pl-10 pr-10`}
            />
            {buscar ? (
              <button
                type="button"
                onClick={() => setBuscar("")}
                aria-label="Limpiar búsqueda"
                title="Limpiar búsqueda"
                className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:bg-surface-soft hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
              >
                <span aria-hidden>×</span>
              </button>
            ) : null}
          </div>
        </label>
      </div>

      {error ? <p className={`${errorBox} mt-4`}>{error}</p> : null}

      {filas.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface-raised">
          <table className="w-full min-w-[1040px] text-left text-sm">
            <thead className="bg-surface-soft">
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-foreground">
                <th className="px-4 py-3 font-medium">Repositor</th>
                <th className="px-4 py-3 font-medium">Locales</th>
                <th className="px-4 py-3 font-medium">Estado actual</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium">Última actividad</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((repositor) => (
                <tr
                  key={repositor.id}
                  className="border-b border-line bg-surface-raised align-middle transition last:border-0 hover:bg-surface-soft"
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">
                      {repositor.nombreCompleto}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      @{repositor.nombreLogin}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => verLocales(repositor)}
                      disabled={repositor.localesCount === 0}
                      className={`${btnGhost} min-w-28 gap-2 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45`}
                      aria-label={`Ver locales de ${repositor.nombreCompleto}`}
                    >
                      <IconoLocal />
                      {repositor.localesCount} {repositor.localesCount === 1 ? "local" : "locales"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {repositor.visitaActual ? (
                      <div className="min-w-44">
                        <p className="font-medium text-foreground">
                          En {repositor.visitaActual.localNombre}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {repositor.visitaActual.clienteNombre} ·{" "}
                          {repositor.visitaActual.tareasCompletadas}/
                          {repositor.visitaActual.tareasTotal} tareas
                        </p>
                        <p className="mt-0.5 text-xs text-muted [font-variant-numeric:tabular-nums]">
                          Desde {formatoFechaHora(repositor.visitaActual.iniciadaEn)}
                        </p>
                      </div>
                    ) : (
                      <span className="inline-flex rounded-full bg-surface-soft px-2.5 py-1 text-xs font-medium text-muted">
                        Sin visita activa
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-foreground">{repositor.celular || "—"}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {repositor.correo || "Sin correo"}
                    </p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted [font-variant-numeric:tabular-nums]">
                    {formatoFechaHora(repositor.ultimaActividad)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!cargando && filas.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-surface-raised px-4 py-10 text-center text-sm text-muted">
          {busquedaAplicada
            ? "No encontramos repositores con esa búsqueda."
            : "Todavía no tenés repositores asignados a tu equipo."}
        </div>
      ) : null}

      {cargando && !datos ? (
        <div className="mt-4 animate-pulse rounded-xl border border-line bg-surface-raised p-6">
          <div className="h-4 w-44 rounded bg-surface-soft" />
          <div className="mt-4 h-24 rounded bg-surface-soft" />
        </div>
      ) : null}

      {datos && datos.total > 0 ? (
        <Paginacion
          page={datos.page}
          totalPages={datos.totalPages}
          total={datos.total}
          limit={datos.limit}
          onPageChange={setPage}
          onLimitChange={(nuevoLimite) => {
            setLimit(nuevoLimite);
            setPage(1);
          }}
        />
      ) : null}

      <PantallaCarga
        visible={navegando !== null}
        mensaje={navegando ?? "Abriendo locales"}
        detalle="Aplicamos el filtro del repositor seleccionado."
      />
    </div>
  );
}

function IconoLocal() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M3 2.75A.75.75 0 013.75 2h12.5a.75.75 0 01.75.75V5H3V2.75zM2 6.5A.5.5 0 012.5 6h15a.5.5 0 01.5.5v1a2.5 2.5 0 01-1.5 2.291V17a1 1 0 01-1 1h-3.75a.75.75 0 01-.75-.75V13H9v4.25a.75.75 0 01-.75.75H4.5a1 1 0 01-1-1V9.791A2.5 2.5 0 012 7.5v-1z" />
    </svg>
  );
}
