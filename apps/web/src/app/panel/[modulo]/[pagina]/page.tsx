"use client";

import { use } from "react";
import { usePanel } from "@/components/panel/contexto";

export default function PaginaModulo({
  params,
}: {
  params: Promise<{ modulo: string; pagina: string }>;
}) {
  const { modulo, pagina } = use(params);
  const { modulos } = usePanel();
  const mod = modulos.find((item) => item.ruta === modulo);
  const pag = mod?.paginas.find((item) => item.ruta === pagina);

  if (!mod || !pag) {
    return (
      <div className="rounded-xl border border-line bg-surface-raised p-8 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Esta página no está disponible para tu empresa.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-brand-700 dark:text-brand-400">
        {mod.nombre}
      </p>
      <h1 className="mt-1 text-xl font-bold tracking-tight">{pag.nombre}</h1>
      <div className="mt-8 grid place-items-center rounded-xl border border-dashed border-line bg-surface-raised p-12 text-center">
        <div className="max-w-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden>
              <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684z" />
            </svg>
          </div>
          <h2 className="mt-4 font-semibold">Página configurada</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Configurá sus ejecutables y contenido desde Administración.
          </p>
        </div>
      </div>
    </div>
  );
}
