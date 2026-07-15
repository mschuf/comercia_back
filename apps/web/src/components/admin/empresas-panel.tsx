"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Empresa } from "@/types/empresa";
import type {
  AsignacionEmpresa,
  EmpresaModulo,
  Modulo,
  PaginaAsignada,
  Rol,
} from "@/types/plataforma";
import { errorBox } from "@/components/ui";
import type { RespuestaPaginada } from "@/types/paginacion";

const BASE = "/admin/plataforma";

export function EmpresasPanel() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [empresaId, setEmpresaId] = useState<number | "">("");
  const [asignacion, setAsignacion] = useState<AsignacionEmpresa | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<RespuestaPaginada<Empresa>>("/empresas?page=1&limit=50"),
      apiFetch<Modulo[]>(`${BASE}/modulos`),
      apiFetch<Rol[]>(`${BASE}/roles`),
    ])
      .then(([e, m, r]) => {
        setEmpresas(e.items);
        setModulos(m);
        setRoles(r);
        if (e.items.length > 0) setEmpresaId(e.items[0].id);
      })
      .catch((err) =>
        setErrorCarga(
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar los datos",
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

  function estadoModulo(moduloId: number): EmpresaModulo | null {
    return asignacion?.modulos.find((m) => m.moduloId === moduloId) ?? null;
  }

  // Guarda la asignación completa del módulo (roles + páginas). La API exige
  // NO enviar `paginas` cuando todasLasPaginas es true (regla anti fail-open).
  async function guardarAsignacion(
    moduloId: number,
    todasLasPaginas: boolean,
    rolIds: number[],
    paginas: PaginaAsignada[],
  ) {
    if (empresaId === "") return;
    setErrorAccion(null);
    setGuardando(moduloId);
    try {
      await apiFetch(`${BASE}/asignaciones`, {
        method: "POST",
        body: JSON.stringify(
          todasLasPaginas
            ? { empresaId, moduloId, todasLasPaginas: true, rolIds }
            : { empresaId, moduloId, todasLasPaginas: false, rolIds, paginas },
        ),
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

  async function alternarModulo(moduloId: number, habilitar: boolean) {
    if (empresaId === "") return;
    if (habilitar) {
      await guardarAsignacion(moduloId, true, [], []);
      return;
    }
    setErrorAccion(null);
    setGuardando(moduloId);
    try {
      await apiFetch(`${BASE}/empresas/${empresaId}/modulos/${moduloId}`, {
        method: "DELETE",
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
                <>
                  <SelectorRoles
                    etiqueta="Roles que ven el módulo"
                    roles={roles}
                    seleccion={estado.rolIds}
                    deshabilitado={guardando === m.id}
                    onCambio={(rolIds) =>
                      guardarAsignacion(
                        m.id,
                        estado.todasLasPaginas,
                        rolIds,
                        estado.paginas,
                      )
                    }
                  />
                  <SelectorPaginas
                    modulo={m}
                    estado={estado}
                    roles={roles}
                    deshabilitado={guardando === m.id}
                    onGuardar={(todas, paginas) =>
                      guardarAsignacion(m.id, todas, estado.rolIds, paginas)
                    }
                  />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Chips de roles: ninguno seleccionado = visible para todos los roles
function SelectorRoles({
  etiqueta,
  roles,
  seleccion,
  deshabilitado,
  onCambio,
  compacto = false,
}: {
  etiqueta: string;
  roles: Rol[];
  seleccion: number[];
  deshabilitado: boolean;
  onCambio: (rolIds: number[]) => void;
  compacto?: boolean;
}) {
  function toggle(rolId: number) {
    const set = new Set(seleccion);
    if (set.has(rolId)) set.delete(rolId);
    else set.add(rolId);
    onCambio([...set]);
  }

  return (
    <div
      className={
        compacto
          ? "mt-1.5"
          : "mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-800"
      }
    >
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {etiqueta}{" "}
        <span className="font-normal">
          (
          {seleccion.length === 0
            ? "todos los roles"
            : `${seleccion.length} seleccionados`}
          )
        </span>
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {roles.map((r) => {
          const activo = seleccion.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              disabled={deshabilitado}
              onClick={() => toggle(r.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition focus-visible:ring-2 focus-visible:ring-brand-600/40 disabled:cursor-not-allowed disabled:opacity-50 ${
                activo
                  ? "bg-brand-700 text-white hover:bg-brand-800"
                  : "border border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {r.descripcion}
            </button>
          );
        })}
        {roles.length === 0 && (
          <p className="text-xs text-zinc-400">No hay roles cargados.</p>
        )}
      </div>
    </div>
  );
}

function SelectorPaginas({
  modulo,
  estado,
  roles,
  deshabilitado,
  onGuardar,
}: {
  modulo: Modulo;
  estado: EmpresaModulo;
  roles: Rol[];
  deshabilitado: boolean;
  onGuardar: (todasLasPaginas: boolean, paginas: PaginaAsignada[]) => void;
}) {
  const paginas = modulo.paginas ?? [];

  function asignadaDe(paginaId: number): PaginaAsignada | null {
    return estado.paginas.find((p) => p.paginaId === paginaId) ?? null;
  }

  function togglePagina(paginaId: number) {
    const existente = asignadaDe(paginaId);
    const nuevas = existente
      ? estado.paginas.filter((p) => p.paginaId !== paginaId)
      : [...estado.paginas, { paginaId, rolIds: [] }];
    onGuardar(false, nuevas);
  }

  function cambiarRolesPagina(paginaId: number, rolIds: number[]) {
    onGuardar(
      false,
      estado.paginas.map((p) =>
        p.paginaId === paginaId ? { ...p, rolIds } : p,
      ),
    );
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
          onClick={() => onGuardar(false, estado.paginas)}
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
        <div className="mt-3 flex flex-col gap-2">
          {paginas.length === 0 && (
            <p className="text-xs text-zinc-400">
              Este módulo no tiene páginas.
            </p>
          )}
          {paginas.map((p) => {
            const asignada = asignadaDe(p.id);
            return (
              <div key={p.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    disabled={deshabilitado}
                    checked={asignada !== null}
                    onChange={() => togglePagina(p.id)}
                    className="h-4 w-4 accent-brand-700"
                  />
                  {p.nombre}
                  <span className="text-xs text-zinc-400">/{p.ruta}</span>
                </label>
                {asignada && (
                  <div className="ml-6">
                    <SelectorRoles
                      etiqueta="Roles que ven la página"
                      roles={roles}
                      seleccion={asignada.rolIds}
                      deshabilitado={deshabilitado}
                      onCambio={(rolIds) => cambiarRolesPagina(p.id, rolIds)}
                      compacto
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
