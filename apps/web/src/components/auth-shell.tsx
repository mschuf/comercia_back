import type { ReactNode } from "react";

// Layout de las pantallas de acceso: panel de marca + formulario sobre un
// fondo con motivos comerciales (patrón SVG local: carritos, ventas, paquetes).
// Componente presentacional puro (sin hooks): seguro para SSR.
// El modo claro/oscuro es automático: sigue la preferencia del dispositivo.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen flex-1 lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca */}
      <section className="relative hidden flex-col justify-between overflow-hidden bg-brand-900 p-12 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[url('/patron-comercial.svg')] bg-[length:260px_260px] opacity-[0.16] invert"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(16,185,129,0.35),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(5,150,105,0.3),transparent_50%)]"
        />
        <div className="relative">
          <BrandMark claro />
        </div>
        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            La herramienta de trabajo del equipo comercial
          </h2>
          <ul className="mt-6 space-y-3 text-[15px] text-brand-100">
            <li className="flex gap-3">
              <Punto /> Clientes, pedidos y ventas en un solo lugar
            </li>
            <li className="flex gap-3">
              <Punto /> Pensada para vendedores, supervisores y jefes
            </li>
            <li className="flex gap-3">
              <Punto /> Desde el escritorio o el celular, en la calle o en la oficina
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-brand-200/70">
          Frigorífico Guaraní · comercIA
        </p>
      </section>

      {/* Formulario sobre fondo comercial */}
      <section className="relative flex items-center justify-center overflow-hidden px-4 py-10 sm:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[url('/patron-comercial.svg')] bg-[length:260px_260px] opacity-[0.07] dark:opacity-[0.11]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--background)_85%)]"
        />
        <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white/95 p-6 shadow-xl backdrop-blur-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/95">
          <div className="mb-6 lg:hidden">
            <BrandMark />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}

export function BrandMark({ claro = false }: { claro?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`grid h-9 w-9 place-items-center rounded-lg text-lg font-black ${
          claro ? "bg-white text-brand-800" : "bg-brand-700 text-white"
        }`}
      >
        C
      </span>
      <span
        className={`text-xl font-bold tracking-tight ${claro ? "text-white" : ""}`}
      >
        comerc
        <span className={claro ? "text-brand-300" : "text-brand-600 dark:text-brand-500"}>
          IA
        </span>
      </span>
    </div>
  );
}

function Punto() {
  return (
    <span
      aria-hidden
      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500"
    />
  );
}
