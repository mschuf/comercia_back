"use client";

import Image from "next/image";
import imagenComercial from "@/assets/comercial-repositor-v2.webp";
import { usePanel } from "@/components/panel/contexto";
import { ResumenInicioOperativo } from "@/components/panel/resumen-inicio-operativo";
import { tieneOperacionCampo } from "@/utils/panel-inicio";

export default function PanelInicioPage() {
  const { usuario, modulos } = usePanel();
  const muestraResumenOperativo = tieneOperacionCampo(modulos);
  const esImpulsador = usuario.rol?.descripcion === "impulsador";
  const mensaje = esImpulsador
    ? "Revisá tus presentaciones y marcaciones antes de seguir con la jornada."
    : muestraResumenOperativo
      ? "Revisá el presentismo y atendé primero lo que necesita seguimiento."
      : usuario.esSuperadmin
        ? "Mantené los accesos y la operación listos para cada equipo."
        : "Todo lo que necesitás para organizar la operación comercial.";

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5">
      <section className="overflow-hidden rounded-[1.25rem] border border-commercial-ink bg-commercial-ink text-white">
        <div className="grid min-h-[8.25rem] grid-cols-[minmax(0,1fr)_5.5rem] sm:grid-cols-[minmax(0,1fr)_11rem]">
          <div className="flex min-w-0 flex-col justify-center px-4 py-4 sm:px-5">
            <p className="truncate text-[0.65rem] font-extrabold uppercase tracking-[0.15em] text-accent-on-ink">
              {usuario.empresa.nombre} · Panel de trabajo
            </p>
            <p className="mt-2 text-xs font-bold text-brand-100">
              Hola, {usuario.nombre}
            </p>
            <h1 className="mt-1 text-xl font-black leading-tight tracking-[-0.04em] text-white sm:text-2xl">
              Tu jornada empieza acá.
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-brand-100 sm:text-sm">
              {mensaje}
            </p>
          </div>

          <div className="relative min-h-full border-l-4 border-accent bg-brand-950">
            <Image
              src={imagenComercial}
              alt="Repositor trabajando en una góndola"
              fill
              fetchPriority="high"
              loading="eager"
              sizes="(max-width: 639px) 88px, 176px"
              className="object-cover object-[68%_center]"
            />
          </div>
        </div>
      </section>

      {!usuario.rol && !usuario.esSuperadmin ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <span className="font-bold">Tu cuenta está pendiente de rol.</span> Un
          superior debe asignártelo para habilitar tus módulos de trabajo.
        </div>
      ) : null}

      {muestraResumenOperativo ? (
        <ResumenInicioOperativo modulos={modulos} />
      ) : null}
    </div>
  );
}
