import Image from "next/image";
import type { ReactNode } from "react";
import imagenComercial from "@/assets/comercial-repositor-v2.webp";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-svh bg-[#10231d] lg:grid lg:grid-cols-[minmax(430px,0.84fr)_minmax(0,1.16fr)]">
      <section className="bg-[#183129] lg:col-start-2 lg:row-start-1 lg:min-h-svh">
        <div className="relative h-[28svh] min-h-52 overflow-hidden bg-[#1b2f28] lg:h-full lg:min-h-svh">
          <Image
            src={imagenComercial}
            alt="Repositor verificando productos de una góndola con una tablet y un lector"
            fill
            fetchPriority="high"
            loading="eager"
            sizes="(max-width: 1023px) 100vw, 58vw"
            className="object-cover object-[66%_center] lg:object-[70%_center]"
          />

          <div className="absolute left-4 top-4 rounded-2xl border border-[#4d695f] bg-[#10231d] px-3 py-2.5 sm:left-6 sm:top-6 lg:hidden">
            <BrandMark claro />
          </div>
        </div>

        <div className="bg-[#d9955d] px-5 py-3.5 text-[#12231d] sm:px-7 lg:hidden">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#58341f]">
            Operación comercial
          </p>
          <h2 className="mt-1 text-xl font-extrabold leading-tight tracking-[-0.035em] sm:text-2xl">
            Tu operación, en movimiento.
          </h2>
        </div>
      </section>

      <section className="flex min-h-[58svh] w-full min-w-0 items-start justify-center bg-[#10231d] px-5 py-7 text-white sm:px-9 sm:py-10 lg:col-start-1 lg:row-start-1 lg:grid lg:min-h-svh lg:grid-rows-[auto_1fr_auto] lg:border-r-[6px] lg:border-[#d9955d] lg:px-[clamp(2.5rem,4vw,4.75rem)] lg:py-8">
        <header className="hidden items-center justify-between gap-5 lg:flex">
          <BrandMark claro />
          <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#efb37f]">
            Operación comercial
          </span>
        </header>

        <div className="w-full max-w-md self-center [--border:#405a50] [--control-border:#658077] [--foreground:#fffaf3] [--muted:#b9c9c3] [--surface-raised:#183129] [--surface-soft:#203d34]">
          <div className="hidden lg:block">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#efb37f]">
              Trabajo en campo
            </p>
            <h2 className="mt-3 max-w-sm text-[clamp(2rem,3vw,3rem)] font-extrabold leading-[1.04] tracking-[-0.05em] text-white">
              Tu operación, en movimiento.
            </h2>
            <p className="mt-3 max-w-sm text-sm font-medium leading-relaxed text-[#c7d5d0]">
              Visitas, clientes y tareas conectados en una sola jornada.
            </p>
            <div aria-hidden className="mt-6 h-1 w-14 rounded-full bg-[#d9955d]" />
          </div>

          <div className="lg:mt-8">{children}</div>
        </div>

        <p className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-[#82968f] lg:block">
          comercIA · gestión comercial en campo
        </p>
      </section>
    </main>
  );
}

export function BrandMark({ claro = false }: { claro?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border text-lg font-black ${
          claro
            ? "border-white bg-white text-brand-900"
            : "border-brand-700 bg-brand-700 text-white"
        }`}
      >
        C
        <span
          aria-hidden
          className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-accent"
        />
      </span>
      <span
        className={`truncate text-xl font-extrabold tracking-[-0.045em] ${claro ? "text-white" : "text-foreground"}`}
      >
        comerc
        <span className={claro ? "text-[#efb37f]" : "text-accent"}>IA</span>
      </span>
    </div>
  );
}
