"use client";

export function PantallaCarga({
  visible,
  mensaje,
  detalle,
}: {
  visible: boolean;
  mensaje: string;
  detalle?: string;
}) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[5000] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy="true"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/95 p-5 text-zinc-950 shadow-2xl shadow-black/40 dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-50">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
            aria-hidden
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-6 w-6"
            >
              <path d="M3.5 6.5h10v10h-10z" />
              <path d="M13.5 10h3.2l3.8 3.8v2.7h-7z" />
              <circle cx="7" cy="18" r="1.7" />
              <circle cx="17.5" cy="18" r="1.7" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="font-semibold">{mensaje}</p>
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {detalle ?? "Esperá un momento, estamos procesando la operación."}
            </p>
          </div>
        </div>

        <div
          className="mt-5 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
          role="progressbar"
          aria-label={mensaje}
        >
          <div className="pantalla-carga-indeterminada h-full w-2/5 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />
        </div>
      </div>
    </div>
  );
}
