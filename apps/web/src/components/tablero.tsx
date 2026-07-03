"use client";

import { motion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ============================================================
// DATOS DE EJEMPLO — reemplazar por datos reales de la API
// cuando existan los módulos de ventas/pedidos/clientes.
// Montos en millones de guaraníes.
// ============================================================

const VENTAS_MENSUALES = [
  { mes: "Ene", actual: 118, anterior: 102 },
  { mes: "Feb", actual: 125, anterior: 110 },
  { mes: "Mar", actual: 138, anterior: 121 },
  { mes: "Abr", actual: 129, anterior: 118 },
  { mes: "May", actual: 147, anterior: 125 },
  { mes: "Jun", actual: 141, anterior: 132 },
  { mes: "Jul", actual: 152, anterior: 128 },
  { mes: "Ago", actual: null, anterior: 135 },
  { mes: "Sep", actual: null, anterior: 130 },
  { mes: "Oct", actual: null, anterior: 138 },
  { mes: "Nov", actual: null, anterior: 144 },
  { mes: "Dic", actual: null, anterior: 158 },
];

// Cada categoría con su tono fijo de la paleta validada (identidad, no rango)
const VENTAS_POR_CATEGORIA = [
  { categoria: "Vacuno", ventas: 480, color: "var(--viz-c1)" },
  { categoria: "Cerdo", ventas: 210, color: "var(--viz-c2)" },
  { categoria: "Pollo", ventas: 165, color: "var(--viz-c3)" },
  { categoria: "Embutidos", ventas: 120, color: "var(--viz-c4)" },
  { categoria: "Menudencias", ventas: 60, color: "var(--viz-c5)" },
];

const TENDENCIA_VENTAS = VENTAS_MENSUALES.filter((d) => d.actual !== null).map(
  (d) => ({ mes: d.mes, valor: d.actual as number }),
);

const KPIS = [
  {
    titulo: "Ventas del mes",
    valor: "₲ 152 M",
    delta: "+12,4%",
    positivo: true,
    detalle: "vs. mes anterior",
    tendencia: TENDENCIA_VENTAS,
    acento: "ventas",
  },
  {
    titulo: "Pedidos abiertos",
    valor: "37",
    delta: "-5",
    positivo: true,
    detalle: "menos que ayer",
    tendencia: null,
    acento: "pedidos",
  },
  {
    titulo: "Clientes activos",
    valor: "214",
    delta: "+9",
    positivo: true,
    detalle: "este mes",
    tendencia: null,
    acento: "clientes",
  },
  {
    titulo: "Cumplimiento de meta",
    valor: "82%",
    delta: "₲ 33 M restantes",
    positivo: null,
    detalle: "meta mensual ₲ 185 M",
    tendencia: null,
    acento: "meta",
    progreso: 0.82,
  },
] as const;

// Chip de color e ícono por KPI (cada indicador con identidad propia)
const CHIPS: Record<
  (typeof KPIS)[number]["acento"],
  { clase: string; icono: React.ReactNode }
> = {
  ventas: {
    clase:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    icono: <IconoDinero />,
  },
  pedidos: {
    clase: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    icono: <IconoPedido />,
  },
  clientes: {
    clase:
      "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
    icono: <IconoGente />,
  },
  meta: {
    clase: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    icono: <IconoMeta />,
  },
};

const formatoGs = (v: number) => `₲ ${v} M`;

// Animación de entrada: tarjetas en cascada, sutil
const aparecer = {
  oculto: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" as const },
  }),
};

const tarjeta =
  "rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900";

export function Tablero() {
  return (
    <div className="mt-8 flex flex-col gap-4">
      {/* Fila de KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {KPIS.map((kpi, i) => (
          <motion.div
            key={kpi.titulo}
            custom={i}
            initial="oculto"
            animate="visible"
            variants={aparecer}
            className={tarjeta}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
                {kpi.titulo}
              </p>
              <span
                aria-hidden
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${CHIPS[kpi.acento].clase}`}
              >
                {CHIPS[kpi.acento].icono}
              </span>
            </div>
            <p className="mt-1 text-2xl font-bold sm:text-3xl">{kpi.valor}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              {kpi.positivo !== null && (
                <span
                  className={
                    kpi.positivo
                      ? "font-semibold text-[#006300] dark:text-[#0ca30c]"
                      : "font-semibold text-red-700 dark:text-red-400"
                  }
                >
                  {kpi.positivo ? "▲" : "▼"} {kpi.delta}
                </span>
              )}
              {kpi.positivo === null && (
                <span className="font-medium">{kpi.delta}</span>
              )}
              <span>{kpi.detalle}</span>
            </p>

            {kpi.tendencia && (
              <div className="mt-3 h-9">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={kpi.tendencia}>
                    <Line
                      type="monotone"
                      dataKey="valor"
                      stroke="var(--viz-serie)"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {"progreso" in kpi && kpi.progreso !== undefined && (
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                role="meter"
                aria-valuenow={Math.round(kpi.progreso * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Cumplimiento de la meta mensual"
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${kpi.progreso * 100}%` }}
                  transition={{ delay: 0.4, duration: 0.6, ease: "easeOut" }}
                  className="h-full rounded-full bg-amber-500 dark:bg-amber-400"
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <motion.section
          custom={4}
          initial="oculto"
          animate="visible"
          variants={aparecer}
          className={tarjeta}
          aria-label="Ventas mensuales de este año comparadas con el año anterior"
        >
          <EncabezadoGrafico
            titulo="Ventas mensuales"
            subtitulo="Millones de guaraníes · 2026 vs. 2025"
          />
          <div className="mt-2 h-64 [font-variant-numeric:tabular-nums]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={VENTAS_MENSUALES}
                margin={{ top: 8, right: 44, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  stroke="var(--viz-grid)"
                  strokeWidth={1}
                  vertical={false}
                />
                <XAxis
                  dataKey="mes"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--viz-ink)", fontSize: 11 }}
                />
                <YAxis
                  width={34}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--viz-ink)", fontSize: 11 }}
                />
                <Tooltip
                  content={<TooltipComercia unidad="₲ M" />}
                  cursor={{ stroke: "var(--viz-ink)", strokeWidth: 1, strokeDasharray: "3 3" }}
                />
                {/* Año anterior en azul (2 series con etiquetas directas + leyenda) */}
                <Line
                  type="monotone"
                  dataKey="anterior"
                  name="2025"
                  stroke="var(--viz-c1)"
                  strokeWidth={2}
                  dot={false}
                  label={<EtiquetaFinal texto="2025" total={12} claseTexto="fill-[var(--viz-c1)]" />}
                />
                {/* Énfasis (año actual) */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="2026"
                  stroke="var(--viz-serie)"
                  strokeWidth={2.5}
                  dot={false}
                  label={<EtiquetaFinal texto="2026" total={7} claseTexto="fill-[var(--viz-serie)]" />}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <Leyenda
            items={[
              { color: "var(--viz-serie)", texto: "2026 (hasta julio)" },
              { color: "var(--viz-c1)", texto: "2025" },
            ]}
          />
        </motion.section>

        <motion.section
          custom={5}
          initial="oculto"
          animate="visible"
          variants={aparecer}
          className={tarjeta}
          aria-label="Ventas por categoría de producto"
        >
          <EncabezadoGrafico
            titulo="Ventas por categoría"
            subtitulo="Millones de guaraníes · últimos 12 meses"
          />
          <div className="mt-2 h-64 [font-variant-numeric:tabular-nums]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={VENTAS_POR_CATEGORIA}
                layout="vertical"
                margin={{ top: 4, right: 44, bottom: 0, left: 8 }}
                barCategoryGap="28%"
              >
                <CartesianGrid
                  stroke="var(--viz-grid)"
                  strokeWidth={1}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--viz-ink)", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="categoria"
                  width={90}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--viz-ink)", fontSize: 12 }}
                />
                <Tooltip
                  content={<TooltipComercia unidad="₲ M" />}
                  cursor={{ fill: "var(--viz-grid)", opacity: 0.35 }}
                />
                <Bar
                  dataKey="ventas"
                  name="Ventas"
                  barSize={14}
                  radius={[0, 4, 4, 0]}
                  label={{
                    position: "right",
                    fill: "var(--viz-etiqueta)",
                    fontSize: 11,
                    fontWeight: 600,
                    formatter: (v: unknown) => formatoGs(v as number),
                  }}
                >
                  {VENTAS_POR_CATEGORIA.map((c) => (
                    <Cell key={c.categoria} fill={c.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      </div>

      <p className="text-center text-xs text-zinc-400 dark:text-zinc-600">
        📊 Datos de ejemplo — se conectarán a las ventas reales cuando exista el
        módulo
      </p>
    </div>
  );
}

function IconoDinero() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M10.75 10.818v2.614A3.13 3.13 0 0011.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 00-1.138-.432zM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 00-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.202.592.037.051.08.102.128.152z" />
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13.5a.75.75 0 00-1.5 0v.272c-.4.06-.783.169-1.132.332-.749.35-1.368 1.017-1.368 1.937 0 .535.209 1.026.579 1.387.324.316.74.531 1.171.665.437.136.895.211 1.25.257v2.883c-.312-.067-.598-.176-.837-.316a2.502 2.502 0 01-.564-.435.75.75 0 10-1.098 1.022c.283.303.628.556.994.768.428.246.914.42 1.505.5v.228a.75.75 0 001.5 0v-.236a4.632 4.632 0 001.442-.44c.798-.435 1.458-1.183 1.458-2.199 0-.566-.223-1.067-.607-1.436-.354-.34-.809-.556-1.263-.696a7.29 7.29 0 00-1.03-.226V6.744c.363.081.679.226.918.421a.75.75 0 10.948-1.162 3.987 3.987 0 00-1.866-.792V4.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconoPedido() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path
        fillRule="evenodd"
        d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2H6zm2.75 5.5a.75.75 0 000 1.5h2.5a.75.75 0 000-1.5h-2.5zm0 3a.75.75 0 000 1.5h2.5a.75.75 0 000-1.5h-2.5zm-2-5.75a.75.75 0 100 1.5.75.75 0 000-1.5zm.75 3.5a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm-.75 2.25a.75.75 0 100 1.5.75.75 0 000-1.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconoGente() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
    </svg>
  );
}

function IconoMeta() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2.5a5.5 5.5 0 100-11 5.5 5.5 0 000 11zM10 13a3 3 0 100-6 3 3 0 000 6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function EncabezadoGrafico({
  titulo,
  subtitulo,
}: {
  titulo: string;
  subtitulo: string;
}) {
  return (
    <header className="flex items-start justify-between gap-2">
      <div>
        <h2 className="text-sm font-semibold">{titulo}</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{subtitulo}</p>
      </div>
      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
        ejemplo
      </span>
    </header>
  );
}

function Leyenda({ items }: { items: { color: string; texto: string }[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <span
          key={item.texto}
          className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300"
        >
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ background: item.color }}
          />
          {item.texto}
        </span>
      ))}
    </div>
  );
}

// Etiqueta directa en la punta de cada línea (relief del gris de contexto)
function EtiquetaFinal(props: {
  texto: string;
  total: number;
  claseTexto: string;
  x?: number;
  y?: number;
  index?: number;
}) {
  const { texto, total, claseTexto, x, y, index } = props;
  if (index !== total - 1 || x === undefined || y === undefined) {
    return null;
  }
  return (
    <text
      x={x + 8}
      y={y + 4}
      fontSize={11}
      fontWeight={600}
      className={claseTexto}
    >
      {texto}
    </text>
  );
}

// Recharts inyecta active/payload/label en tiempo de render; acá van opcionales
interface PropsTooltip {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{
    dataKey?: string | number;
    name?: string | number;
    value?: number | null;
    color?: string;
  }>;
  unidad: string;
}

function TooltipComercia({ active, payload, label, unidad }: PropsTooltip) {
  if (!active || !payload?.length) {
    return null;
  }
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
      <p className="font-semibold">{label}</p>
      {payload
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p) => (
          <p
            key={p.dataKey as string}
            className="mt-0.5 flex items-center gap-1.5 text-zinc-600 [font-variant-numeric:tabular-nums] dark:text-zinc-300"
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ background: p.color }}
            />
            {p.name}: {unidad === "₲ M" ? `₲ ${p.value} M` : p.value}
          </p>
        ))}
    </div>
  );
}
