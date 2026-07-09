"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Empresa } from "@/types/empresa";
import type { Rol } from "@/types/plataforma";
import type { ConfigImpulsadorAdmin } from "@/types/impulsador-config";
import { btnPrimary, errorBox, inputBase, labelBase } from "@/components/ui";

export function ImpulsadorPanel() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [empresaId, setEmpresaId] = useState<number | "">("");
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  // Config editable de la empresa seleccionada (null = todavía no cargó)
  const [config, setConfig] = useState<ConfigImpulsadorAdmin | null>(null);
  const [rolGestorIds, setRolGestorIds] = useState<number[]>([]);
  const [rolOperativoIds, setRolOperativoIds] = useState<number[]>([]);
  const [radioMetros, setRadioMetros] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const timeoutGuardado = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ empresas: Empresa[] }>("/empresas"),
      apiFetch<Rol[]>("/admin/plataforma/roles"),
    ])
      .then(([e, r]) => {
        setEmpresas(e.empresas);
        setRoles(r);
        if (e.empresas.length > 0) setEmpresaId(e.empresas[0].id);
      })
      .catch((err) =>
        setErrorCarga(
          err instanceof ApiError
            ? err.message
            : "No se pudieron cargar los datos",
        ),
      )
      .finally(() => setCargando(false));
    return () => {
      if (timeoutGuardado.current) clearTimeout(timeoutGuardado.current);
    };
  }, []);

  useEffect(() => {
    if (empresaId === "") return;
    let vigente = true;
    apiFetch<ConfigImpulsadorAdmin>(`/admin/impulsador/config/${empresaId}`)
      .then((c) => {
        if (!vigente) return;
        setConfig(c);
        setRolGestorIds(c.rolGestorIds);
        setRolOperativoIds(c.rolOperativoIds);
        setRadioMetros(String(c.radioMetrosDefecto));
      })
      .catch((err) => {
        if (vigente) {
          setErrorAccion(
            err instanceof ApiError
              ? err.message
              : "No se pudo cargar la configuración",
          );
        }
      });
    return () => {
      vigente = false;
    };
  }, [empresaId]);

  async function guardar() {
    if (empresaId === "" || guardando) return;
    const radio = Number(radioMetros);
    if (
      radioMetros.trim() === "" ||
      !Number.isInteger(radio) ||
      radio < 10 ||
      radio > 50000
    ) {
      setErrorAccion("El radio debe ser un entero entre 10 y 50000 metros");
      return;
    }
    setErrorAccion(null);
    setGuardando(true);
    try {
      const data = await apiFetch<ConfigImpulsadorAdmin>(
        `/admin/impulsador/config/${empresaId}`,
        {
          method: "PUT",
          body: JSON.stringify({
            rolGestorIds,
            rolOperativoIds,
            radioMetrosDefecto: radio,
          }),
        },
      );
      setConfig(data);
      setRolGestorIds(data.rolGestorIds);
      setRolOperativoIds(data.rolOperativoIds);
      setRadioMetros(String(data.radioMetrosDefecto));
      setGuardado(true);
      if (timeoutGuardado.current) clearTimeout(timeoutGuardado.current);
      timeoutGuardado.current = setTimeout(() => setGuardado(false), 2000);
    } catch (err) {
      setErrorAccion(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar la configuración",
      );
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <p className="text-sm text-zinc-400">Cargando...</p>;
  }

  if (errorCarga) {
    return <p className={errorBox}>{errorCarga}</p>;
  }

  return (
    <div>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-zinc-700 dark:text-zinc-300 sm:max-w-xs">
        Empresa
        <select
          value={empresaId}
          onChange={(e) => {
            // Limpiar acá (no en el efecto) evita renders en cascada
            setConfig(null);
            setErrorAccion(null);
            setEmpresaId(Number(e.target.value));
          }}
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

      {empresaId !== "" && config === null && !errorAccion && (
        <p className="mt-4 text-sm text-zinc-400">
          Cargando configuración...
        </p>
      )}

      {config !== null && (
        <div className="mt-5 flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <ChipsRoles
            etiqueta="Roles gestores"
            ayuda="Cargan locales, zonas y checklists, y asignan visitadores. Sin selección: GERENTE, JEFE, SUPERVISOR y TEAMLEADER."
            roles={roles}
            seleccion={rolGestorIds}
            deshabilitado={guardando}
            onCambio={setRolGestorIds}
          />

          <ChipsRoles
            etiqueta="Roles operativos (visitan)"
            ayuda="Realizan las visitas de sus locales asignados. Sin selección: cualquier usuario asignado."
            roles={roles}
            seleccion={rolOperativoIds}
            deshabilitado={guardando}
            onCambio={setRolOperativoIds}
          />

          <label className={`${labelBase} sm:max-w-xs`}>
            Radio de verificación por defecto (m)
            <input
              type="number"
              inputMode="numeric"
              min={10}
              max={50000}
              value={radioMetros}
              onChange={(e) => setRadioMetros(e.target.value)}
              disabled={guardando}
              className={`${inputBase} disabled:cursor-not-allowed disabled:opacity-50`}
            />
            <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">
              Distancia máxima al local para poder registrar la visita; se
              puede pisar por local.
            </span>
          </label>

          <div className="flex items-center gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className={btnPrimary}
            >
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            {guardado && (
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                ✓ Guardado
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Chips de roles al estilo SelectorRoles de empresas-panel:
// ninguno seleccionado = aplica el comportamiento por defecto del backend
function ChipsRoles({
  etiqueta,
  ayuda,
  roles,
  seleccion,
  deshabilitado,
  onCambio,
}: {
  etiqueta: string;
  ayuda: string;
  roles: Rol[];
  seleccion: number[];
  deshabilitado: boolean;
  onCambio: (rolIds: number[]) => void;
}) {
  function toggle(rolId: number) {
    const set = new Set(seleccion);
    if (set.has(rolId)) set.delete(rolId);
    else set.add(rolId);
    onCambio([...set]);
  }

  return (
    <div>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {etiqueta}{" "}
        <span className="font-normal text-zinc-400 dark:text-zinc-500">
          (
          {seleccion.length === 0
            ? "sin selección"
            : `${seleccion.length} seleccionados`}
          )
        </span>
      </p>
      <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{ayuda}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
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
