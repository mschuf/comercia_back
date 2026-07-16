"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePanel } from "@/components/panel/contexto";
import { ModulosPanel } from "@/components/admin/modulos-panel";
import { EmpresasPanel } from "@/components/admin/empresas-panel";
import { OperacionesCampoPanel } from "@/components/admin/impulsador-panel";

type Tab = "modulos" | "empresas" | "operaciones";

export default function AdminPage() {
  const router = useRouter();
  const { usuario } = usePanel();
  const [tab, setTab] = useState<Tab>("modulos");

  // Doble candado: el guard del back protege los datos; esto evita mostrar la
  // pantalla a un no-superadmin que llegue por URL.
  useEffect(() => {
    if (!usuario.esSuperadmin) {
      router.replace("/panel");
    }
  }, [usuario.esSuperadmin, router]);

  if (!usuario.esSuperadmin) {
    return null;
  }

  const tabClase = (t: Tab) =>
    `border-b-2 px-4 py-2.5 text-sm font-medium transition ${
      tab === t
        ? "border-brand-700 text-brand-800 dark:border-brand-400 dark:text-brand-300"
        : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
    }`;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Administración</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Configurá los módulos, páginas y ejecutables de la plataforma, y qué ve
        cada empresa.
      </p>

      <div className="mt-6 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setTab("modulos")}
          className={tabClase("modulos")}
        >
          Módulos y páginas
        </button>
        <button
          type="button"
          onClick={() => setTab("empresas")}
          className={tabClase("empresas")}
        >
          Acceso por empresa
        </button>
        <button
          type="button"
          onClick={() => setTab("operaciones")}
          className={tabClase("operaciones")}
        >
          Roles de campo
        </button>
      </div>

      <div className="mt-6">
        {tab === "modulos" && <ModulosPanel />}
        {tab === "empresas" && <EmpresasPanel />}
        {tab === "operaciones" && <OperacionesCampoPanel />}
      </div>
    </div>
  );
}
