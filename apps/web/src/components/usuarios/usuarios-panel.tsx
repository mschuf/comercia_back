"use client";

import { useCallback, useEffect, useState } from "react";
import type { CountryCode } from "libphonenumber-js";
import { apiFetch, ApiError } from "@/lib/api";
import { IconoMas } from "@/components/icono-mas";
import type { RespuestaPaginada } from "@/types/paginacion";
import type { MetaUsuarios, UsuarioAdmin } from "@/types/usuario";
import { Modal } from "@/components/modal";
import { Paginacion } from "@/components/paginacion";
import {
  btnGhost,
  btnPrimary,
  errorBox,
  inputBase,
  labelBase,
} from "@/components/ui";

interface FormUsuario {
  nombre: string;
  apellido: string;
  correo: string;
  nombreLogin: string;
  ruc: string;
  celularPais: CountryCode;
  celular: string;
  password: string;
  rolId: number | "";
  superiorId: number | "";
  isActive: boolean;
}

const FORM_INICIAL: FormUsuario = {
  nombre: "",
  apellido: "",
  correo: "",
  nombreLogin: "",
  ruc: "",
  celularPais: "PY",
  celular: "",
  password: "",
  rolId: "",
  superiorId: "",
  isActive: true,
};

export function UsuariosPanel() {
  const [meta, setMeta] = useState<MetaUsuarios | null>(null);
  const [empresaId, setEmpresaId] = useState<number | "">("");
  const [datos, setDatos] = useState<RespuestaPaginada<UsuarioAdmin> | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(7);
  const [editando, setEditando] = useState<UsuarioAdmin | "nuevo" | null>(null);
  const [form, setForm] = useState<FormUsuario>(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(() => {
    if (empresaId === "") return;
    apiFetch<RespuestaPaginada<UsuarioAdmin>>(
      `/usuarios?page=${page}&limit=${limit}&empresaId=${empresaId}`,
    )
      .then(setDatos)
      .catch((e) =>
        setError(
          e instanceof ApiError
            ? e.message
            : "No se pudieron cargar los usuarios",
        ),
      );
  }, [empresaId, page, limit]);

  useEffect(() => {
    apiFetch<MetaUsuarios>("/usuarios/meta")
      .then((data) => {
        setMeta(data);
        setEmpresaId(data.empresas[0]?.id ?? "");
      })
      .catch((e) =>
        setError(
          e instanceof ApiError ? e.message : "No tenés acceso a usuarios",
        ),
      );
  }, []);

  useEffect(() => cargar(), [cargar]);

  function abrirNuevo() {
    setForm({ ...FORM_INICIAL, rolId: meta?.roles[0]?.id ?? "" });
    setError(null);
    setEditando("nuevo");
  }

  function abrirEditar(usuario: UsuarioAdmin) {
    setForm({
      ...FORM_INICIAL,
      rolId: usuario.rol?.id ?? meta?.roles[0]?.id ?? "",
      superiorId: usuario.superior?.id ?? "",
      isActive: usuario.isActive,
    });
    setError(null);
    setEditando(usuario);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (empresaId === "" || form.rolId === "" || editando === null) return;
    setGuardando(true);
    setError(null);
    try {
      if (editando === "nuevo") {
        await apiFetch("/usuarios", {
          method: "POST",
          body: JSON.stringify({
            empresaId,
            nombre: form.nombre.trim(),
            apellido: form.apellido.trim(),
            correo: form.correo.trim().toLowerCase(),
            nombreLogin: form.nombreLogin.trim().toLowerCase(),
            ruc: form.ruc.trim(),
            celularPais: form.celularPais,
            celular: form.celular.trim(),
            password: form.password,
            rolId: form.rolId,
            superiorId: form.superiorId === "" ? null : form.superiorId,
          }),
        });
      } else {
        await apiFetch(`/usuarios/${editando.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            rolId: form.rolId,
            superiorId: form.superiorId === "" ? null : form.superiorId,
            isActive: form.isActive,
            ...(form.password ? { password: form.password } : {}),
          }),
        });
      }
      setEditando(null);
      cargar();
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "No se pudo guardar el usuario",
      );
    } finally {
      setGuardando(false);
    }
  }

  const usuarios = datos?.items ?? [];
  const superiores = usuarios.filter(
    (u) => editando === "nuevo" || u.id !== editando?.id,
  );

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Usuarios</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Alta, roles, superiores y estado de acceso por empresa.
          </p>
        </div>
        <button
          type="button"
          onClick={abrirNuevo}
          aria-label="Crear usuario"
          title="Crear usuario"
          className={`${btnPrimary} h-11 w-11 shrink-0 p-0`}
        >
          <IconoMas className="h-5 w-5" />
        </button>
      </div>

      {meta && meta.empresas.length > 1 && (
        <label className={`${labelBase} mt-5 sm:max-w-xs`}>
          Empresa
          <select
            value={empresaId}
            onChange={(e) => {
              setEmpresaId(Number(e.target.value));
              setPage(1);
            }}
            className={inputBase}
          >
            {meta.empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && !editando && <p className={`${errorBox} mt-4`}>{error}</p>}

      <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-surface-raised">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-surface-soft text-left text-xs font-semibold uppercase text-foreground">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Superior</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface-raised">
            {usuarios.map((usuario) => (
              <tr key={usuario.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">
                    {usuario.nombre} {usuario.apellido}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {usuario.correo}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {usuario.rol?.descripcion ?? "Sin rol"}
                </td>
                <td className="px-4 py-3">
                  {usuario.superior?.nombre ?? "Sin superior"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      usuario.isActive
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-700 dark:text-red-400"
                    }
                  >
                    {usuario.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => abrirEditar(usuario)}
                    className={btnGhost}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {datos && datos.total > 0 && (
        <Paginacion
          page={datos.page}
          totalPages={datos.totalPages}
          total={datos.total}
          limit={datos.limit}
          onPageChange={setPage}
          onLimitChange={(nuevo) => {
            setLimit(nuevo);
            setPage(1);
          }}
        />
      )}

      <Modal
        titulo={editando === "nuevo" ? "Nuevo usuario" : "Editar usuario"}
        abierto={editando !== null}
        onCerrar={() => setEditando(null)}
      >
        <form onSubmit={guardar} className="flex flex-col gap-4">
          {editando === "nuevo" && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Campo
                  label="Nombre"
                  value={form.nombre}
                  onChange={(nombre) => setForm((f) => ({ ...f, nombre }))}
                />
                <Campo
                  label="Apellido"
                  value={form.apellido}
                  onChange={(apellido) => setForm((f) => ({ ...f, apellido }))}
                />
              </div>
              <Campo
                label="Correo"
                type="email"
                value={form.correo}
                onChange={(correo) => setForm((f) => ({ ...f, correo }))}
              />
              <Campo
                label="Nombre de usuario"
                value={form.nombreLogin}
                onChange={(nombreLogin) =>
                  setForm((f) => ({ ...f, nombreLogin }))
                }
              />
              <Campo
                label="RUC"
                value={form.ruc}
                onChange={(ruc) => setForm((f) => ({ ...f, ruc }))}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className={labelBase}>
                  País del celular
                  <select
                    value={form.celularPais}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        celularPais: e.target.value as CountryCode,
                      }))
                    }
                    className={inputBase}
                  >
                    <option value="PY">Paraguay (+595)</option>
                    <option value="AR">Argentina (+54)</option>
                    <option value="BR">Brasil (+55)</option>
                    <option value="UY">Uruguay (+598)</option>
                    <option value="BO">Bolivia (+591)</option>
                  </select>
                </label>
                <Campo
                  label="Celular"
                  type="tel"
                  value={form.celular}
                  onChange={(celular) => setForm((f) => ({ ...f, celular }))}
                />
              </div>
            </>
          )}

          <label className={labelBase}>
            Rol
            <select
              value={form.rolId}
              onChange={(e) =>
                setForm((f) => ({ ...f, rolId: Number(e.target.value) }))
              }
              required
              className={inputBase}
            >
              {meta?.roles.map((rol) => (
                <option key={rol.id} value={rol.id}>
                  {rol.descripcion}
                </option>
              ))}
            </select>
          </label>
          <label className={labelBase}>
            Superior
            <select
              value={form.superiorId}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  superiorId:
                    e.target.value === "" ? "" : Number(e.target.value),
                }))
              }
              className={inputBase}
            >
              <option value="">Sin superior</option>
              {superiores.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre} {u.apellido}
                </option>
              ))}
            </select>
          </label>
          <Campo
            label={
              editando === "nuevo"
                ? "Contraseña"
                : "Nueva contraseña (opcional)"
            }
            type="password"
            value={form.password}
            required={editando === "nuevo"}
            onChange={(password) => setForm((f) => ({ ...f, password }))}
          />
          {editando !== "nuevo" && (
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
              />
              Usuario activo
            </label>
          )}
          {error && <p className={errorBox}>{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditando(null)}
              className={btnGhost}
            >
              Cancelar
            </button>
            <button type="submit" disabled={guardando} className={btnPrimary}>
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className={labelBase}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={type === "password" ? 8 : undefined}
        className={inputBase}
      />
    </label>
  );
}
