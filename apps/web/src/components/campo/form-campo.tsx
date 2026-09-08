import type { ReactNode } from "react";
import { IconoMas } from "@/components/icono-mas";
import { btnGhost, btnPrimary, inputBase, labelBase } from "@/components/ui";

export function CampoTexto({
  titulo,
  value,
  onChange,
  type = "text",
  required = false,
  maxLength = 120,
  min,
  max,
  step,
}: {
  titulo: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  step?: string;
}) {
  return (
    <label className={labelBase}>
      {titulo}
      <input
        className={inputBase}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
      />
    </label>
  );
}
export function CabeceraCampo({
  titulo,
  detalle,
  crear,
}: {
  titulo: string;
  detalle: string;
  crear?: () => void;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold">{titulo}</h1>
        <p className="mt-1 text-sm text-muted">{detalle}</p>
      </div>
      {crear ? (
        <button
          type="button"
          className={`${btnPrimary} h-11 w-11 shrink-0 p-0`}
          aria-label={`Crear ${titulo.toLowerCase()}`}
          title={`Crear ${titulo.toLowerCase()}`}
          onClick={crear}
        >
          <IconoMas className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}
export function BotonesFormulario({
  cancelar,
  ocupado,
  children = "Guardar",
}: {
  cancelar: () => void;
  ocupado: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={cancelar}
        disabled={ocupado}
        className={btnGhost}
      >
        Cancelar
      </button>
      <button type="submit" disabled={ocupado} className={btnPrimary}>
        {children}
      </button>
    </div>
  );
}
export function CampoActivo({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
      />
      Activo
    </label>
  );
}
