// Clases compartidas de la interfaz (una sola fuente para inputs y botones)

export const inputBase =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-[15px] text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

export const labelBase =
  "flex flex-col gap-1.5 text-[13px] font-medium text-zinc-700 dark:text-zinc-300";

export const btnPrimary =
  "inline-flex items-center justify-center rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-600/40 disabled:cursor-not-allowed disabled:opacity-50";

export const btnGhost =
  "inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";

export const errorBox =
  "rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300";
