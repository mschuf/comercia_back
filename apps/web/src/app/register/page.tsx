"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { apiFetch, ApiError } from "@/lib/api";
import type { UsuarioSesion } from "@/types/usuario";
import {
  esRucParaguayoValido,
  normalizarRucPy,
  pistaRucPy,
} from "@/utils/ruc";
import { listaCompletaDePaises, PAIS_INICIAL } from "@/utils/paises";
import type { Empresa } from "@/types/empresa";
import { AuthShell } from "@/components/auth-shell";
import { SelectorPais } from "@/components/selector-pais";
import { btnPrimary, errorBox, inputBase, labelBase } from "@/components/ui";


const sinSuscripcion = () => () => {};

export default function RegisterPage() {
  const router = useRouter();

  const paises = useSyncExternalStore(
    sinSuscripcion,
    listaCompletaDePaises,
    () => PAIS_INICIAL,
  );
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [nombreLogin, setNombreLogin] = useState("");
  const [empresaId, setEmpresaId] = useState<number | "">("");
  const [ruc, setRuc] = useState("");
  const [pais, setPais] = useState<CountryCode>("PY");
  const [celular, setCelular] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    apiFetch<{ empresas: Empresa[] }>("/empresas")
      .then((data) => {
        setEmpresas(data.empresas);
        if (data.empresas.length === 1) {
          setEmpresaId(data.empresas[0].id);
        }
      })
      .catch(() => setError("No se pudo cargar la lista de empresas"));
  }, []);

  function validar(): string | null {
    if (empresaId === "") return "Elegí tu empresa";
    if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(nombreLogin.trim().toLowerCase())) {
      return 'El nombre de usuario debe tener 3 a 30 caracteres (letras, números, ".", "-", "_")';
    }
    if (pais === "PY" && !esRucParaguayoValido(ruc)) {
      return "El RUC no es válido: revisá el número y su dígito verificador (ej: 80012345-0)";
    }
    const tel = parsePhoneNumberFromString(celular, pais);
    if (!tel || !tel.isValid()) {
      return "El celular no es válido para el país seleccionado";
    }
    if (password.length < 8)
      return "La contraseña debe tener al menos 8 caracteres";
    if (password !== confirmar) return "Las contraseñas no coinciden";
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      await apiFetch<{ usuario: UsuarioSesion }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          correo: correo.trim().toLowerCase(),
          nombreLogin: nombreLogin.trim().toLowerCase(),
          empresaId,
          ruc: pais === "PY" ? normalizarRucPy(ruc) : ruc.trim(),
          celularPais: pais,
          celular: celular.trim(),
          password,
        }),
      });
      router.push("/panel");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado");
      setEnviando(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight">Crear cuenta</h1>
      <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
        Un superior te asignará tu rol después de registrarte
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelBase}>
            Nombre
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              minLength={2}
              autoFocus
              className={inputBase}
            />
          </label>
          <label className={labelBase}>
            Apellido
            <input
              type="text"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              required
              minLength={2}
              className={inputBase}
            />
          </label>
        </div>

        <label className={labelBase}>
          Correo electrónico
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="tu@correo.com"
            required
            autoComplete="email"
            className={inputBase}
          />
        </label>

        <label className={labelBase}>
          Nombre de usuario
          <input
            type="text"
            value={nombreLogin}
            onChange={(e) => setNombreLogin(e.target.value)}
            placeholder="ej: carlos.morteira"
            required
            minLength={3}
            maxLength={30}
            autoComplete="username"
            className={inputBase}
          />
        </label>

        <label className={labelBase}>
          Empresa
          <select
            value={empresaId}
            onChange={(e) => setEmpresaId(Number(e.target.value))}
            required
            className={inputBase}
          >
            <option value="" disabled>
              Elegí tu empresa
            </option>
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className={labelBase}>
          RUC
          <input
            type="text"
            value={ruc}
            onChange={(e) => setRuc(e.target.value)}
            placeholder={
              pais === "PY"
                ? "80012345-0 (con dígito verificador)"
                : "Identificador fiscal"
            }
            required
            className={inputBase}
          />
          {pais === "PY" &&
            (() => {
              const pista = pistaRucPy(ruc);
              if (!pista.mensaje) {
                return null;
              }
              return (
                <span
                  className={
                    pista.estado === "valido"
                      ? "text-xs font-medium text-[#006300] dark:text-[#0ca30c]"
                      : "text-xs font-normal text-amber-700 dark:text-amber-400"
                  }
                >
                  {pista.mensaje}
                </span>
              );
            })()}
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1.2fr]">
          <label className={labelBase}>
            País
            <SelectorPais paises={paises} value={pais} onChange={setPais} />
          </label>
          <label className={labelBase}>
            Celular
            <input
              type="tel"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              placeholder={pais === "PY" ? "0971 123456" : "Número local"}
              required
              className={inputBase}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelBase}>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={inputBase}
            />
          </label>
          <label className={labelBase}>
            Repetir contraseña
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className={inputBase}
            />
          </label>
        </div>

        {error && <p className={errorBox}>{error}</p>}

        <button type="submit" disabled={enviando} className={btnPrimary}>
          {enviando ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        ¿Ya tenés cuenta?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-700 hover:underline dark:text-brand-500"
        >
          Iniciá sesión
        </Link>
      </p>
    </AuthShell>
  );
}
