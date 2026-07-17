"use client";

import { use, type ComponentType } from "react";
import { usePanel } from "@/components/panel/contexto";
import { ClientesLocalesView } from "@/components/clientes/clientes-locales-view";
import { EquipoView } from "@/components/equipo/equipo-view";
import { MapaView } from "@/components/impulsador/mapa-view";
import { TareasView } from "@/components/tareas/tareas-view";
import { RepositorClientesView } from "@/components/repositor/repositorio-clientes-view";
import { RepositorTareasView } from "@/components/repositor/repositorio-tareas-view";
import { RutaDiariaView } from "@/components/repositor/ruta-diaria-view";

// Registro de vistas con interfaz propia: "ruta-modulo/ruta-pagina" → componente.
// Las páginas que no estén acá muestran el placeholder de "configurada" (su
// ejecución de datos por ejecutables llega en la próxima etapa).
const VISTAS: Record<string, ComponentType> = {
  "supervisor/mapa": MapaView,
  "repositor/clientes": RepositorClientesView,
  "repositor/tareas": RepositorTareasView,
  "repositor/visitas": RutaDiariaView,
};

export default function PaginaModulo({
  params,
  searchParams,
}: {
  params: Promise<{ modulo: string; pagina: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { modulo, pagina } = use(params);
  const consulta = use(searchParams);
  const { modulos } = usePanel();

  const mod = modulos.find((m) => m.ruta === modulo);
  const pag = mod?.paginas.find((p) => p.ruta === pagina);

  if (!mod || !pag) {
    return (
      <div className="rounded-xl border border-line bg-surface-raised p-8 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Esta página no está disponible para tu empresa.
        </p>
      </div>
    );
  }

  const claveVista = `${modulo}/${pagina}`;
  const Vista = VISTAS[claveVista];
  const esOperacionCampo = modulo === "supervisor" || modulo === "repositor";
  const usaCabeceraPropia =
    (esOperacionCampo && pagina === "tareas") ||
    claveVista === "supervisor/equipo" ||
    modulo === "repositor";
  const ocultaNombreModulo = esOperacionCampo && pagina === "visitas";

  return (
    <div>
      {!usaCabeceraPropia && (
        <>
          {!ocultaNombreModulo && (
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700 dark:text-brand-400">
              {mod.nombre}
            </p>
          )}
          <h1 className="mt-1 text-xl font-bold tracking-tight">
            {pag.nombre}
          </h1>
        </>
      )}

      {claveVista === "supervisor/equipo" ? (
        <EquipoView />
      ) : claveVista === "supervisor/clientes" ? (
        <div className="mt-6">
          <ClientesLocalesView
            vistaInicial={
              valorConsulta(consulta.vista) === "locales"
                ? "locales"
                : "clientes"
            }
            repositorInicial={filtroRepositor(consulta)}
          />
        </div>
      ) : claveVista === "supervisor/tareas" ? (
        <TareasView filtrosIniciales={filtrosTareas(consulta)} />
      ) : Vista ? (
        <div className={usaCabeceraPropia ? undefined : "mt-6"}>
          <Vista />
        </div>
      ) : (
        <div className="mt-8 grid place-items-center rounded-xl border border-dashed border-line bg-surface-raised p-12 text-center">
          <div className="max-w-sm">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              <svg
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-6 w-6"
                aria-hidden
              >
                <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684z" />
              </svg>
            </div>
            <h2 className="mt-4 font-semibold">Página configurada ✓</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              La ejecución de sus datos (procedimientos, consultas y grillas) se
              habilita en la próxima etapa. La configuración del contenido ya la
              administra el superadmin desde el panel de Administración.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function valorConsulta(
  valor: string | string[] | undefined,
): string | undefined {
  return typeof valor === "string" ? valor : undefined;
}

function textoConsulta(
  valor: string | string[] | undefined,
  maximo: number,
): string | undefined {
  const texto = valorConsulta(valor)?.trim();
  if (
    !texto ||
    texto.length > maximo ||
    /[\u0000-\u001f\u007f]/.test(texto)
  ) {
    return undefined;
  }
  return texto;
}

function enteroPositivo(
  valor: string | string[] | undefined,
): number | undefined {
  const numero = Number(valorConsulta(valor));
  return Number.isInteger(numero) && numero > 0 && numero <= 2_147_483_647
    ? numero
    : undefined;
}

function filtroRepositor(
  consulta: Record<string, string | string[] | undefined>,
): { id?: number; nombre: string } | undefined {
  const id = enteroPositivo(consulta.usuarioId);
  const nombre = textoConsulta(consulta.repositor, 100) ?? "";
  return id || nombre ? { id, nombre } : undefined;
}

function filtrosTareas(
  consulta: Record<string, string | string[] | undefined>,
): {
  repositorId?: number;
  localId?: number;
  repositorNombre?: string;
  localNombre?: string;
} | undefined {
  const repositorId = enteroPositivo(consulta.repositorId);
  const localId = enteroPositivo(consulta.localId);
  if (!repositorId && !localId) return undefined;
  return {
    repositorId,
    localId,
    repositorNombre: textoConsulta(consulta.repositor, 100),
    localNombre: textoConsulta(consulta.local, 120),
  };
}
