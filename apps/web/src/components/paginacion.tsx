"use client";

// Paginador estándar de comercIA para TODA tabla (7 filas por defecto).
// Uso: mantener page/limit en el estado de la página y pedir a la API con
// ?page=X&limit=Y (la API responde RespuestaPaginada<T> — ver @/types/paginacion).

const OPCIONES_POR_PAGINA = [7, 15, 30];

export function Paginacion({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}) {
  const desde = total === 0 ? 0 : (page - 1) * limit + 1;
  const hasta = Math.min(page * limit, total);

  const botonBase =
    "grid h-9 min-w-9 place-items-center rounded-lg border border-zinc-300 px-2 text-sm transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-brand-600/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:border-zinc-700 dark:hover:bg-zinc-800";

  return (
    <div className="flex flex-col items-center justify-between gap-3 pt-4 sm:flex-row">
      <p className="text-xs text-zinc-500 [font-variant-numeric:tabular-nums] dark:text-zinc-400">
        {desde}–{hasta} de {total} registros
      </p>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          Por página
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="rounded-lg border border-zinc-300 bg-transparent px-2 py-1.5 text-sm outline-none focus:border-brand-600 dark:border-zinc-700 dark:bg-zinc-900"
          >
            {OPCIONES_POR_PAGINA.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Página anterior"
          className={botonBase}
        >
          ‹
        </button>
        <span className="text-sm [font-variant-numeric:tabular-nums]">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Página siguiente"
          className={botonBase}
        >
          ›
        </button>
      </div>
    </div>
  );
}
