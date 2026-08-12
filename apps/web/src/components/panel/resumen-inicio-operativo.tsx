"use client";

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5
 * genre: modern-minimal · macrostructure: Stat-Led · tone: operational-friendly
 * anchor hue: commercial green + copper · H4: tabular / below / row-of-four
 * contrast: pass (40–41) · honest: pass (46) · tokens: pass (48)
 * responsive: pass (34, 49, 50–57) · icons: pass (30)
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconoModulo } from "@/components/panel/iconos";
import { ApiError, apiFetch } from "@/lib/api";
import type { ModuloMenu } from "@/types/plataforma";
import type {
  MetricaPresentismo,
  ResumenInicioOperativo,
} from "@/types/presentismo";
import { hrefDisponible } from "@/utils/panel-inicio";

interface Props {
  modulos: ModuloMenu[];
}

interface TarjetaKpiProps {
  etiqueta: string;
  valor: number;
  detalle: string;
  icono: string;
  href: string | null;
  alerta?: boolean;
}

const RUTAS_PRESENTISMO = [
  { modulo: "supervisor-impulsador", pagina: "presentismo" },
  { modulo: "teamleader-impulsador", pagina: "presentismo" },
  { modulo: "supervisor", pagina: "equipo" },
] as const;

const RUTAS_EQUIPO = [
  { modulo: "supervisor-impulsador", pagina: "equipo" },
  { modulo: "teamleader-impulsador", pagina: "equipo" },
  { modulo: "supervisor", pagina: "equipo" },
] as const;

const RUTAS_LOCALES = [
  { modulo: "supervisor-impulsador", pagina: "locales" },
  { modulo: "teamleader-impulsador", pagina: "locales" },
  { modulo: "repositor", pagina: "clientes" },
  { modulo: "impulsador", pagina: "entrada" },
] as const;

const RUTAS_MARCACIONES = [
  { modulo: "impulsador", pagina: "marcaciones" },
  { modulo: "repositor", pagina: "visitas" },
] as const;

const RUTAS_ENTRADA = [
  { modulo: "impulsador", pagina: "entrada" },
  { modulo: "repositor", pagina: "visitas" },
] as const;

function TarjetaKpi({
  etiqueta,
  valor,
  detalle,
  icono,
  href,
  alerta = false,
}: TarjetaKpiProps) {
  const contenido = (
    <>
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
          alerta
            ? "bg-[var(--accent-soft)] text-accent-ink"
            : "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200"
        }`}
      >
        <IconoModulo nombre={icono} className="h-[1.125rem] w-[1.125rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.68rem] font-extrabold uppercase tracking-[0.11em] text-muted">
          {etiqueta}
        </span>
        <span className="mt-1 block text-2xl font-black leading-none tracking-[-0.04em] text-foreground [font-variant-numeric:tabular-nums]">
          {valor}
        </span>
        <span className="mt-1 block text-xs leading-snug text-muted">
          {detalle}
        </span>
      </span>
      {href ? (
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 shrink-0 text-muted transition-colors duration-150 group-hover:text-brand-700 motion-reduce:transition-none dark:group-hover:text-brand-200"
          aria-hidden
        >
          <path d="M3 10a.75.75 0 01.75-.75h10.69l-3.22-3.22a.75.75 0 111.06-1.06l4.5 4.5a.75.75 0 010 1.06l-4.5 4.5a.75.75 0 11-1.06-1.06l3.22-3.22H3.75A.75.75 0 013 10z" />
        </svg>
      ) : null}
    </>
  );
  const clase = `group flex min-h-[6.5rem] min-w-0 items-start gap-3 rounded-xl border p-3 ${
    alerta
      ? "border-accent bg-[var(--accent-soft)]/35"
      : "border-line bg-surface-raised"
  }`;

  if (!href) return <article className={clase}>{contenido}</article>;
  return (
    <Link
      href={href}
      className={`${clase} cursor-pointer transition-[background-color,border-color] duration-150 hover:border-brand-500 hover:bg-surface-soft active:bg-surface-soft focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transition-none`}
      aria-label={`${etiqueta}: ${valor}. Ver detalle`}
    >
      {contenido}
    </Link>
  );
}

function BarraPeriodo({
  etiqueta,
  metrica,
  color,
}: {
  etiqueta: string;
  metrica: MetricaPresentismo;
  color: string;
}) {
  const valor = metrica.programadas > 0 ? `${metrica.porcentaje}%` : "—";
  return (
    <div
      className="grid min-w-0 grid-cols-[4.25rem_minmax(0,1fr)_3.5rem] items-center gap-2"
      role="img"
      aria-label={`${etiqueta}: ${metrica.entradas} entradas de ${metrica.programadas} presentaciones, ${valor}`}
    >
      <span className="text-xs font-bold text-foreground">{etiqueta}</span>
      <span className="h-2 min-w-0 overflow-hidden rounded-full bg-surface-soft">
        <span
          className={`block h-full rounded-full ${color}`}
          style={{ width: `${metrica.porcentaje}%` }}
        />
      </span>
      <span className="text-right text-xs font-black text-foreground [font-variant-numeric:tabular-nums]">
        {valor}
      </span>
    </div>
  );
}

export function ResumenInicioOperativo({ modulos }: Props) {
  const [resumen, setResumen] = useState<ResumenInicioOperativo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    void apiFetch<ResumenInicioOperativo>("/presentismo/inicio")
      .then((respuesta) => {
        if (!vigente) return;
        setResumen(respuesta);
        setError(null);
      })
      .catch((causa) => {
        if (!vigente) return;
        setError(
          causa instanceof ApiError
            ? causa.message
            : "No pudimos cargar el resumen operativo",
        );
      });
    return () => {
      vigente = false;
    };
  }, []);

  if (error) {
    return (
      <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
        {error}
      </p>
    );
  }

  if (!resumen) {
    return (
      <section
        className="rounded-[1.35rem] border border-line bg-surface p-4 sm:p-5"
        aria-label="Cargando resumen operativo"
      >
        <div className="h-7 w-52 animate-pulse rounded-lg bg-surface-soft motion-reduce:animate-none" />
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)]">
          <div className="h-44 animate-pulse rounded-xl bg-surface-soft motion-reduce:animate-none" />
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-[6.5rem] animate-pulse rounded-xl bg-surface-soft motion-reduce:animate-none"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const esGestor = ["SUPERVISOR", "TEAMLEADER", "GESTOR"].includes(
    resumen.perfil,
  );
  const hrefPresentismo = hrefDisponible(modulos, RUTAS_PRESENTISMO);
  const hrefEquipo = hrefDisponible(modulos, RUTAS_EQUIPO);
  const hrefLocales = hrefDisponible(modulos, RUTAS_LOCALES);
  const hrefMarcaciones = hrefDisponible(modulos, RUTAS_MARCACIONES);
  const hrefEntrada = hrefDisponible(modulos, RUTAS_ENTRADA);
  const hrefPrincipal = esGestor
    ? hrefPresentismo
    : (hrefMarcaciones ?? hrefEntrada);
  const pendientes = Math.max(
    0,
    resumen.dia.programadas - resumen.dia.entradas,
  );
  const titulo =
    resumen.perfil === "SUPERVISOR"
      ? "Pulso de toda la operación"
      : resumen.perfil === "TEAMLEADER"
        ? "Pulso de tu equipo"
        : resumen.perfil === "IMPULSADOR"
          ? "Tu presencia de hoy"
          : esGestor
            ? "Pulso del equipo"
            : "Tu jornada de hoy";
  const valorPrincipal =
    resumen.dia.programadas > 0 ? `${resumen.dia.porcentaje}%` : "—";

  const tarjetas = esGestor
    ? [
        {
          etiqueta:
            resumen.perfil === "SUPERVISOR"
              ? "Personas en alcance"
              : "Impulsadores a cargo",
          valor: resumen.alcance.personas,
          detalle:
            resumen.perfil === "SUPERVISOR"
              ? `${resumen.alcance.teamleaders} team leaders · ${resumen.alcance.impulsadores} impulsadores`
              : "equipo directo activo",
          icono: "equipo",
          href: hrefEquipo,
        },
        {
          etiqueta: "Visitas abiertas",
          valor: resumen.actividad.enCurso,
          detalle: "entradas todavía sin salida",
          icono: "visitas",
          href: hrefPresentismo ?? hrefEquipo,
        },
        {
          etiqueta: "Sin entrada",
          valor: pendientes,
          detalle: `de ${resumen.dia.programadas} previstas hasta ahora`,
          icono: "tareas",
          href: hrefPresentismo,
          alerta: pendientes > 0,
        },
        {
          etiqueta: "Locales asignados",
          valor: resumen.alcance.localesAsignados,
          detalle: "dentro de tu alcance visible",
          icono: "locales",
          href: hrefLocales,
        },
      ]
    : [
        {
          etiqueta: "Entradas",
          valor: resumen.dia.entradas,
          detalle: `de ${resumen.dia.programadas} previstas hasta ahora`,
          icono: "visitas",
          href: hrefMarcaciones,
        },
        {
          etiqueta: "Salidas",
          valor: resumen.dia.salidas,
          detalle: "jornadas cerradas correctamente",
          icono: "reportes",
          href: hrefMarcaciones,
        },
        {
          etiqueta: "Pendientes",
          valor: pendientes,
          detalle: "presentaciones aún sin entrada",
          icono: "tareas",
          href: hrefEntrada,
          alerta: pendientes > 0,
        },
        {
          etiqueta: "Locales asignados",
          valor: resumen.alcance.localesAsignados,
          detalle: "puntos activos a tu cargo",
          icono: "locales",
          href: hrefEntrada ?? hrefLocales,
        },
      ];

  const principal = (
    <>
      <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-accent-on-ink">
        Presentismo hoy
      </span>
      <span className="mt-2 block text-[clamp(3.5rem,10vw,6rem)] font-black leading-[0.84] tracking-[-0.065em] text-white [font-variant-numeric:tabular-nums]">
        {valorPrincipal}
      </span>
      <span className="mt-4 block max-w-sm text-base font-extrabold leading-tight text-white">
        {resumen.dia.programadas > 0
          ? `${resumen.dia.entradas} de ${resumen.dia.programadas} presentaciones registradas.`
          : "Sin presentaciones previstas hasta este momento."}
      </span>
      <span className="mt-2 block text-xs leading-relaxed text-brand-100">
        {resumen.dia.salidas} salidas registradas · datos acumulados hasta ahora
      </span>
      {hrefPrincipal ? (
        <span className="mt-5 inline-flex min-h-11 items-center whitespace-nowrap rounded-lg border border-brand-200 px-4 text-sm font-bold text-white transition-colors duration-150 group-hover:bg-brand-950 motion-reduce:transition-none">
          Ver detalle
        </span>
      ) : null}
    </>
  );

  return (
    <section
      aria-labelledby="resumen-operativo-titulo"
      className="min-w-0 rounded-[1.35rem] border border-line bg-surface p-4 shadow-[0_14px_38px_rgba(var(--warm-shadow),0.06)] sm:p-5"
    >
      <header className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.16em] text-accent-ink">
            Resumen operativo
          </p>
          <h2
            id="resumen-operativo-titulo"
            className="mt-1 text-xl font-black tracking-[-0.035em] text-foreground sm:text-2xl"
          >
            {titulo}
          </h2>
        </div>
        <p className="text-xs font-semibold text-muted">
          Actualizado con las marcaciones de hoy
        </p>
      </header>

      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.38fr)]">
        {hrefPrincipal ? (
          <Link
            href={hrefPrincipal}
            className="group flex min-h-[13rem] min-w-0 cursor-pointer flex-col justify-between rounded-xl border border-commercial-ink bg-commercial-ink p-5 transition-colors duration-150 hover:border-brand-500 active:bg-brand-950 focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface motion-reduce:transition-none"
            aria-label={`Presentismo hoy: ${valorPrincipal}. Ver detalle`}
          >
            {principal}
          </Link>
        ) : (
          <article className="flex min-h-[13rem] min-w-0 flex-col justify-between rounded-xl border border-commercial-ink bg-commercial-ink p-5">
            {principal}
          </article>
        )}

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          {tarjetas.map((tarjeta) => (
            <TarjetaKpi key={tarjeta.etiqueta} {...tarjeta} />
          ))}
        </div>
      </div>

      <div className="mt-3 grid min-w-0 gap-4 rounded-xl border border-line bg-surface-raised p-4 md:grid-cols-[minmax(0,0.48fr)_minmax(0,1fr)] md:items-center">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-foreground">
            Presentismo acumulado
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Compara entradas verificadas con presentaciones previstas. Semana y
            mes llegan hasta hoy.
          </p>
        </div>
        <div className="min-w-0 space-y-3">
          <BarraPeriodo
            etiqueta="Hoy"
            metrica={resumen.dia}
            color="bg-brand-700 dark:bg-brand-300"
          />
          <BarraPeriodo
            etiqueta="Semana"
            metrica={resumen.semana}
            color="bg-accent dark:bg-accent"
          />
          <BarraPeriodo
            etiqueta="Mes"
            metrica={resumen.mes}
            color="bg-commercial-ink dark:bg-brand-200"
          />
        </div>
      </div>
    </section>
  );
}
