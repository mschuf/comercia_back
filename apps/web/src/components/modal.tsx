"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";

// Modal de comercIA — sigue las reglas de apps/web/AGENTS.md:
// se cierra SOLO con la X, con Escape o con el botón Cancelar/Cerrar.
// El clic en el fondo NO cierra (evita perder formularios por accidente).
export function Modal({
  titulo,
  abierto,
  onCerrar,
  children,
  ancho = "md",
}: {
  titulo: string;
  abierto: boolean;
  onCerrar: () => void;
  children: ReactNode;
  // "lg"/"xl" para formularios anchos; "md" es el default historico
  ancho?: "md" | "lg" | "xl";
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const disparadorRef = useRef<HTMLElement | null>(null);
  const anchoClase =
    ancho === "xl" ? "max-w-5xl" : ancho === "lg" ? "max-w-2xl" : "max-w-md";

  useEffect(() => {
    if (!abierto) {
      return;
    }
    // Foco: entra al modal al abrir, vuelve al disparador al cerrar
    disparadorRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    document.body.style.overflow = "hidden";

    function alTeclear(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCerrar();
      }
    }
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = "";
      disparadorRef.current?.focus?.();
    };
  }, [abierto, onCerrar]);

  return (
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          {/* Fondo oscurecido: NO cierra el modal a propósito */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`relative w-full ${anchoClase} max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl outline-none dark:border-zinc-800 dark:bg-zinc-900 sm:p-6`}
          >
            <header className="flex items-start justify-between gap-4">
              <h2 className="text-lg font-bold tracking-tight">{titulo}</h2>
              <button
                type="button"
                onClick={onCerrar}
                aria-label="Cerrar"
                className="grid h-8 w-8 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </header>
            <div className="mt-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
