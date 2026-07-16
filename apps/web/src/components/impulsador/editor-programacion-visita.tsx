"use client";

import { useMemo, useState } from "react";
import { IconoMas } from "@/components/icono-mas";
import { Modal } from "@/components/modal";
import {
  btnGhost,
  btnPrimary,
  errorBox,
  inputBase,
  labelBase,
} from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api";
import type { ProgramacionVisita, VisitaEquipoLocal } from "@/types/visita";
import {
  resumenProgramacion,
  zonaHorariaNavegador,
} from "@/utils/programacion-visita";

const DIAS = [
  [1, "Lun"],
  [2, "Mar"],
  [3, "Mié"],
  [4, "Jue"],
  [5, "Vie"],
  [6, "Sáb"],
  [7, "Dom"],
] as const;

function fechaHoy(): string {
  const hoy = new Date();
  const local = new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function programacionInicial(
  programacion: ProgramacionVisita | null,
): ProgramacionVisita {
  if (programacion) {
    return {
      ...programacion,
      diasSemana: [...programacion.diasSemana],
      diasMes: [...programacion.diasMes],
      horarios: [...programacion.horarios],
    };
  }

  const ahora = new Date();
  const diaSemana = ahora.getDay() === 0 ? 7 : ahora.getDay();
  return {
    frecuencia: "SEMANAL",
    fechaInicio: fechaHoy(),
    fechaFin: null,
    intervalo: 1,
    diasSemana: [diaSemana],
    diasMes: [ahora.getDate()],
    horarios: ["09:00"],
    zonaHoraria: zonaHorariaNavegador(),
    activo: true,
  };
}

function IconoEliminar() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M7 2a1 1 0 00-.9.55L5.38 4H3a1 1 0 000 2h1v10a2 2 0 002 2h8a2 2 0 002-2V6h1a1 1 0 100-2h-2.38l-.72-1.45A1 1 0 0011 2H7zm1 6a1 1 0 012 0v6a1 1 0 11-2 0V8zm4-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function EditorProgramacionVisita({
  local,
  onCerrar,
  onGuardada,
}: {
  local: VisitaEquipoLocal;
  onCerrar: () => void;
  onGuardada: () => void;
}) {
  const [form, setForm] = useState<ProgramacionVisita>(() =>
    programacionInicial(local.programacion),
  );
  const [guardando, setGuardando] = useState(false);
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resumen = useMemo(() => resumenProgramacion(form), [form]);

  function alternarDiaSemana(dia: number) {
    setForm((actual) => ({
      ...actual,
      diasSemana: actual.diasSemana.includes(dia)
        ? actual.diasSemana.filter((valor) => valor !== dia)
        : [...actual.diasSemana, dia].sort((a, b) => a - b),
    }));
  }

  function alternarDiaMes(dia: number) {
    setForm((actual) => ({
      ...actual,
      diasMes: actual.diasMes.includes(dia)
        ? actual.diasMes.filter((valor) => valor !== dia)
        : [...actual.diasMes, dia].sort((a, b) => a - b),
    }));
  }

  function agregarHorario() {
    setForm((actual) => {
      const candidatos = ["14:00", "18:00", "12:00", "08:00"];
      const nuevo =
        candidatos.find((hora) => !actual.horarios.includes(hora)) ?? "10:00";
      return { ...actual, horarios: [...actual.horarios, nuevo] };
    });
  }

  function validar(): string | null {
    if (!form.fechaInicio) return "Seleccioná la fecha inicial";
    if (form.fechaFin && form.fechaFin < form.fechaInicio) {
      return "La fecha final no puede ser anterior a la inicial";
    }
    if (form.frecuencia === "SEMANAL" && form.diasSemana.length === 0) {
      return "Seleccioná al menos un día de la semana";
    }
    if (form.frecuencia === "MENSUAL" && form.diasMes.length === 0) {
      return "Seleccioná al menos un día del mes";
    }
    if (form.horarios.length === 0 || form.horarios.some((hora) => !hora)) {
      return "Agregá al menos un horario válido";
    }
    if (new Set(form.horarios).size !== form.horarios.length) {
      return "No repitas el mismo horario";
    }
    return null;
  }

  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    if (guardando) return;
    const errorValidacion = validar();
    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    setGuardando(true);
    setError(null);
    try {
      await apiFetch<ProgramacionVisita>(
        `/visitas/equipo/${local.localId}/programacion`,
        {
          method: "PUT",
          body: JSON.stringify(form),
        },
      );
      onGuardada();
      onCerrar();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo guardar la programación",
      );
    } finally {
      setGuardando(false);
    }
  }

  async function quitar() {
    if (guardando) return;
    setGuardando(true);
    setError(null);
    try {
      await apiFetch(`/visitas/equipo/${local.localId}/programacion`, {
        method: "DELETE",
      });
      onGuardada();
      onCerrar();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo quitar la programación",
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal
      titulo={`Programar visitas · ${local.localNombre}`}
      abierto
      onCerrar={onCerrar}
      ancho="lg"
    >
      <form onSubmit={guardar} className="flex flex-col gap-5">
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-3 dark:border-brand-900 dark:bg-brand-950/50">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Resumen
          </p>
          <p className="mt-1 text-sm font-medium text-brand-950 dark:text-brand-100">
            {resumen}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelBase}>
            Frecuencia
            <select
              value={form.frecuencia}
              onChange={(event) =>
                setForm((actual) => ({
                  ...actual,
                  frecuencia: event.target
                    .value as ProgramacionVisita["frecuencia"],
                }))
              }
              className={inputBase}
            >
              <option value="UNICA">Una sola fecha</option>
              <option value="SEMANAL">Semanal</option>
              <option value="MENSUAL">Mensual</option>
            </select>
          </label>
          <label className={labelBase}>
            Fecha inicial
            <input
              type="date"
              value={form.fechaInicio}
              onChange={(event) =>
                setForm((actual) => ({
                  ...actual,
                  fechaInicio: event.target.value,
                }))
              }
              required
              className={inputBase}
            />
          </label>
          {form.frecuencia !== "UNICA" && (
            <>
              <label className={labelBase}>
                Repetir cada
                <span className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={form.intervalo}
                    onChange={(event) =>
                      setForm((actual) => ({
                        ...actual,
                        intervalo: Number(event.target.value),
                      }))
                    }
                    required
                    className={`${inputBase} min-w-0`}
                  />
                  <span className="shrink-0 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                    {form.frecuencia === "SEMANAL" ? "semana(s)" : "mes(es)"}
                  </span>
                </span>
              </label>
              <label className={labelBase}>
                Finaliza (opcional)
                <input
                  type="date"
                  min={form.fechaInicio}
                  value={form.fechaFin ?? ""}
                  onChange={(event) =>
                    setForm((actual) => ({
                      ...actual,
                      fechaFin: event.target.value || null,
                    }))
                  }
                  className={inputBase}
                />
              </label>
            </>
          )}
        </div>

        {form.frecuencia === "SEMANAL" && (
          <fieldset>
            <legend className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Días de visita
            </legend>
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-7">
              {DIAS.map(([dia, etiqueta]) => {
                const activo = form.diasSemana.includes(dia);
                return (
                  <button
                    key={dia}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => alternarDiaSemana(dia)}
                    className={`min-h-11 rounded-lg border text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-brand-600/40 ${
                      activo
                        ? "border-brand-600 bg-brand-700 text-white dark:border-brand-500 dark:bg-brand-600"
                        : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {etiqueta}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {form.frecuencia === "MENSUAL" && (
          <fieldset>
            <legend className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Días del mes
            </legend>
            <div className="mt-2 grid grid-cols-7 gap-1.5">
              {Array.from({ length: 31 }, (_, indice) => indice + 1).map(
                (dia) => {
                  const activo = form.diasMes.includes(dia);
                  return (
                    <button
                      key={dia}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => alternarDiaMes(dia)}
                      className={`min-h-11 rounded-lg border text-sm font-medium transition focus-visible:ring-2 focus-visible:ring-brand-600/40 ${
                        activo
                          ? "border-brand-600 bg-brand-700 text-white dark:border-brand-500 dark:bg-brand-600"
                          : "border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {dia}
                    </button>
                  );
                },
              )}
            </div>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Si el mes no tiene el día seleccionado, esa ocurrencia se omite.
            </p>
          </fieldset>
        )}

        <fieldset>
          <div className="flex items-center justify-between gap-3">
            <legend className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              Horarios del día
            </legend>
            <button
              type="button"
              onClick={agregarHorario}
              disabled={form.horarios.length >= 12}
              className={`${btnGhost} min-h-11 gap-2`}
            >
              <IconoMas className="h-4 w-4" /> Agregar horario
            </button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {form.horarios.map((horario, indice) => (
              <div key={indice} className="flex items-center gap-2">
                <input
                  type="time"
                  value={horario}
                  onChange={(event) =>
                    setForm((actual) => ({
                      ...actual,
                      horarios: actual.horarios.map((valor, posicion) =>
                        posicion === indice ? event.target.value : valor,
                      ),
                    }))
                  }
                  required
                  aria-label={`Horario ${indice + 1}`}
                  className={`${inputBase} min-w-0`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((actual) => ({
                      ...actual,
                      horarios: actual.horarios.filter(
                        (_, posicion) => posicion !== indice,
                      ),
                    }))
                  }
                  disabled={form.horarios.length === 1}
                  aria-label={`Quitar horario ${horario}`}
                  title="Quitar horario"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-600/40 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <IconoEliminar />
                </button>
              </div>
            ))}
          </div>
        </fieldset>

        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 px-3 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={(event) =>
              setForm((actual) => ({
                ...actual,
                activo: event.target.checked,
              }))
            }
            className="h-4 w-4 accent-brand-700"
          />
          Programación activa
        </label>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Cambiar la agenda no modifica las visitas realizadas, sus tareas ni
          sus posiciones GPS.
        </p>
        {error && <p className={errorBox}>{error}</p>}

        {confirmandoQuitar ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/50">
            <p className="text-sm text-red-700 dark:text-red-300">
              Se quitará solamente la agenda futura de este local. El historial
              se conserva.
            </p>
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmandoQuitar(false)}
                className={`${btnGhost} min-h-11`}
              >
                Volver
              </button>
              <button
                type="button"
                onClick={quitar}
                disabled={guardando}
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-red-700 px-4 text-sm font-medium text-white transition hover:bg-red-800 focus-visible:ring-2 focus-visible:ring-red-600/40 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-red-600 dark:hover:bg-red-500"
              >
                Quitar programación
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {local.programacion && (
              <button
                type="button"
                onClick={() => setConfirmandoQuitar(true)}
                disabled={guardando}
                className="mr-auto inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-600/40 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                Quitar programación
              </button>
            )}
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando}
              className={`${btnGhost} min-h-11`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className={`${btnPrimary} min-h-11`}
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
