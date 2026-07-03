"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { apiFetch, type UsuarioSesion } from "@/lib/api";
import { BrandMark } from "@/components/auth-shell";
import { BotonTema } from "@/components/boton-tema";
import { Modal } from "@/components/modal";
import { Tablero } from "@/components/tablero";
import { btnGhost } from "@/components/ui";

// Módulos del panel: hoy solo Inicio; el resto se habilita a medida que se construye
const MODULOS: { nombre: string; activo: boolean; icono: ReactNode }[] = [
  { nombre: "Inicio", activo: true, icono: <IconoInicio /> },
  { nombre: "Clientes", activo: false, icono: <IconoClientes /> },
  { nombre: "Pedidos", activo: false, icono: <IconoPedidos /> },
  { nombre: "Ventas", activo: false, icono: <IconoVentas /> },
  { nombre: "Mi equipo", activo: false, icono: <IconoEquipo /> },
];

export default function PanelPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [datosAbierto, setDatosAbierto] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<{ usuario: UsuarioSesion }>("/auth/me")
      .then((data) => setUsuario(data.usuario))
      .catch(() => router.replace("/login"));
  }, [router]);

  // El dropdown del perfil sí se cierra al hacer clic afuera (es un menú, no un modal)
  useEffect(() => {
    if (!menuAbierto) {
      return;
    }
    function alClickearFuera(e: MouseEvent | TouchEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuAbierto(false);
      }
    }
    document.addEventListener("mousedown", alClickearFuera);
    document.addEventListener("touchstart", alClickearFuera);
    return () => {
      document.removeEventListener("mousedown", alClickearFuera);
      document.removeEventListener("touchstart", alClickearFuera);
    };
  }, [menuAbierto]);

  async function cerrarSesion() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
  }

  // Al elegir un módulo, el sidebar se oculta solo (cuando existan las páginas,
  // acá además se navegará a la ruta del módulo).
  function alElegirModulo() {
    setSidebarVisible(false);
  }

  if (!usuario) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-sm text-zinc-400">Cargando tu panel...</p>
      </main>
    );
  }

  const iniciales =
    `${usuario.nombre[0] ?? ""}${usuario.apellido[0] ?? ""}`.toUpperCase();

  const itemMenu =
    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm cursor-pointer transition hover:bg-zinc-100 focus-visible:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:bg-zinc-800";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Barra superior */}
      <header className="flex items-center justify-between gap-2 border-b border-zinc-200 bg-white px-3 py-3 sm:px-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          {/* Hamburguesa: mostrar/ocultar el menú lateral (escritorio) */}
          <button
            type="button"
            onClick={() => setSidebarVisible((v) => !v)}
            aria-label={sidebarVisible ? "Ocultar menú" : "Mostrar menú"}
            aria-expanded={sidebarVisible}
            className="hidden h-9 w-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-brand-600/40 md:grid dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path
                fillRule="evenodd"
                d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <BrandMark />
        </div>

        <div className="flex items-center gap-1.5">
          <BotonTema />

          {/* Botón de perfil con dropdown */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuAbierto((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuAbierto}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:hover:bg-zinc-800"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800 dark:bg-brand-900 dark:text-brand-100">
                {iniciales}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-semibold leading-tight">
                  {usuario.nombre} {usuario.apellido}
                </span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                  {usuario.rol?.descripcion ?? "Sin rol asignado"}
                </span>
              </span>
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-4 w-4 text-zinc-400 transition-transform ${menuAbierto ? "rotate-180" : ""}`}
              >
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            <AnimatePresence>
            {menuAbierto && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, y: -4 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                style={{ transformOrigin: "top right" }}
                role="menu"
                className="absolute right-0 z-40 mt-1.5 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuAbierto(false);
                    setDatosAbierto(true);
                  }}
                  className={itemMenu}
                >
                  <IconoPersona /> Mis Datos
                </button>
                <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={cerrarSesion}
                  className={`${itemMenu} text-red-600 dark:text-red-400`}
                >
                  <IconoSalir /> Cerrar sesión
                </button>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Menú lateral (escritorio; en mobile está el bottom navbar) */}
        <AnimatePresence initial={false}>
        {sidebarVisible && (
          <motion.aside
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="hidden w-52 shrink-0 border-r border-zinc-200 bg-white p-3 md:block dark:border-zinc-800 dark:bg-zinc-900"
          >
            <nav className="flex flex-col gap-1">
              {MODULOS.map((m) =>
                m.activo ? (
                  <button
                    key={m.nombre}
                    type="button"
                    onClick={alElegirModulo}
                    className="flex items-center gap-2.5 rounded-lg bg-brand-50 px-3 py-2 text-left text-sm font-semibold text-brand-800 transition hover:bg-brand-100 focus-visible:ring-2 focus-visible:ring-brand-600/40 dark:bg-brand-950 dark:text-brand-100 dark:hover:bg-brand-900"
                  >
                    {m.icono}
                    {m.nombre}
                  </button>
                ) : (
                  <span
                    key={m.nombre}
                    aria-disabled="true"
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-400 dark:text-zinc-600"
                  >
                    {m.icono}
                    <span className="flex-1">{m.nombre}</span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                      pronto
                    </span>
                  </span>
                ),
              )}
            </nav>
          </motion.aside>
        )}
        </AnimatePresence>

        {/* Contenido (con espacio abajo en mobile para el bottom navbar) */}
        <main className="flex-1 p-4 pb-24 sm:p-8 md:pb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Hola, {usuario.nombre} 👋
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {usuario.empresa.nombre}
          </p>

          {!usuario.rol && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              <span className="font-semibold">Tu cuenta está pendiente de rol.</span>{" "}
              Un superior debe asignarte un rol (vendedor, supervisor, jefe...)
              para habilitar los módulos de trabajo.
            </div>
          )}

          {/* Tablero: KPIs y gráficos (datos de ejemplo por ahora) */}
          <Tablero />
        </main>
      </div>

      {/* Bottom navbar (solo mobile) */}
      <nav
        aria-label="Módulos"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="grid grid-cols-5">
          {MODULOS.map((m) =>
            m.activo ? (
              <button
                key={m.nombre}
                type="button"
                className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 py-1.5 text-brand-700 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-950"
              >
                {m.icono}
                <span className="text-[10px] font-semibold leading-tight">
                  {m.nombre}
                </span>
              </button>
            ) : (
              <span
                key={m.nombre}
                aria-disabled="true"
                className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 py-1.5 text-zinc-300 dark:text-zinc-700"
              >
                {m.icono}
                <span className="text-[10px] leading-tight">{m.nombre}</span>
              </span>
            ),
          )}
        </div>
      </nav>

      {/* Modal Mis Datos: se cierra solo con X, Escape o el botón Cerrar */}
      <Modal
        titulo="Mis Datos"
        abierto={datosAbierto}
        onCerrar={() => setDatosAbierto(false)}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-base font-bold text-brand-800 dark:bg-brand-900 dark:text-brand-100">
            {iniciales}
          </span>
          <div>
            <p className="font-semibold">
              {usuario.nombre} {usuario.apellido}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {usuario.empresa.nombre}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-sm">
          <dt className="text-zinc-500 dark:text-zinc-400">Usuario</dt>
          <dd className="break-all">{usuario.nombreLogin}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Correo</dt>
          <dd className="break-all">{usuario.correo}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">RUC</dt>
          <dd>{usuario.ruc}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Celular</dt>
          <dd>{usuario.celular}</dd>
          <dt className="text-zinc-500 dark:text-zinc-400">Rol</dt>
          <dd>
            {usuario.rol?.descripcion ?? (
              <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                Pendiente de asignación
              </span>
            )}
          </dd>
        </dl>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setDatosAbierto(false)}
            className={btnGhost}
          >
            Cerrar
          </button>
        </div>
      </Modal>
    </div>
  );
}

function IconoInicio() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0" aria-hidden>
      <path
        fillRule="evenodd"
        d="M9.293 2.293a1 1 0 011.414 0l7 7A1 1 0 0117 11h-1v6a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3H9v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-6H3a1 1 0 01-.707-1.707l7-7z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconoClientes() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0" aria-hidden>
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
    </svg>
  );
}

function IconoPedidos() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0" aria-hidden>
      <path
        fillRule="evenodd"
        d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm1 8a.75.75 0 000 1.5h6a.75.75 0 000-1.5H7zm0 3a.75.75 0 000 1.5h6a.75.75 0 000-1.5H7z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconoVentas() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0" aria-hidden>
      <path d="M12 9a1 1 0 01-1-1V3c0-.552.45-1.007.997-.93a7.004 7.004 0 015.933 5.933c.078.547-.378.997-.93.997h-5z" />
      <path d="M8.003 4.07C8.55 3.994 9 4.449 9 5v5a1 1 0 001 1h5c.552 0 1.007.45.93.997A7.001 7.001 0 012 11a7.002 7.002 0 016.003-6.93z" />
    </svg>
  );
}

function IconoEquipo() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 shrink-0" aria-hidden>
      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
    </svg>
  );
}

function IconoPersona() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-zinc-400" aria-hidden>
      <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
    </svg>
  );
}

function IconoSalir() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path
        fillRule="evenodd"
        d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z"
        clipRule="evenodd"
      />
      <path
        fillRule="evenodd"
        d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z"
        clipRule="evenodd"
      />
    </svg>
  );
}
