"use client";

import { useState } from "react";
import { ClientesView } from "@/components/clientes/clientes-view";
import { LocalesView } from "@/components/locales/locales-view";
import type { Cliente } from "@/types/cliente";

type Tab = "clientes" | "locales";

export function ClientesLocalesView({
  vistaInicial = "clientes",
  repositorInicial,
}: {
  vistaInicial?: Tab;
  repositorInicial?: { id?: number; nombre: string };
}) {
  const [tab, setTab] = useState<Tab>(vistaInicial);
  const [clienteFiltro, setClienteFiltro] = useState<
    Pick<Cliente, "id" | "nombre"> | undefined
  >(undefined);
  const [repositorFiltro, setRepositorFiltro] = useState(repositorInicial);
  const clase = (actual: Tab) =>
    `min-h-11 border-b-2 px-4 py-2.5 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-brand-600/40 ${
      tab === actual
        ? "border-brand-700 text-brand-800 dark:border-brand-400 dark:text-brand-300"
        : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
    }`;
  return (
    <div>
      <div className="mb-6 flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setTab("clientes")}
          className={clase("clientes")}
        >
          Clientes
        </button>
        <button
          type="button"
          onClick={() => {
            setClienteFiltro(undefined);
            setRepositorFiltro(undefined);
            setTab("locales");
          }}
          className={clase("locales")}
        >
          Locales
        </button>
      </div>
      {tab === "clientes" ? (
        <ClientesView
          onVerLocales={(cliente) => {
            setClienteFiltro(cliente);
            setRepositorFiltro(undefined);
            setTab("locales");
          }}
        />
      ) : (
        <LocalesView
          key={`${clienteFiltro?.id ?? "todos"}-${
            repositorFiltro?.id ?? repositorFiltro?.nombre ?? "todos"
          }`}
          clienteInicial={clienteFiltro}
          repositorInicial={repositorFiltro}
          onLimpiarCliente={() => setClienteFiltro(undefined)}
          onLimpiarRepositor={() => setRepositorFiltro(undefined)}
        />
      )}
    </div>
  );
}
