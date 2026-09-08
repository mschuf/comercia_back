"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useListaCampo, useOperacionCampo } from "@/hooks/use-lista-campo";
import { fechaEnZonaIso } from "@/utils/fechas";
import { Modal } from "@/components/modal";
import { PantallaCarga } from "@/components/pantalla-carga";
import { SelectorPaginado } from "@/components/selector-paginado";
import { btnGhost, errorBox, inputBase, labelBase } from "@/components/ui";
import { TablaCampo } from "./tabla-campo";
import { BotonesFormulario, CabeceraCampo, CampoTexto } from "./form-campo";
import type {
  AsignacionCampo,
  BackupCampo,
  FormHorarioCampo,
  HorarioCampo,
  LocalCampo,
} from "@/types/campo";

export function PlanLocal({
  local,
  cerrar,
}: {
  local: LocalCampo;
  cerrar: () => void;
}) {
  const [vista, setVista] = useState("horarios");
  return (
    <Modal
      titulo={`Planificación · ${local.nombre}`}
      abierto
      onCerrar={cerrar}
      ancho="xl"
    >
      <div className="mb-4 flex gap-2">
        <button
          className={btnGhost}
          aria-pressed={vista === "horarios"}
          onClick={() => setVista("horarios")}
        >
          Horarios
        </button>
        <button
          className={btnGhost}
          aria-pressed={vista === "equipo"}
          onClick={() => setVista("equipo")}
        >
          Equipo y backups
        </button>
      </div>
      {vista === "horarios" ? (
        <HorariosLocal localId={local.id} />
      ) : (
        <AsignacionesLocal localId={local.id} />
      )}
    </Modal>
  );
}
function HorariosLocal({ localId }: { localId: number }) {
  const lista = useListaCampo<HorarioCampo>(
    `/campo/locales/${localId}/horarios`,
  );
  const op = useOperacionCampo();
  const [form, setForm] = useState<FormHorarioCampo | null>(null);
  const [id, setId] = useState(0);
  function abrir(h?: HorarioCampo) {
    setId(h?.id ?? 0);
    setForm({
      frecuencia: h?.frecuencia ?? "SEMANAL",
      intervalo: h?.intervalo ?? 1,
      diasSemana: h?.diasSemana ?? [1, 2, 3, 4, 5],
      diasMes: h?.diasMes ?? [1],
      fechaDesde: h?.fechaDesde.slice(0, 10) ?? fechaEnZonaIso(new Date()),
      fechaHasta: h?.fechaHasta?.slice(0, 10) ?? "",
      entrada: h?.entrada ?? "08:00",
      salida: h?.salida ?? "17:00",
    });
  }
  return (
    <>
      <CabeceraCampo
        titulo="Horarios"
        detalle="Cada franja representa una visita. Agregá varias para asistir más de una vez por día. Sin horarios, se permite una visita diaria."
        crear={() => abrir()}
      />
      <TablaCampo
        lista={lista}
        etiqueta="Horarios"
        columnas={[
          { titulo: "Atención", valor: (h) => `${h.entrada}–${h.salida}` },
          {
            titulo: "Repetición",
            valor: (h) => `${h.frecuencia} · cada ${h.intervalo}`,
          },
          {
            titulo: "Días",
            valor: (h) =>
              h.frecuencia === "MENSUAL"
                ? h.diasMes.join(", ")
                : h.diasSemana
                    .map(
                      (d) =>
                        ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][
                          d - 1
                        ],
                    )
                    .join(", "),
          },
          {
            titulo: "Vigencia",
            valor: (h) =>
              `${h.fechaDesde.slice(0, 10)} / ${h.fechaHasta?.slice(0, 10) ?? "Sin fin"}`,
          },
        ]}
        acciones={(h) => (
          <>
            <button className={btnGhost} onClick={() => abrir(h)}>
              Editar
            </button>
            <button
              className={btnGhost}
              onClick={() =>
                void op.ejecutar("Quitando horario", async () => {
                  await apiFetch(`/campo/locales/${localId}/horarios/${h.id}`, {
                    method: "DELETE",
                  });
                  lista.refrescar();
                })
              }
            >
              Quitar
            </button>
          </>
        )}
      />
      {form ? (
        <form
          className="mt-5 space-y-3 rounded-xl border border-line p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await op.ejecutar("Guardando horario", () =>
                apiFetch(
                  `/campo/locales/${localId}/horarios${id ? `/${id}` : ""}`,
                  {
                    method: id ? "PUT" : "POST",
                    body: JSON.stringify({
                      ...form,
                      fechaHasta: form.fechaHasta || null,
                    }),
                  },
                ),
              )
            ) {
              setForm(null);
              lista.refrescar();
            }
          }}
        >
          <h3 className="font-semibold">
            {id ? "Editar franja" : "Nueva franja"}
          </h3>
          <label className={labelBase}>
            Frecuencia
            <select
              className={inputBase}
              value={form.frecuencia}
              onChange={(e) =>
                setForm({
                  ...form,
                  frecuencia: e.target.value as FormHorarioCampo["frecuencia"],
                })
              }
            >
              <option value="DIARIA">Diaria</option>
              <option value="SEMANAL">Semanal</option>
              <option value="MENSUAL">Mensual</option>
            </select>
          </label>
          <CampoTexto
            titulo="Repetir cada (días / semanas / meses)"
            type="number"
            min={1}
            max={52}
            value={form.intervalo}
            onChange={(v) => setForm({ ...form, intervalo: Number(v) })}
            required
          />
          {form.frecuencia !== "DIARIA" ? (
            <fieldset>
              <legend className="mb-2 text-sm">
                {form.frecuencia === "SEMANAL"
                  ? "Días de semana"
                  : "Días del mes (los inexistentes se omiten)"}
              </legend>
              <div className="flex flex-wrap gap-2">
                {Array.from(
                  { length: form.frecuencia === "SEMANAL" ? 7 : 31 },
                  (_, n) => n + 1,
                ).map((dia) => {
                  const campo =
                    form.frecuencia === "SEMANAL" ? "diasSemana" : "diasMes";
                  return (
                    <label
                      key={dia}
                      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-2"
                    >
                      <input
                        type="checkbox"
                        checked={form[campo].includes(dia)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            [campo]: e.target.checked
                              ? [...form[campo], dia]
                              : form[campo].filter((x) => x !== dia),
                          })
                        }
                      />
                      {campo === "diasSemana"
                        ? ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][
                            dia - 1
                          ]
                        : dia}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoTexto
              titulo="Entrada desde"
              type="time"
              required
              value={form.entrada}
              onChange={(entrada) => setForm({ ...form, entrada })}
            />
            <CampoTexto
              titulo="Atención hasta"
              type="time"
              required
              value={form.salida}
              onChange={(salida) => setForm({ ...form, salida })}
            />
            <CampoTexto
              titulo="Desde"
              type="date"
              required
              value={form.fechaDesde}
              onChange={(fechaDesde) => setForm({ ...form, fechaDesde })}
            />
            <CampoTexto
              titulo="Hasta (opcional)"
              type="date"
              value={form.fechaHasta}
              onChange={(fechaHasta) => setForm({ ...form, fechaHasta })}
            />
          </div>
          <BotonesFormulario
            ocupado={!!op.mensaje}
            cancelar={() => setForm(null)}
          />
        </form>
      ) : null}
      {op.error ? <p className={`${errorBox} mt-3`}>{op.error}</p> : null}
      <PantallaCarga visible={!!op.mensaje} mensaje={op.mensaje} />
    </>
  );
}
function AsignacionesLocal({ localId }: { localId: number }) {
  const lista = useListaCampo<AsignacionCampo>(
    `/campo/locales/${localId}/asignaciones`,
  );
  const op = useOperacionCampo();
  const [crear, setCrear] = useState(false);
  const [usuarioId, setUsuarioId] = useState<number | "">("");
  const [desde, setDesde] = useState(fechaEnZonaIso(new Date()));
  const [hasta, setHasta] = useState("");
  const [backup, setBackup] = useState<AsignacionCampo | null>(null);
  return (
    <>
      <CabeceraCampo
        titulo="Asignaciones"
        detalle="Solo aparecen tus subordinados. Deben tener acceso al módulo Mi jornada."
        crear={() => {
          setCrear(true);
          setUsuarioId("");
        }}
      />
      <TablaCampo
        lista={lista}
        etiqueta="Asignaciones"
        columnas={[
          {
            titulo: "Titular",
            valor: (a) => `${a.usuario.nombre} ${a.usuario.apellido}`,
          },
          { titulo: "Desde", valor: (a) => a.fechaDesde.slice(0, 10) },
          {
            titulo: "Hasta",
            valor: (a) => a.fechaHasta?.slice(0, 10) ?? "Sin fin",
          },
        ]}
        acciones={(a) => (
          <>
            <button className={btnGhost} onClick={() => setBackup(a)}>
              Backups
            </button>
            <button
              className={btnGhost}
              onClick={() =>
                void op.ejecutar("Quitando asignación", async () => {
                  await apiFetch(`/campo/asignaciones/${a.id}`, {
                    method: "DELETE",
                  });
                  lista.refrescar();
                })
              }
            >
              Quitar
            </button>
          </>
        )}
      />
      {crear ? (
        <form
          className="mt-4 space-y-3 rounded-xl border border-line p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await op.ejecutar("Asignando local", () =>
                apiFetch(`/campo/locales/${localId}/asignaciones`, {
                  method: "POST",
                  body: JSON.stringify({
                    usuarioId,
                    fechaDesde: desde,
                    fechaHasta: hasta || null,
                  }),
                }),
              )
            ) {
              setCrear(false);
              lista.refrescar();
            }
          }}
        >
          <SelectorPaginado
            url="/campo/equipo"
            etiqueta="Subordinado"
            value={usuarioId}
            required
            onChange={setUsuarioId}
          />
          <CampoTexto
            titulo="Desde"
            type="date"
            value={desde}
            required
            onChange={setDesde}
          />
          <CampoTexto
            titulo="Hasta (opcional)"
            type="date"
            value={hasta}
            onChange={setHasta}
          />
          <BotonesFormulario
            ocupado={!!op.mensaje}
            cancelar={() => setCrear(false)}
          />
        </form>
      ) : null}
      {backup ? (
        <BackupsAsignacion asignacion={backup} cerrar={() => setBackup(null)} />
      ) : null}
      {op.error ? <p className={`${errorBox} mt-3`}>{op.error}</p> : null}
      <PantallaCarga visible={!!op.mensaje} mensaje={op.mensaje} />
    </>
  );
}
function BackupsAsignacion({
  asignacion,
  cerrar,
}: {
  asignacion: AsignacionCampo;
  cerrar: () => void;
}) {
  const lista = useListaCampo<BackupCampo>(
    `/campo/asignaciones/${asignacion.id}/backups`,
  );
  const op = useOperacionCampo();
  const [usuarioId, setUsuarioId] = useState<number | "">("");
  const [desde, setDesde] = useState(fechaEnZonaIso(new Date()));
  const [hasta, setHasta] = useState(fechaEnZonaIso(new Date()));
  const [motivo, setMotivo] = useState("");
  return (
    <section className="mt-5 space-y-3 rounded-xl border border-line p-4">
      <div className="flex justify-between gap-2">
        <h3 className="font-semibold">
          Backups de {asignacion.usuario.nombre}
        </h3>
        <button className={btnGhost} onClick={cerrar}>
          Cerrar backups
        </button>
      </div>
      <TablaCampo
        lista={lista}
        etiqueta="Backups"
        columnas={[
          {
            titulo: "Reemplazo",
            valor: (b) => `${b.usuario.nombre} ${b.usuario.apellido}`,
          },
          {
            titulo: "Fechas",
            valor: (b) =>
              `${b.fechaDesde.slice(0, 10)} / ${b.fechaHasta.slice(0, 10)}`,
          },
          { titulo: "Motivo", valor: (b) => b.motivo },
        ]}
        acciones={(b) => (
          <button
            className={btnGhost}
            onClick={() =>
              void op.ejecutar("Quitando backup", async () => {
                await apiFetch(
                  `/campo/asignaciones/${asignacion.id}/backups/${b.id}`,
                  { method: "DELETE" },
                );
                lista.refrescar();
              })
            }
          >
            Quitar
          </button>
        )}
      />
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await op.ejecutar("Guardando backup", () =>
              apiFetch(`/campo/asignaciones/${asignacion.id}/backups`, {
                method: "POST",
                body: JSON.stringify({
                  usuarioId,
                  fechaDesde: desde,
                  fechaHasta: hasta,
                  motivo,
                }),
              }),
            )
          ) {
            lista.refrescar();
            setUsuarioId("");
            setMotivo("");
          }
        }}
      >
        <SelectorPaginado
          url="/campo/equipo"
          etiqueta="Reemplazo"
          value={usuarioId}
          required
          excluirId={asignacion.usuarioId}
          onChange={setUsuarioId}
        />
        <CampoTexto
          titulo="Desde"
          type="date"
          required
          value={desde}
          onChange={setDesde}
        />
        <CampoTexto
          titulo="Hasta"
          type="date"
          required
          value={hasta}
          onChange={setHasta}
        />
        <CampoTexto
          titulo="Motivo"
          value={motivo}
          required
          maxLength={250}
          onChange={setMotivo}
        />
        <BotonesFormulario ocupado={!!op.mensaje} cancelar={cerrar}>
          Agregar backup
        </BotonesFormulario>
      </form>
      {op.error ? <p className={errorBox}>{op.error}</p> : null}
      <PantallaCarga visible={!!op.mensaje} mensaje={op.mensaje} />
    </section>
  );
}
