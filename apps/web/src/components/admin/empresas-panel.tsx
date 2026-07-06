"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Empresa } from "@/types/empresa";
import type { AsignacionEmpresa, Modulo } from "@/types/plataforma";
import { errorBox } from "@/components/ui";

const BASE = "/admin/plataforma";

export function EmpresasPanel() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [empresaId, setEmpresaId] = useState<number | "">("");
  const [asignacion, setAsignacion] = useState<AsignacionEmpresa | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ empresas: Empresa[] }>("/empresas"),
      apiFetch<Modulo[]>(`${BASE}/modulos`),
    ])
      .then(([e, m]) => {
        setEmpresas(e.empresas);
        setModulos(m);
        if (e.empresas.length > 0) setEmpresaId(e.empresas[0].id);
      })
      .catch((err) =>
        setErrorCarga(
          err instanceof ApiError ? err.message : "No se pudieron cargar los datos",
        ),
      )
      .finally(() => setCargando(false));
  }, []);

  async function cargarAsignacion(id: number) {
    const data = await apiFetch<AsignacionEmpresa>(
      `${BASE}/empresas/${id}/asignaciones`,
    );
    setAsignacion(data);
  }

  useEffect(() => {
    if (empresaId === "") return;
    let vigente = true;
    apiFetch<AsignacionEmpresa>(`${BASE}/empresas/${empresaId}/asignaciones`)
      .then((data) => {
        if (vigente) setAsignacion(data);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [empresaId]);

  function estadoModulo(moduloId: number) {
    return asignacion?.modulos.find((m) => m.moduloId === moduloId) ?? null;
  }

  async function alternarModulo(moduloId: number, habilitar: boolean) {
    if (empresaId === "") return;
    setErrorAccion(null);
    setGuardando(moduloId);
    try {
      if (habilitar) {
        await apiFetch(`${BASE}/asignaciones`, {
          method: "POST",
          body: JSON.stringify({
            empresaId,
            moduloId,
            todasLasPaginas: true,
          }),
        });
      } else {
        await apiFetch(`${BASE}/empresas/${empresaId}/modulos/${moduloId}`, {
          method: "DELETE",
        });
      }
      await cargarAsignacion(empresaId);
    } catch (err) {
      setErrorAccion(
        err instanceof ApiError ? err.message : "No se pudo guardar el cambio",
      );
    } finally {
      setGuardando(null);
    }
  }

  async function guardarPaginas(
    moduloId: number,
    todasLasPaginas: boolean,
    paginaIds: number[],
  ) {
    if (empresaId === "") return;
    setErrorAccion(null);
    setGuardando(moduloId);
    try {
      await apiFetch(`${BASE}/asignaciones`, {
        method: "POST",
        body: JSON.stringify({
          empresaId,
          moduloId,
          todasLasPaginas,
          paginaIds,
        }),
      });
      await cargarAsignacion(empresaId);
    } catch (err) {
      setErrorAccion(
        err instanceof ApiError ? err.message : "No se pudo guardar el cambio",
      );
    } finally {
      setGuardando(null);
    }
  }

  if (cargando) {
    return <p className="text-sm text-zinc-400">Cargando...</p>;
  }

  if (errorCarga) {
    return <p className={errorBox}>{errorCarga}</p>;
  }

  const inputBase =
    "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <div>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-zinc-700 dark:text-zinc-300 sm:max-w-xs">
        Empresa
        <select
          value={empresaId}
          onChange={(e) => setEmpresaId(Number(e.target.value))}
          className={inputBase}
        >
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </label>

      {errorAccion && <p className={`${errorBox} mt-4`}>{errorAccion}</p>}

      <div className="mt-5 flex flex-col gap-3">
        {modulos.map((m) => {
          const estado = estadoModulo(m.id);
          const habilitado = estado !== null;
          return (
            <div
              key={m.id}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{m.nombre}</p>
                  <p className="text-xs text-zinc-400">
                    {m.paginas?.length ?? 0} páginas
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={habilitado}
                    disabled={guardando === m.id}
                    onChange={(e) => alternarModulo(m.id, e.target.checked)}
                    className="h-4 w-4 accent-brand-700"
                  />
                  {habilitado ? "Habilitado" : "Deshabilitado"}
                </label>
              </div>

              {habilitado && estado && (
                <SelectorPaginas
                  modulo={m}
                  estado={estado}
                  deshabilitado={guardando === m.id}
                  onGuardar={(todas, ids) => guardarPaginas(m.id, todas, ids)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SelectorPaginas({
  modulo,
  estado,
  deshabilitado,
  onGuardar,
}: {
  modulo: Modulo;
  estado: { todasLasPaginas: boolean; paginaIds: number[] };
  deshabilitado: boolean;
  onGuardar: (todasLasPaginas: boolean, paginaIds: number[]) => void;
}) {
  const paginas = modulo.paginas ?? [];

  function togglePagina(paginaId: number) {
    const set = new Set(estado.paginaIds);
    if (set.has(paginaId)) set.delete(paginaId);
    else set.add(paginaId);
    onGuardar(false, [...set]);
  }

  return (
    <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={deshabilitado}
          onClick={() => onGuardar(true, [])}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
            estado.todasLasPaginas
              ? "bg-brand-700 text-white"
              : "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          }`}
        >
          Todas las páginas
        </button>
        <button
          type="button"
          disabled={deshabilitado}
          onClick={() => onGuardar(false, estado.paginaIds)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
            !estado.todasLasPaginas
              ? "bg-brand-700 text-white"
              : "border border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          }`}
        >
          Páginas específicas
        </button>
      </div>

      {!estado.todasLasPaginas && (
        <div className="mt-3 flex flex-col gap-1.5">
          {paginas.length === 0 && (
            <p className="text-xs text-zinc-400">
              Este módulo no tiene páginas.
            </p>
          )}
          {paginas.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                disabled={deshabilitado}
                checked={estado.paginaIds.includes(p.id)}
                onChange={() => togglePagina(p.id)}
                className="h-4 w-4 accent-brand-700"
              />
              {p.nombre}
              <span className="text-xs text-zinc-400">/{p.ruta}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
