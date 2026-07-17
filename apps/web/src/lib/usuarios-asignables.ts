import { apiFetch } from "@/lib/api";
import type { UsuarioAsignable } from "@/types/local";
import type { RespuestaPaginada } from "@/types/paginacion";

const PAGINA_INICIAL = 1;
const LIMITE_PREDETERMINADO = 15;
const LIMITE_MAXIMO_SELECTOR = 30;

// Cada interacción pide una sola página. El selector navega el resultado o
// refina la búsqueda sin descargar silenciosamente todo el equipo.
export function buscarUsuariosAsignables({
  buscar,
  page = PAGINA_INICIAL,
  limit = LIMITE_PREDETERMINADO,
  signal,
}: {
  buscar?: string;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
} = {}): Promise<RespuestaPaginada<UsuarioAsignable>> {
  const parametros = new URLSearchParams({
    page: String(Math.max(PAGINA_INICIAL, Math.trunc(page))),
    limit: String(
      Math.min(
        LIMITE_MAXIMO_SELECTOR,
        Math.max(1, Math.trunc(limit)),
      ),
    ),
  });
  const consulta = buscar?.trim();
  if (consulta) parametros.set("buscar", consulta);

  return apiFetch<RespuestaPaginada<UsuarioAsignable>>(
    `/locales/usuarios-asignables?${parametros.toString()}`,
    { signal },
  );
}
