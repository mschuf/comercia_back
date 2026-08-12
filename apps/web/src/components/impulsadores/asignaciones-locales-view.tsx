"use client";

/* Hallmark · asignación compacta, sin mapas, centrada en persona y horario. */

import { useCallback, useEffect, useState } from "react";
import { EditorProgramacionVisita } from "@/components/impulsador/editor-programacion-visita";
import { Modal } from "@/components/modal";
import { Paginacion } from "@/components/paginacion";
import { SelectorUsuario } from "@/components/selector-usuario";
import { btnGhost, btnPrimary, errorBox, labelBase } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api";
import type { Local, UsuarioAsignable } from "@/types/local";
import type { RespuestaPaginada } from "@/types/paginacion";
import { resumenProgramacion } from "@/utils/programacion-visita";

export function AsignacionesLocalesView({
  permiteTransferencia,
  filtroInicial,
}: {
  permiteTransferencia: boolean;
  filtroInicial?: { id?: number; nombre: string };
}) {
  const [datos, setDatos] = useState<RespuestaPaginada<Local> | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(7);
  const [filtro] = useState(filtroInicial);
  const [editando, setEditando] = useState<Local | null>(null);
  const [programando, setProgramando] = useState<Local | null>(null);
  const [asignado, setAsignado] = useState<UsuarioAsignable | null>(null);
  const [transferencia, setTransferencia] = useState(false);
  const [anterior, setAnterior] = useState<UsuarioAsignable | null>(null);
  const [nuevo, setNuevo] = useState<UsuarioAsignable | null>(null);
  const [inactivar, setInactivar] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (filtro?.id) params.set("usuarioId", String(filtro.id));
    else if (filtro?.nombre) params.set("repositor", filtro.nombre);
    return apiFetch<RespuestaPaginada<Local>>(`/locales?${params.toString()}`)
      .then((respuesta) => {
        setDatos(respuesta);
        setError(null);
      })
      .catch((causa) =>
        setError(causa instanceof ApiError ? causa.message : "No se pudieron cargar los locales"),
      );
  }, [filtro, limit, page]);

  useEffect(() => void cargar(), [cargar]);

  async function guardarAsignacion() {
    if (!editando || !asignado) return;
    setGuardando(true);
    setError(null);
    try {
      await apiFetch(`/locales/${editando.id}`, {
        method: "PATCH",
        body: JSON.stringify({ usuarioId: asignado.id }),
      });
      setMensaje(`${editando.nombre} quedó asignado a ${asignado.nombre}.`);
      setEditando(null);
      await cargar();
    } catch (causa) {
      setError(causa instanceof ApiError ? causa.message : "No se pudo cambiar la asignación");
    } finally {
      setGuardando(false);
    }
  }

  async function transferir() {
    if (!anterior || !nuevo) return;
    setGuardando(true);
    setError(null);
    try {
      const resultado = await apiFetch<{
        localesTransferidos: number;
        subordinadosTransferidos: number;
        usuarioAnteriorInactivado: boolean;
      }>("/locales/transferir", {
        method: "POST",
        body: JSON.stringify({
          usuarioAnteriorId: anterior.id,
          usuarioNuevoId: nuevo.id,
          inactivarAnterior: inactivar,
        }),
      });
      setMensaje(
        `${resultado.localesTransferidos} local${resultado.localesTransferidos === 1 ? "" : "es"} transferido${resultado.localesTransferidos === 1 ? "" : "s"}.`,
      );
      setTransferencia(false);
      setAnterior(null);
      setNuevo(null);
      await cargar();
    } catch (causa) {
      setError(causa instanceof ApiError ? causa.message : "No se pudo completar la transferencia");
    } finally {
      setGuardando(false);
    }
  }

  const filas = datos?.items ?? [];
  return (
    <section className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Asignación de locales</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Definí quién marca en cada local y cuándo debe presentarse.
          </p>
        </div>
        {permiteTransferencia ? (
          <button type="button" className={`${btnGhost} whitespace-nowrap`} onClick={() => setTransferencia(true)}>
            Sustituir usuario
          </button>
        ) : null}
      </div>

      {mensaje ? <p className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">{mensaje}</p> : null}
      {error ? <p className={`${errorBox} mt-4`}>{error}</p> : null}

      <ul className="mt-5 space-y-3 md:hidden" aria-label="Locales asignados">
        {filas.map((local) => (
          <li key={local.id} className="rounded-xl border border-line bg-surface-raised p-4">
            <p className="font-semibold text-foreground">{local.nombre}</p>
            <p className="mt-0.5 text-sm text-muted">{local.cliente.nombre}</p>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">Asignado a</dt><dd className="text-right font-medium">{local.asignadoA?.nombre ?? "Sin asignar"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Agenda</dt><dd className="text-right font-medium">{resumenProgramacion(local.programacion)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Radio</dt><dd className="font-medium [font-variant-numeric:tabular-nums]">{local.radioMetros ?? 200}&nbsp;m</dd></div>
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className={`${btnGhost} whitespace-nowrap`} onClick={() => { setAsignado(local.asignadoA ? { ...local.asignadoA, rol: null } : null); setEditando(local); }}>Asignar</button>
              <button type="button" className={`${btnGhost} whitespace-nowrap`} onClick={() => setProgramando(local)}>Horario</button>
            </div>
          </li>
        ))}
      </ul>

      {filas.length > 0 ? (
        <div className="mt-5 hidden overflow-x-auto rounded-xl border border-line bg-surface-raised md:block">
          <table className="w-full min-w-[820px] text-left text-sm [font-variant-numeric:tabular-nums]">
            <thead className="bg-surface-soft text-xs uppercase tracking-wide"><tr><th className="px-4 py-3">Local</th><th className="px-4 py-3">Asignado a</th><th className="px-4 py-3">Agenda</th><th className="px-4 py-3">Radio</th><th className="px-4 py-3 text-right">Acciones</th></tr></thead>
            <tbody>{filas.map((local) => <tr key={local.id} className="border-t border-line"><td className="px-4 py-3"><p className="font-semibold">{local.nombre}</p><p className="text-xs text-muted">{local.cliente.nombre}</p></td><td className="px-4 py-3">{local.asignadoA?.nombre ?? "Sin asignar"}</td><td className="px-4 py-3 text-muted">{resumenProgramacion(local.programacion)}</td><td className="px-4 py-3">{local.radioMetros ?? 200}&nbsp;m</td><td className="px-4 py-3 text-right"><div className="flex justify-end gap-2"><button type="button" className={`${btnGhost} whitespace-nowrap`} onClick={() => { setAsignado(local.asignadoA ? { ...local.asignadoA, rol: null } : null); setEditando(local); }}>Asignar</button><button type="button" className={`${btnGhost} whitespace-nowrap`} onClick={() => setProgramando(local)}>Horario</button></div></td></tr>)}</tbody>
          </table>
        </div>
      ) : datos ? <p className="mt-5 rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">No hay locales dentro de este equipo.</p> : null}

      {datos && datos.total > 0 ? <Paginacion page={datos.page} totalPages={datos.totalPages} total={datos.total} limit={datos.limit} onPageChange={setPage} onLimitChange={(valor) => { setLimit(valor); setPage(1); }} /> : null}

      <Modal titulo={editando ? `Asignar ${editando.nombre}` : "Asignar local"} abierto={editando !== null} onCerrar={() => setEditando(null)}>
        <div className="flex flex-col gap-4"><label className={labelBase}>Impulsador o team leader<SelectorUsuario value={asignado?.id ?? ""} seleccionadoInicial={asignado} onChange={() => undefined} onSelect={setAsignado} /></label>{error ? <p className={errorBox}>{error}</p> : null}<div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setEditando(null)}>Cancelar</button><button type="button" className={btnPrimary} disabled={!asignado || guardando} onClick={() => void guardarAsignacion()}>{guardando ? "Guardando…" : "Guardar asignación"}</button></div></div>
      </Modal>

      <Modal titulo="Sustituir usuario" abierto={transferencia} onCerrar={() => setTransferencia(false)}>
        <div className="flex flex-col gap-4"><label className={labelBase}>Usuario que deja el puesto<SelectorUsuario value={anterior?.id ?? ""} seleccionadoInicial={anterior} onChange={() => undefined} onSelect={setAnterior} /></label><label className={labelBase}>Usuario reemplazante<SelectorUsuario value={nuevo?.id ?? ""} seleccionadoInicial={nuevo} onChange={() => undefined} onSelect={setNuevo} /></label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={inactivar} onChange={(evento) => setInactivar(evento.target.checked)} className="accent-brand-700" />Inactivar al usuario anterior al terminar</label>{error ? <p className={errorBox}>{error}</p> : null}<div className="flex justify-end gap-2"><button type="button" className={btnGhost} onClick={() => setTransferencia(false)}>Cancelar</button><button type="button" className={btnPrimary} disabled={!anterior || !nuevo || guardando} onClick={() => void transferir()}>{guardando ? "Transfiriendo…" : "Transferir cartera"}</button></div></div>
      </Modal>

      {programando ? <EditorProgramacionVisita local={{ localId: programando.id, localNombre: programando.nombre, programacion: programando.programacion }} onCerrar={() => setProgramando(null)} onGuardada={() => { setProgramando(null); void cargar(); }} /> : null}
    </section>
  );
}
