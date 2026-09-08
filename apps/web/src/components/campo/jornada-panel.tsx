"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useListaCampo, useOperacionCampo } from "@/hooks/use-lista-campo";
import { fechaEnZonaIso, formatoFechaHora } from "@/utils/fechas";
import { Modal } from "@/components/modal";
import { PantallaCarga } from "@/components/pantalla-carga";
import { btnGhost, btnPrimary, errorBox } from "@/components/ui";
import { TablaCampo } from "./tabla-campo";
import { BotonesFormulario, CabeceraCampo, CampoTexto } from "./form-campo";
import { MapaLocal } from "./mapa-local";
import type {
  AgendaCampo,
  LocalCampo,
  MarcaCampo,
  TareaJornadaCampo,
  VisitaCampo,
} from "@/types/campo";

export function JornadaPanel({ tareas = false }: { tareas?: boolean }) {
  const [fecha, setFecha] = useState(fechaEnZonaIso(new Date()));
  return (
    <>
      <CabeceraCampo
        titulo={tareas ? "Mis tareas del día" : "Mis locales"}
        detalle="Tu agenda y reemplazos. Podés registrar presencia aunque el local no tenga tareas."
      />
      <div className="mb-4 max-w-xs">
        <CampoTexto
          titulo="Fecha"
          type="date"
          required
          value={fecha}
          onChange={setFecha}
        />
      </div>
      {fecha ? <AgendaDelDia key={fecha} fecha={fecha} /> : null}
    </>
  );
}
function AgendaDelDia({ fecha }: { fecha: string }) {
  const lista = useListaCampo<AgendaCampo>(`/campo/jornada?fecha=${fecha}`);
  const [abierta, setAbierta] = useState<VisitaCampo | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [mapa, setMapa] = useState<LocalCampo | null>(null);
  const [tareas, setTareas] = useState<AgendaCampo | null>(null);
  const [marca, setMarca] = useState<{
    asignacionId: number;
    horarioId?: number;
    visitaId?: number;
    nombre: string;
  } | null>(null);
  useEffect(() => {
    let vigente = true;
    apiFetch<VisitaCampo | null>("/campo/jornada/abierta")
      .then((v) => {
        if (vigente) setAbierta(v);
      })
      .catch((e: Error) => {
        if (vigente) setError(e.message);
      });
    return () => {
      vigente = false;
    };
  }, [revision]);
  function actualizar() {
    lista.refrescar();
    setRevision((n) => n + 1);
  }
  const hoy = fecha === fechaEnZonaIso(new Date());
  return (
    <>
      {error ? <p className={errorBox}>{error}</p> : null}
      {abierta ? (
        <div className="mb-4 flex flex-col gap-3 rounded-xl border border-brand-500 bg-surface-raised p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">
              Visita en curso · {abierta.local.nombre}
            </p>
            <p className="text-sm text-muted">
              Entrada: {formatoFechaHora(abierta.entrada)}
            </p>
          </div>
          <button
            className={btnPrimary}
            onClick={() =>
              setMarca({
                asignacionId: abierta.asignacionId,
                visitaId: abierta.id,
                nombre: abierta.local.nombre,
              })
            }
          >
            Marcar salida
          </button>
        </div>
      ) : null}
      <TablaCampo
        lista={lista}
        etiqueta="Agenda"
        columnas={[
          {
            titulo: "Local",
            valor: (a) => (
              <>
                <strong>{a.local.nombre}</strong>
                <p className="text-xs text-muted">{a.local.cliente.nombre}</p>
              </>
            ),
          },
          {
            titulo: "Asignación",
            valor: (a) => (a.esBackup ? `Backup de ${a.titular}` : "Titular"),
          },
          {
            titulo: "Atención",
            valor: (a) =>
              a.local.horarios.length
                ? a.local.horarios
                    .map((h) => `${h.entrada}–${h.salida}`)
                    .join(" · ")
                : "Sin restricción horaria",
          },
          {
            titulo: "Presencias",
            valor: (a) =>
              `${a.visitas.filter((v) => v.salida).length} cerradas`,
          },
        ]}
        acciones={(a) => (
          <>
            <button className={btnGhost} onClick={() => setMapa(a.local)}>
              Mapa
            </button>
            <button className={btnGhost} onClick={() => setTareas(a)}>
              Tareas
            </button>
            {hoy && !abierta
              ? (a.local.horarios.length ? a.local.horarios : [null]).map(
                  (h) => {
                    const realizada = a.visitas.some(
                      (v) => v.horarioId === (h?.id ?? null),
                    );
                    return (
                      <button
                        key={h?.id ?? 0}
                        className={btnPrimary}
                        disabled={realizada}
                        onClick={() =>
                          setMarca({
                            asignacionId: a.id,
                            horarioId: h?.id,
                            nombre: a.local.nombre,
                          })
                        }
                      >
                        {realizada
                          ? "Registrada"
                          : `Marcar entrada${h ? ` ${h.entrada}` : ""}`}
                      </button>
                    );
                  },
                )
              : null}
          </>
        )}
      />
      <div className="mt-7">
        <VisitasPanel key={`visitas-${revision}`} fechaInicial={fecha} propia />
      </div>
      {mapa ? <MapaLocal local={mapa} cerrar={() => setMapa(null)} /> : null}
      {tareas ? (
        <TareasDeLocal
          agenda={tareas}
          fecha={fecha}
          abierta={abierta}
          cerrar={() => setTareas(null)}
        />
      ) : null}
      {marca ? (
        <ModalMarca
          nombre={marca.nombre}
          salida={!!marca.visitaId}
          cerrar={() => setMarca(null)}
          guardar={async (datos) => {
            await apiFetch(
              marca.visitaId
                ? `/campo/jornada/visitas/${marca.visitaId}/salida`
                : "/campo/jornada/entrada",
              {
                method: "POST",
                body: JSON.stringify({
                  ...datos,
                  ...(!marca.visitaId
                    ? {
                        asignacionId: marca.asignacionId,
                        horarioId: marca.horarioId,
                      }
                    : {}),
                }),
              },
            );
            actualizar();
            setMarca(null);
          }}
        />
      ) : null}
    </>
  );
}
function ModalMarca({
  nombre,
  salida,
  cerrar,
  guardar,
}: {
  nombre: string;
  salida: boolean;
  cerrar: () => void;
  guardar: (datos: MarcaCampo) => Promise<void>;
}) {
  const op = useOperacionCampo();
  const [coords, setCoords] = useState<{
    latitud: number;
    longitud: number;
  } | null>(null);
  const [nota, setNota] = useState("");
  async function ubicar() {
    await op.ejecutar(
      "Obteniendo ubicación",
      () =>
        new Promise<void>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(
              new Error("GPS no disponible. Indicá un motivo para continuar."),
            );
            return;
          }
          navigator.geolocation.getCurrentPosition(
            (p) => {
              setCoords({
                latitud: p.coords.latitude,
                longitud: p.coords.longitude,
              });
              resolve();
            },
            () =>
              reject(
                new Error(
                  "No se pudo obtener GPS. Reintentá o indicá el motivo para continuar.",
                ),
              ),
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
          );
        }),
    );
  }
  return (
    <Modal
      titulo={`${salida ? "Salida" : "Entrada"} · ${nombre}`}
      abierto
      onCerrar={() => {
        if (!op.mensaje) cerrar();
      }}
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await op.ejecutar("Registrando presencia", () =>
            guardar({ ...coords, nota }),
          );
        }}
      >
        <button
          type="button"
          className={`${btnGhost} w-full`}
          onClick={() => void ubicar()}
        >
          Obtener mi ubicación
        </button>
        <p className="text-sm text-muted">
          {coords
            ? `Ubicación obtenida: ${coords.latitud.toFixed(5)}, ${coords.longitud.toFixed(5)}`
            : "Sin ubicación. Es obligatorio indicar un motivo si no podés usar GPS."}
        </p>
        <CampoTexto
          titulo={
            coords ? "Observación (opcional)" : "Motivo de marcar sin GPS"
          }
          maxLength={250}
          value={nota}
          onChange={setNota}
          required={!coords}
        />
        {op.error ? <p className={errorBox}>{op.error}</p> : null}
        <BotonesFormulario ocupado={!!op.mensaje} cancelar={cerrar}>
          Confirmar {salida ? "salida" : "entrada"}
        </BotonesFormulario>
      </form>
      <PantallaCarga visible={!!op.mensaje} mensaje={op.mensaje} />
    </Modal>
  );
}
function TareasDeLocal({
  agenda,
  fecha,
  abierta,
  cerrar,
}: {
  agenda: AgendaCampo;
  fecha: string;
  abierta: VisitaCampo | null;
  cerrar: () => void;
}) {
  const lista = useListaCampo<TareaJornadaCampo>(
    `/campo/jornada/asignaciones/${agenda.id}/tareas?fecha=${fecha}`,
  );
  const op = useOperacionCampo();
  const visita =
    abierta?.asignacionId === agenda.id && abierta.fecha.slice(0, 10) === fecha
      ? abierta
      : null;
  return (
    <Modal
      titulo={`Tareas · ${agenda.local.nombre}`}
      abierto
      onCerrar={cerrar}
      ancho="lg"
    >
      <p className="mb-4 text-sm text-muted">
        {visita
          ? "Marcá las tareas realizadas en esta visita."
          : "Registrá entrada para completar tareas. Las tareas no impiden registrar salida."}
      </p>
      <TablaCampo
        lista={lista}
        etiqueta="Tareas del local"
        columnas={[
          { titulo: "Tarea", valor: (t) => t.nombre },
          { titulo: "Descripción", valor: (t) => t.descripcion },
          {
            titulo: "Estado",
            valor: (t) =>
              visita
                ? t.visitasCompletadas.includes(visita.id)
                  ? "Completada"
                  : "Pendiente"
                : `${t.visitasCompletadas.length} realizadas hoy`,
          },
        ]}
        acciones={(t) =>
          visita ? (
            <button
              className={btnPrimary}
              disabled={
                t.visitasCompletadas.includes(visita.id) || !!op.mensaje
              }
              onClick={() =>
                void op.ejecutar("Completando tarea", async () => {
                  await apiFetch(
                    `/campo/jornada/visitas/${visita.id}/tareas/${t.id}`,
                    { method: "POST" },
                  );
                  lista.refrescar();
                })
              }
            >
              Completar
            </button>
          ) : null
        }
      />
      {op.error ? <p className={errorBox}>{op.error}</p> : null}
      <PantallaCarga visible={!!op.mensaje} mensaje={op.mensaje} />
    </Modal>
  );
}
export function VisitasPanel({
  propia = false,
  fechaInicial,
}: {
  propia?: boolean;
  fechaInicial?: string;
}) {
  const [fecha, setFecha] = useState(
    fechaInicial ?? fechaEnZonaIso(new Date()),
  );
  return (
    <>
      <h2 className="mb-3 text-lg font-semibold">
        {propia ? "Mis presencias" : "Presencias del equipo"}
      </h2>
      {!propia ? (
        <div className="mb-4 max-w-xs">
          <CampoTexto
            titulo="Fecha"
            type="date"
            value={fecha}
            onChange={setFecha}
            required
          />
        </div>
      ) : null}
      {fecha ? (
        <ListadoVisitas key={fecha} fecha={fecha} propia={propia} />
      ) : null}
    </>
  );
}
function ListadoVisitas({ fecha, propia }: { fecha: string; propia: boolean }) {
  const lista = useListaCampo<VisitaCampo>(
    `/campo/${propia ? "jornada/visitas" : "visitas"}?fecha=${fecha}`,
  );
  return (
    <TablaCampo
      lista={lista}
      etiqueta="Presencias"
      columnas={[
        { titulo: "Local", valor: (v) => v.local.nombre },
        {
          titulo: "Asistió",
          valor: (v) =>
            `${v.usuario.nombre} ${v.usuario.apellido}${v.esBackup ? ` (backup de ${v.asignacion.usuario.nombre})` : ""}`,
        },
        {
          titulo: "Entrada / salida",
          valor: (v) =>
            `${formatoFechaHora(v.entrada)} / ${v.salida ? formatoFechaHora(v.salida) : "En curso"}`,
        },
        { titulo: "Tareas", valor: (v) => v._count.cumplimientos },
        {
          titulo: "Observaciones",
          valor: (v) => `${v.notaEntrada} ${v.notaSalida}`,
        },
      ]}
    />
  );
}
