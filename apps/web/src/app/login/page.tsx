"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch, ApiError, type UsuarioSesion } from "@/lib/api";
import { AuthShell } from "@/components/auth-shell";
import { btnPrimary, errorBox, inputBase, labelBase } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [identificador, setIdentificador] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await apiFetch<{ usuario: UsuarioSesion }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identificador: identificador.trim(), password }),
      });
      router.push("/panel");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error inesperado");
      setEnviando(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold tracking-tight">Iniciar sesión</h1>
      <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
        Entrá con tu correo o tu nombre de usuario
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5">
        <label className={labelBase}>
          Correo o nombre de usuario
          <input
            type="text"
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            placeholder="tu@correo.com o tu.usuario"
            required
            autoFocus
            autoComplete="username"
            className={inputBase}
          />
        </label>

        <label className={labelBase}>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={inputBase}
          />
        </label>

        {error && <p className={errorBox}>{error}</p>}

        <button type="submit" disabled={enviando} className={btnPrimary}>
          {enviando ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        ¿Todavía no tenés cuenta?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand-700 hover:underline dark:text-brand-500"
        >
          Registrate
        </Link>
      </p>
    </AuthShell>
  );
}
