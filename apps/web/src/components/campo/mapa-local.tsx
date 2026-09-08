"use client";
import { Modal } from "@/components/modal";
import { btnGhost } from "@/components/ui";
import type { LocalCampo } from "@/types/campo";

export function MapaLocal({
  local,
  cerrar,
}: {
  local: LocalCampo;
  cerrar: () => void;
}) {
  const { latitud: lat, longitud: lng } = local;
  const bbox = [lng - 0.008, lat - 0.006, lng + 0.008, lat + 0.006].join(",");
  return (
    <Modal titulo={local.nombre} abierto onCerrar={cerrar} ancho="lg">
      <p className="mb-3 text-sm text-muted">
        {local.direccion} · {lat}, {lng}
      </p>
      <iframe
        title={`Ubicación de ${local.nombre}`}
        className="h-80 w-full rounded-xl border border-line"
        loading="lazy"
        referrerPolicy="no-referrer"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat},${lng}`}
      />
      <a
        className={`${btnGhost} mt-3 w-full`}
        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Abrir ubicación en Maps
      </a>
    </Modal>
  );
}
