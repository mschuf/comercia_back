"use client";

import { use, type ComponentType } from "react";
import { usePanel } from "@/components/panel/contexto";
import { LocalesView } from "@/components/locales/locales-view";
import { MapaView } from "@/components/impulsador/mapa-view";
import { VisitasView } from "@/components/impulsador/visitas-view";

// Registro de vistas con interfaz propia: "ruta-modulo/ruta-pagina" → componente.
// Las páginas que no estén acá muestran el placeholder de "configurada" (su
// ejecución de datos por ejecutables llega en la próxima etapa).
const VISTAS: Record<string, ComponentType> = {
  "impulsador/locales": LocalesView,
  "impulsador/mapa": MapaView,
  "impulsador/visitas": VisitasView,
};

export default function PaginaModulo({
  params,
}: {
  params: Promise<{ modulo: string; pagina: string }>;
}) {
  const { modulo, pagina } = use(params);
  const { modulos } = usePanel();

  const mod = modulos.find((m) => m.ruta === modulo);
  const pag = mod?.paginas.find((p) => p.ruta === pagina);

  if (!mod || !pag) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Esta página no está disponible para tu empresa.
        </p>
      </div>
    );
  }

  const Vista = VISTAS[`${modulo}/${pagina}`];

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-brand-700 dark:text-brand-400">
        {mod.nombre}
      </p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{pag.nombre}</h1>

      {Vista ? (
        <div className="mt-6">
          <Vista />
        </div>
      ) : (
        <div className="mt-8 grid place-items-center rounded-xl border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <div className="max-w-sm">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6" aria-hidden>
                <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684z" />
              </svg>
            </div>
            <h2 className="mt-4 font-semibold">Página configurada ✓</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              La ejecución de sus datos (procedimientos, consultas y grillas) se
              habilita en la próxima etapa. La configuración del contenido ya la
              administra el superadmin desde el panel de Administración.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
