"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { apiFetch } from "@/lib/api";
import type { UsuarioSesion } from "@/types/usuario";
import type { ModuloMenu } from "@/types/plataforma";
import { BrandMark } from "@/components/auth-shell";
import { BotonTema } from "@/components/boton-tema";
import { Modal } from "@/components/modal";
import { PantallaCarga } from "@/components/pantalla-carga";
import { PanelProvider } from "@/components/panel/contexto";
import { IconoModulo } from "@/components/panel/iconos";
import { btnGhost } from "@/components/ui";
import { EVENTO_PLATAFORMA_ACTUALIZADA } from "@/lib/eventos-plataforma";

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [modulos, setModulos] = useState<ModuloMenu[]>([]);
  const [puedeAdministrarUsuarios, setPuedeAdministrarUsuarios] =
    useState(false);
  const [cargando, setCargando] = useState(true);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [datosAbierto, setDatosAbierto] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<{ usuario: UsuarioSesion }>("/auth/me"),
      apiFetch<{ modulos: ModuloMenu[] }>("/mi-plataforma").catch(() => ({
        modulos: [],
      })),
      apiFetch("/usuarios/meta")
        .then(() => true)
        .catch(() => false),
    ])
      .then(([me, menu, administraUsuarios]) => {
        setUsuario(me.usuario);
        setModulos(menu.modulos);
        setPuedeAdministrarUsuarios(administraUsuarios);
      })
      .catch(() => router.replace("/login"))
      .finally(() => setCargando(false));
  }, [router]);

  useEffect(() => {
    let vigente = true;
    const actualizarMenu = () => {
      void apiFetch<{ modulos: ModuloMenu[] }>("/mi-plataforma")
        .then((menu) => {
          if (vigente) setModulos(menu.modulos);
        })
        .catch(() => undefined);
    };
    window.addEventListener(EVENTO_PLATAFORMA_ACTUALIZADA, actualizarMenu);
    return () => {
      vigente = false;
      window.removeEventListener(EVENTO_PLATAFORMA_ACTUALIZADA, actualizarMenu);
    };
  }, []);

  useEffect(() => {
    if (!menuAbierto) return;
    function fuera(e: MouseEvent | TouchEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuAbierto(false);
    }
    document.addEventListener("mousedown", fuera);
    document.addEventListener("touchstart", fuera);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("touchstart", fuera);
    };
  }, [menuAbierto]);

  async function cerrarSesion() {
    if (cerrandoSesion) return;
    setCerrandoSesion(true);
    try {
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => undefined);
      router.replace("/login");
    } finally {
      setCerrandoSesion(false);
    }
  }

  // Value estable del contexto: solo cambia cuando cambian usuario o módulos
  const valorPanel = useMemo(
    () => (usuario ? { usuario, modulos } : null),
    [usuario, modulos],
  );

  if (cargando || !usuario || !valorPanel) {
    return <PantallaCarga visible mensaje="Cargando tu panel" />;
  }

  const iniciales =
    `${usuario.nombre[0] ?? ""}${usuario.apellido[0] ?? ""}`.toUpperCase();
  const itemMenu =
    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm cursor-pointer transition hover:bg-zinc-100 focus-visible:bg-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:bg-zinc-800";

  const enlaces = [
    { href: "/panel", nombre: "Inicio", icono: "inicio" },
    ...modulos.flatMap((m) =>
      m.paginas.map((p) => ({
        href: `/panel/${m.ruta}/${p.ruta}`,
        nombre: p.nombre,
        icono: p.icono ?? m.icono,
      })),
    ),
  ];

  const activo = (href: string) =>
    href === "/panel" ? pathname === "/panel" : pathname === href;

  return (
    <PanelProvider value={valorPanel}>
      <div className="flex min-h-dvh w-full max-w-full flex-col overflow-x-clip">
        {/* Barra superior */}
        <header className="sticky top-0 z-40 flex w-full min-w-0 items-center justify-between gap-2 border-b border-zinc-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-xl sm:px-5 lg:px-6 dark:border-zinc-800 dark:bg-zinc-900/95">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarVisible((v) => !v)}
              aria-label={sidebarVisible ? "Ocultar menú" : "Mostrar menú"}
              aria-expanded={sidebarVisible}
              className="hidden h-9 w-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:ring-2 focus-visible:ring-brand-600/40 lg:grid dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <Link href="/panel" aria-label="Inicio" className="shrink-0">
              <BrandMark />
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <BotonTema />
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuAbierto((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menuAbierto}
                className="flex items-center gap-1 rounded-lg px-1 py-1 transition hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-brand-600/40 sm:gap-2.5 sm:px-2 sm:py-1.5 dark:hover:bg-zinc-800"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800 dark:bg-brand-900 dark:text-brand-100">
                  {iniciales}
                </span>
                <span className="hidden min-w-0 max-w-44 text-left sm:block">
                  <span className="block truncate text-sm font-semibold leading-tight">
                    {usuario.nombre} {usuario.apellido}
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {usuario.esSuperadmin
                      ? "Superadmin"
                      : (usuario.rol?.descripcion ?? "Sin rol asignado")}
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
                    {puedeAdministrarUsuarios && (
                      <Link
                        role="menuitem"
                        href="/panel/usuarios"
                        onClick={() => setMenuAbierto(false)}
                        className={itemMenu}
                      >
                        <IconoPersona /> Usuarios
                      </Link>
                    )}
                    {usuario.esSuperadmin && (
                      <Link
                        role="menuitem"
                        href="/panel/admin"
                        onClick={() => setMenuAbierto(false)}
                        className={itemMenu}
                      >
                        <IconoEngranaje /> Administración
                      </Link>
                    )}
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

        <div className="flex min-w-0 flex-1">
          {/* Menú lateral (escritorio) */}
          <AnimatePresence initial={false}>
            {sidebarVisible && (
              <motion.aside
                initial={{ x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="hidden w-56 shrink-0 border-r border-zinc-200 bg-white p-3 lg:block dark:border-zinc-800 dark:bg-zinc-900"
              >
                <nav className="flex flex-col gap-1">
                  {enlaces.map((e) => (
                    <Link
                      key={e.href}
                      href={e.href}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition focus-visible:ring-2 focus-visible:ring-brand-600/40 ${
                        activo(e.href)
                          ? "bg-brand-50 font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-100"
                          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <IconoModulo nombre={e.icono} />
                      {e.nombre}
                    </Link>
                  ))}
                </nav>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Contenido */}
          <main className="min-w-0 w-full flex-1 px-3 py-4 pb-24 sm:px-5 sm:py-6 lg:p-8 lg:pb-8">
            {children}
          </main>
        </div>

        {/* Bottom navbar (mobile) — máximo 5 accesos */}
        <nav
          aria-label="Módulos"
          className="fixed inset-x-0 bottom-0 z-40 w-full max-w-[100vw] border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] shadow-[0_-8px_30px_rgba(15,23,42,0.10)] backdrop-blur-xl lg:hidden dark:border-zinc-800 dark:bg-zinc-900/95 dark:shadow-[0_-8px_30px_rgba(0,0,0,0.35)]"
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${Math.min(enlaces.length, 5)}, minmax(0, 1fr))`,
            }}
          >
            {enlaces.slice(0, 5).map((e) => {
              const esActivo = activo(e.href);
              return (
                <Link
                  key={e.href}
                  href={e.href}
                  title={e.nombre}
                  aria-current={esActivo ? "page" : undefined}
                  className={`relative flex min-h-[60px] min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600/40 ${
                    esActivo
                      ? "text-brand-700 dark:text-brand-400"
                      : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {esActivo ? (
                    <span className="absolute inset-x-1/2 top-0 h-0.5 w-8 -translate-x-1/2 rounded-b-full bg-brand-600 dark:bg-brand-400" />
                  ) : null}
                  <span
                    className={`grid h-8 w-10 place-items-center rounded-xl transition ${
                      esActivo
                        ? "bg-brand-100 dark:bg-brand-950"
                        : "bg-transparent"
                    }`}
                  >
                    <IconoModulo nombre={e.icono} />
                  </span>
                  <span className="w-full truncate px-0.5 text-center text-[10px] font-semibold leading-tight">
                    {e.nombre}
                  </span>
                </Link>
              );
            })}
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
        <PantallaCarga
          visible={cerrandoSesion}
          mensaje="Cerrando sesión"
          detalle="Finalizamos tu sesión de forma segura."
        />
      </div>
    </PanelProvider>
  );
}

function IconoPersona() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 text-zinc-400"
      aria-hidden
    >
      <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
    </svg>
  );
}

function IconoEngranaje() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4 text-zinc-400"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconoSalir() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
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
