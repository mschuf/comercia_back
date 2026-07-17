"use client";

import Image from "next/image";
import Link from "next/link";
import imagenComercial from "@/assets/comercial-repositor-v2.webp";
import { IconoModulo } from "@/components/panel/iconos";
import { usePanel } from "@/components/panel/contexto";

export default function PanelInicioPage() {
  const { usuario, modulos } = usePanel();
  const descripcionRol = usuario.esSuperadmin
    ? "Superadmin"
    : (usuario.rol?.descripcion ?? "Sin rol asignado");
  const textoRol = descripcionRol.toLocaleLowerCase("es");
  const paginas = modulos.flatMap((modulo) =>
    modulo.paginas.map((pagina) => ({
      href: `/panel/${modulo.ruta}/${pagina.ruta}`,
      nombre: pagina.nombre,
      modulo: modulo.nombre,
      icono: pagina.icono ?? modulo.icono,
    })),
  );
  const accesos = usuario.esSuperadmin
    ? [
        ...paginas,
        {
          href: "/panel/admin",
          nombre: "Administración",
          modulo: "Plataforma",
          icono: "equipo",
        },
      ]
    : paginas;

  const mensaje = textoRol.includes("repositor")
    ? "Tus clientes, tareas y recorridos del día, siempre a mano."
    : textoRol.includes("supervisor")
      ? "Acompañá al equipo en campo y convertí cada visita en decisiones."
      : usuario.esSuperadmin
        ? "Configurá la plataforma y mantené cada equipo listo para trabajar."
        : "Todo lo que necesitás para organizar la operación comercial.";

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="overflow-hidden rounded-[1.5rem] border border-[#315247] bg-commercial-ink text-white">
        <div className="grid min-h-[13rem] grid-cols-[minmax(0,1fr)_6.5rem] sm:min-h-[15rem] sm:grid-cols-[minmax(0,1.1fr)_minmax(14rem,0.9fr)]">
          <div className="flex min-w-0 flex-col justify-end p-4 sm:p-7 lg:p-8">
          <div className="mb-auto flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-[#557267] bg-[#25483d] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white">
              {descripcionRol}
            </span>
            <span className="rounded-full border border-[#76523a] bg-[#4a3427] px-3 py-1 text-[10px] font-bold text-[#f2ceb0]">
              {usuario.empresa.nombre}
            </span>
          </div>

          <p className="text-sm font-semibold text-[#efc39d]">Hola, {usuario.nombre}</p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-[-0.04em] sm:text-3xl">
            Tu jornada empieza acá.
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#d7e1dd] sm:text-base">
            {mensaje}
          </p>
          </div>

          <div className="relative min-h-full border-l-[5px] border-[#d9955d] bg-[#1b2f28]">
            <Image
              src={imagenComercial}
              alt="Repositor trabajando en una góndola"
              fill
              fetchPriority="high"
              loading="eager"
              sizes="(max-width: 639px) 104px, (max-width: 1023px) 42vw, 38vw"
              className="object-cover object-[68%_center]"
            />
          </div>
        </div>
      </section>

      {!usuario.rol && !usuario.esSuperadmin && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <span className="font-bold">Tu cuenta está pendiente de rol.</span>{" "}
          Un superior debe asignártelo para habilitar tus módulos de trabajo.
        </div>
      )}

      <section aria-labelledby="accesos-titulo" className="rounded-[1.4rem] border border-line bg-surface p-4 shadow-[0_14px_38px_rgba(var(--warm-shadow),0.06)] sm:p-5">
        <header className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brand-700 dark:text-brand-200">
              Espacio de trabajo
            </p>
            <h2 id="accesos-titulo" className="mt-1 text-lg font-extrabold tracking-[-0.025em] sm:text-xl">
              Accesos habilitados
            </h2>
          </div>
          <p className="text-xs font-semibold text-muted">
            {modulos.length} {modulos.length === 1 ? "módulo" : "módulos"} · {paginas.length}{" "}
            {paginas.length === 1 ? "página" : "páginas"}
          </p>
        </header>

        {accesos.length > 0 ? (
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {accesos.map((acceso) => (
              <Link
                key={acceso.href}
                href={acceso.href}
                className="group flex min-h-[5.25rem] items-center gap-3 rounded-2xl border border-line bg-surface-raised p-3.5 shadow-[0_5px_18px_rgba(var(--warm-shadow),0.04)] transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-[0_12px_26px_rgba(var(--warm-shadow),0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 transition group-hover:bg-brand-700 group-hover:text-white dark:bg-brand-950 dark:text-brand-200">
                  <IconoModulo nombre={acceso.icono} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                    {acceso.modulo}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-extrabold text-foreground">
                    {acceso.nombre}
                  </span>
                </span>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand-700"
                  aria-hidden
                >
                  <path d="M3 10a.75.75 0 01.75-.75h10.69l-3.22-3.22a.75.75 0 111.06-1.06l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 11-1.06-1.06l3.22-3.22H3.75A.75.75 0 013 10z" />
                </svg>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-line bg-surface-raised px-5 py-9 text-center">
            <p className="font-bold">Todavía no hay accesos habilitados.</p>
            <p className="mt-1 text-sm text-muted">
              Cuando un administrador configure tu rol, van a aparecer acá.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
