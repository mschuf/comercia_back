"use client";

import { usePanel } from "@/components/panel/contexto";

export default function PanelInicioPage() {
  const { usuario, modulos } = usePanel();

  return (
    <div className="min-w-0 space-y-5">
      <section className="rounded-[1.25rem] border border-commercial-ink bg-commercial-ink px-5 py-6 text-white sm:px-7 sm:py-8">
        <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.15em] text-accent-on-ink">
          {usuario.empresa.nombre} · Panel de trabajo
        </p>
        <p className="mt-3 text-sm font-bold text-brand-100">Hola, {usuario.nombre}</p>
        <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] sm:text-3xl">
          Bienvenido a Comercia.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-brand-100">
          Elegí una página del menú para comenzar.
        </p>
      </section>

      {!usuario.rol && !usuario.esSuperadmin ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <span className="font-bold">Tu cuenta está pendiente de rol.</span> Un administrador debe asignártelo para habilitar módulos.
        </div>
      ) : null}

      {modulos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-surface-raised p-6 text-sm text-muted">
          Todavía no hay módulos asignados a tu empresa.
        </div>
      ) : null}
    </div>
  );
}
