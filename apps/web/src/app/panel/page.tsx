"use client";

import { usePanel } from "@/components/panel/contexto";
import { Tablero } from "@/components/tablero";

export default function PanelInicioPage() {
  const { usuario } = usePanel();

  return (
    <>
      <h1 className="text-xl font-bold tracking-tight">
        Hola, {usuario.nombre} 👋
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {usuario.empresa.nombre}
      </p>

      {!usuario.rol && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <span className="font-semibold">
            Tu cuenta está pendiente de rol.
          </span>{" "}
          Un superior debe asignarte un rol (vendedor, supervisor, jefe...) para
          habilitar los módulos de trabajo.
        </div>
      )}

      <Tablero />
    </>
  );
}
